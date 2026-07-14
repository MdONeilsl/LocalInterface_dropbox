import { DEFAULT_CONFIG } from './constants.js';
import { NetworkError, ApiError, ConfigurationError } from './errors.js';
import { sleep } from './utils.js';

export class AbortableHttpClient {
    #defaultTimeout;

    constructor(timeoutMs = DEFAULT_CONFIG.requestTimeoutMs) {
        this.#defaultTimeout = timeoutMs;
    }

    async get(url, options = {}) {
        return this.#request('GET', url, null, options);
    }

    async post(url, body, options = {}) {
        return this.#request('POST', url, body, options);
    }

    async #request(method, url, body = null, options = {}) {
        const controller = new AbortController();
        const timeout = options.timeout ?? this.#defaultTimeout;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                method,
                headers: options.headers || {},
                body: body !== null ? JSON.stringify(body) : undefined,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new NetworkError(`Request timed out after ${timeout} ms`);
            }
            throw new NetworkError(error.message);
        }
    }
}

export class RetryPolicy {
    constructor({ retries = 3, delayMs = 1000 } = {}) {
        this.retries = retries;
        this.delayMs = delayMs;
    }

    async execute(operation) {
        let lastError = null;
        for (let attempt = 1; attempt <= this.retries; attempt++) {
            try {
                return await operation(attempt);
            } catch (error) {
                lastError = error;
                // break without sleeping if this was the last possible attempt
                if (attempt + 1 > this.retries) break;
                await sleep(this.delayMs * attempt);
            }
        }
        throw lastError;
    }
}

export class LLMClient {
    #http;
    #baseUrl;
    #apiKey;

    constructor({ baseUrl, apiKey = '' }) {
        this.#http = new AbortableHttpClient();
        this.#baseUrl = this.#normalizeBaseUrl(baseUrl);
        this.#apiKey = apiKey;
    }

    updateConfiguration({ baseUrl, apiKey }) {
        this.#baseUrl = this.#normalizeBaseUrl(baseUrl);
        this.#apiKey = apiKey || '';
    }

    async fetchModels() {
        const response = await this.#http.get(`${this.#baseUrl}/models`, {
            headers: this.#buildHeaders()
        });
        if (!response.ok) {
            throw new ApiError(`Model request failed`, response.status);
        }
        const data = await response.json();
        if (!data || !Array.isArray(data.data)) {
            throw new ApiError('Invalid model payload');
        }
        return data.data.map(model => model.id).filter(Boolean).sort();
    }

    async createChatCompletion({ model, messages, temperature, max_tokens }) {
        const response = await this.#http.post(
            `${this.#baseUrl}/chat/completions`,
            { model, messages, temperature, max_tokens, stream: false },
            { headers: this.#buildHeaders() }
        );
        if (!response.ok) {
            const text = await response.text();
            throw new ApiError(text || `HTTP ${response.status}`, response.status);
        }
        const payload = await response.json();
        const content = payload?.choices?.[0]?.message?.content;
        if (typeof content !== 'string') {
            throw new ApiError('Malformed completion response');
        }
        return content.trim();
    }

    #buildHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.#apiKey) {
            headers.Authorization = `Bearer ${this.#apiKey}`;
        }
        return headers;
    }

    #normalizeBaseUrl(url) {
        if (typeof url !== 'string' || !url.trim()) {
            throw new ConfigurationError('Base URL required');
        }
        return url.trim().replace(/\/$/, '');
    }
}

export class ModelService {
    constructor(client) {
        this.client = client;
        this.cache = [];
        this.lastFetch = 0;
    }

    async fetchModels(force = false) {
        const now = Date.now();
        const cacheAge = now - this.lastFetch;
        if (!force && this.cache.length && cacheAge < 30000) {
            return [...this.cache];
        }
        const models = await this.client.fetchModels();
        this.cache = models;
        this.lastFetch = now;
        return [...models];
    }
}