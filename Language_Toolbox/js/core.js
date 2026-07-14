import { APP_VERSION, STORAGE_KEYS, OUTPUT_STATES, TOOL_IDS } from './constants.js';

export class EventBus {
    #listeners = new Map();

    on(eventName, callback) {
        if (!this.#listeners.has(eventName)) {
            this.#listeners.set(eventName, new Set());
        }
        this.#listeners.get(eventName).add(callback);
        return () => this.off(eventName, callback);
    }

    off(eventName, callback) {
        const listeners = this.#listeners.get(eventName);
        if (!listeners) return;
        listeners.delete(callback);
        if (listeners.size === 0) this.#listeners.delete(eventName);
    }

    emit(eventName, payload = null) {
        const listeners = this.#listeners.get(eventName);
        if (!listeners) return;
        for (const listener of listeners) {
            try {
                listener(payload);
            } catch (error) {
                console.error(`[EventBus] Listener failed for ${eventName}`, error);
            }
        }
    }

    clear() {
        this.#listeners.clear();
    }
}

export class StorageService {
    static load(key, fallback = null) {
        try {
            const value = localStorage.getItem(key);
            return value === null ? fallback : JSON.parse(value);
        } catch {
            return fallback;
        }
    }

    static save(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
        } catch { }
    }
}

export class AppStore {
    #state;
    #bus;

    constructor(eventBus) {
        this.#bus = eventBus;
        this.#state = {
            version: APP_VERSION,
            activeTool: StorageService.load(STORAGE_KEYS.ACTIVE_TAB, TOOL_IDS.RP),
            models: [],
            selectedModel: StorageService.load(STORAGE_KEYS.LAST_MODEL, ''),
            outputState: OUTPUT_STATES.IDLE,
            outputText: '',
            feedbackText: 'Ready.',
            connected: false,
            lastRequest: null
        };
    }

    getState() {
        return structuredClone(this.#state);
    }

    patch(updates) {
        this.#state = { ...this.#state, ...updates };
        this.#bus.emit('store:changed', this.getState());
    }

    setActiveTool(toolId) {
        this.patch({ activeTool: toolId });
        StorageService.save(STORAGE_KEYS.ACTIVE_TAB, toolId);
    }

    setSelectedModel(model) {
        this.patch({ selectedModel: model });
        StorageService.save(STORAGE_KEYS.LAST_MODEL, model);
    }
}