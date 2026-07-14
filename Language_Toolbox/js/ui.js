import { OUTPUT_STATES, TOOL_IDS, STORAGE_KEYS } from './constants.js';
import { StorageService } from './core.js';
import { Validator } from './validators.js';
import { ValidationError } from './errors.js';

export class DOMCache {
    constructor() {
        this.baseUrl = document.getElementById('baseUrl');
        this.apiKey = document.getElementById('apiKey');
        this.modelSelect = document.getElementById('modelSelect');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.outputText = document.getElementById('outputText');
        this.feedbackContent = document.getElementById('feedbackContent');
        this.generateBtn = document.getElementById('generateBtn');
        this.resendBtn = document.getElementById('resendBtn');
        this.resendOutputBtn = document.getElementById('resendOutputBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.testConnBtn = document.getElementById('testConnBtn');
        this.tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
        this.panels = {
            rp: document.getElementById('tool-rp'),
            grammar: document.getElementById('tool-grammar'),
            translate: document.getElementById('tool-translate'),
            general: document.getElementById('tool-general')
        };
    }
}

export class UIRenderer {
    constructor(dom) {
        this.dom = dom;
    }

    render(state) {
        this.#renderTabs(state);
        this.#renderOutput(state);
        this.#renderStatus(state);
        this.#renderButtons(state);
    }

    #renderTabs(state) {
        this.dom.tabButtons.forEach(btn => {
            const active = btn.dataset.tool === state.activeTool;
            btn.classList.toggle('active', active);
        });
        Object.entries(this.dom.panels).forEach(([id, panel]) => {
            panel.classList.toggle('active-panel', id === state.activeTool);
        });
    }

    #renderOutput(state) {
        this.dom.outputText.textContent = state.outputText;
        this.dom.feedbackContent.textContent = state.feedbackText;
    }

    #renderStatus(state) {
        const el = this.dom.statusIndicator;
        el.textContent = state.connected ? 'Connected' : 'Offline';
        el.classList.remove('online', 'offline');
        el.classList.add(state.connected ? 'online' : 'offline');
    }

    #renderButtons(state) {
        const loading = state.outputState === OUTPUT_STATES.LOADING;
        this.dom.generateBtn.disabled = loading;
        this.dom.resendBtn.disabled = loading || !state.lastRequest;
        this.dom.resendOutputBtn.disabled = loading || !state.lastRequest;
    }

    populateModels(models, selected) {
        const select = this.dom.modelSelect;
        select.innerHTML = '';
        if (!models.length) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- No Models --';
            select.appendChild(option);
            return;
        }
        for (const model of models) {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            select.appendChild(option);
        }
        if (selected && models.includes(selected)) {
            select.value = selected;
        }
    }

    async copyText(text) {
        await navigator.clipboard.writeText(text);
        const original = this.dom.copyBtn.textContent;
        this.dom.copyBtn.textContent = '✅ Copied';
        setTimeout(() => {
            this.dom.copyBtn.textContent = original;
        }, 1200);
    }
}

export class FormExtractor {
    static getLength() {
        return document.querySelector('input[name="length"]:checked')?.value ?? 'medium';
    }

    static getPerspective() {
        return document.querySelector('input[name="perspective"]:checked')?.value ?? 'third';
    }

    static extract(activeTool) {
        switch (activeTool) {
            case TOOL_IDS.RP:
                return {
                    charName: document.getElementById('charName').value.trim(),
                    charGender: document.getElementById('charGender').value,
                    charMood: document.getElementById('charMood').value,
                    charPersonality: document.getElementById('charPersonality').value,
                    subjectName: document.getElementById('subjectName').value.trim(),
                    subjectGender: document.getElementById('subjectGender').value,
                    rawAction: document.getElementById('rpActionInput').value.trim(),
                    perspective: this.getPerspective(),
                    lengthMode: this.getLength(),
                    oocEnabled: document.getElementById('oocEnabled').checked,
                    oocIndicator: document.getElementById('oocIndicator').value
                };
            case TOOL_IDS.GRAMMAR:
                return {
                    inputText: document.getElementById('grammarInput').value.trim(),
                    targetLanguage: document.getElementById('grammarLang').value
                };
            case TOOL_IDS.TRANSLATE:
                return {
                    sourceText: document.getElementById('sourceText').value.trim(),
                    sourceLang: document.getElementById('sourceLang').value,
                    targetLang: document.getElementById('targetLang').value
                };
            default:
                return {
                    userMessage: document.getElementById('generalInput').value.trim(),
                    systemPrompt: document.getElementById('generalSystem').value.trim()
                };
        }
    }
}

export class TabController {
    constructor({ store, dom }) {
        this.store = store;
        this.dom = dom;
    }

    initialize() {
        this.dom.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                this.store.setActiveTool(tool);
            });
        });
    }
}

export class ConnectionController {
    constructor({ store, modelService, renderer, dom, client }) {
        this.store = store;
        this.modelService = modelService;
        this.renderer = renderer;
        this.dom = dom;
        this.client = client;
    }

    async connect() {
        const baseUrl = this.dom.baseUrl.value.trim();
        const apiKey = this.dom.apiKey.value.trim();
        Validator.required(baseUrl, 'URL');

        this.client.updateConfiguration({ baseUrl, apiKey });

        this.store.patch({ feedbackText: 'Connecting...' });
        const models = await this.modelService.fetchModels(true);
        this.store.patch({ connected: true, models });
        this.renderer.populateModels(models, this.store.getState().selectedModel);
        this.store.patch({ feedbackText: `Connected (${models.length} models)` });
    }
}

export class GenerateCommand {
    constructor({ store, pipeline, dom }) {
        this.store = store;
        this.pipeline = pipeline;
        this.dom = dom;
    }

    async execute() {
        const state = this.store.getState();
        const model = this.dom.modelSelect.value;
        Validator.model(model);
        this.store.setSelectedModel(model);

        const data = FormExtractor.extract(state.activeTool);
        await this.pipeline.execute({
            toolId: state.activeTool,
            model,
            data
        });
    }
}

export class ResendCommand {
    constructor({ store, pipeline }) {
        this.store = store;
        this.pipeline = pipeline;
    }

    async execute() {
        const state = this.store.getState();
        const request = state.lastRequest;
        if (!request) {
            throw new ValidationError('No previous request');
        }
        await this.pipeline.execute({
            toolId: request.toolId,
            model: request.model,
            data: structuredClone(request.data)
        });
    }
}

export class CopyCommand {
    constructor({ store, renderer }) {
        this.store = store;
        this.renderer = renderer;
    }

    async execute() {
        const state = this.store.getState();
        if (state.outputState !== 'success') return;
        const text = state.outputText;
        if (!text || text === '❌ Error') return;
        await this.renderer.copyText(text);
    }
}

export class KeyboardController {
    constructor({ generateCommand }) {
        this.generateCommand = generateCommand;
    }

    initialize() {
        const selectors = ['#rpActionInput', '#grammarInput', '#sourceText', '#generalInput'];
        selectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (!element) return;
            element.addEventListener('keydown', async event => {
                if (event.key !== 'Enter' || event.shiftKey) return;
                event.preventDefault();
                try {
                    await this.generateCommand.execute();
                } catch (error) {
                    console.error(error);
                }
            });
        });
    }
}

export class SettingsPersistence {
    constructor(dom) {
        this.dom = dom;
    }

    restore() {
        const settings = StorageService.load(STORAGE_KEYS.SETTINGS, {});
        if (settings.baseUrl) this.dom.baseUrl.value = settings.baseUrl;
        if (settings.apiKey) this.dom.apiKey.value = settings.apiKey;
    }

    save() {
        StorageService.save(STORAGE_KEYS.SETTINGS, {
            baseUrl: this.dom.baseUrl.value.trim(),
            apiKey: this.dom.apiKey.value.trim()
        });
    }

    initialize() {
        const handler = () => this.save();
        this.dom.baseUrl.addEventListener('change', handler);
        this.dom.apiKey.addEventListener('change', handler);
    }
}