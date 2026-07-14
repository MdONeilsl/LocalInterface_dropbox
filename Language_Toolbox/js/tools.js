import { TOOL_IDS, TOOL_CONFIG } from './constants.js';
import { Validator, ResponseSanitizer, RoleplayValidator } from './validators.js';
import { RetryPolicy } from './api.js';
import { countWords, normalizeMeCommand } from './utils.js';
import { ValidationError, AppError } from './errors.js';

export class ToolBase {
    constructor(client) {
        this.client = client;
    }

    get id() {
        throw new Error('Tool id not implemented');
    }

    async execute() {
        throw new Error('Tool execute not implemented');
    }

    buildMessages() {
        throw new Error('Tool buildMessages not implemented');
    }

    getConfig() {
        return TOOL_CONFIG.general;
    }
}

export class PromptBuilder {
    static roleplay(data) {
        const perspective = data.perspective === 'first' ? 'first person' : 'third person';
        return `
You are an expert roleplay assistant.

Rules:
- Rewrite the action naturally.
- Keep narrative quality high.
- Stay strictly in ${perspective}.
- Output must begin with "/me ".
- Never describe thoughts, emotions, intentions,
  or internal states of other characters.
- Only describe observable actions.
- Never include explanations.
- Never include OOC comments.

Character:
Name: ${data.charName || 'Unknown'}
Gender: ${data.charGender}
Mood: ${data.charMood}
Personality: ${data.charPersonality}

Subject:
Name: ${data.subjectName || 'None'}
Gender: ${data.subjectGender}

Length Mode:
${data.lengthMode}
`.trim();
    }

    static grammar(data) {
        return `
You are a professional editor.

Correct:
- grammar
- spelling
- punctuation
- fluency

Language:
${data.targetLanguage}

Output ONLY corrected text.
`.trim();
    }

    static translation(data) {
        const source = data.sourceLang === 'auto' ? 'Auto Detect' : data.sourceLang;
        return `
You are a professional translator.

Source:
${source}

Target:
${data.targetLang}

Output ONLY the translation.
Do not explain anything.
`.trim();
    }
}

export class RoleplayTool extends ToolBase {
    get id() {
        return TOOL_IDS.RP;
    }

    getConfig() {
        return TOOL_CONFIG.rp;
    }

    async execute({ model, data }) {
        Validator.model(model);
        Validator.text(data.rawAction, 'Action');

        const config = this.getConfig();
        const retryPolicy = new RetryPolicy({
            retries: config.retries,
            delayMs: 600
        });

        return retryPolicy.execute(async attempt => {
            const messages = this.buildMessages(data, attempt);
            const raw = await this.client.createChatCompletion({
                model,
                messages,
                temperature: config.temperature,
                max_tokens: config.max_tokens
            });
            const output = ResponseSanitizer.ensureMeCommand(raw);
            const validation = RoleplayValidator.validate(output, {
                lengthMode: data.lengthMode,
                subjectName: data.subjectName
            });
            if (!validation.valid) {
                throw new ValidationError(validation.reason);
            }
            return {
                output,
                feedback: `RP generated (${countWords(output)} words)`
            };
        });
    }

    buildMessages(data, attempt = 1) {
        let action = data.rawAction;
        if (data.oocEnabled && data.oocIndicator) {
            const index = action.indexOf(data.oocIndicator);
            if (index !== -1) {
                action = action.slice(0, index);
            }
        }
        action = normalizeMeCommand(action);
        return [
            { role: 'system', content: PromptBuilder.roleplay(data) },
            { role: 'user', content: `Rewrite:\n${action}` }
        ];
    }
}

export class GrammarTool extends ToolBase {
    get id() {
        return TOOL_IDS.GRAMMAR;
    }

    getConfig() {
        return TOOL_CONFIG.grammar;
    }

    async execute({ model, data }) {
        Validator.model(model);
        Validator.text(data.inputText, 'Text');

        const config = this.getConfig();
        const messages = this.buildMessages(data);
        const output = await this.client.createChatCompletion({
            model,
            messages,
            temperature: config.temperature,
            max_tokens: config.max_tokens
        });

        return {
            output: ResponseSanitizer.clean(output),
            feedback: 'Grammar correction complete'
        };
    }

    buildMessages(data) {
        return [
            { role: 'system', content: PromptBuilder.grammar(data) },
            { role: 'user', content: data.inputText }
        ];
    }
}

export class TranslationTool extends ToolBase {
    get id() {
        return TOOL_IDS.TRANSLATE;
    }

    getConfig() {
        return TOOL_CONFIG.translate;
    }

    async execute({ model, data }) {
        Validator.model(model);
        Validator.text(data.sourceText, 'Source Text');

        const config = this.getConfig();
        const messages = this.buildMessages(data);
        const output = await this.client.createChatCompletion({
            model,
            messages,
            temperature: config.temperature,
            max_tokens: config.max_tokens
        });

        return {
            output: ResponseSanitizer.clean(output),
            feedback: 'Translation complete'
        };
    }

    buildMessages(data) {
        return [
            { role: 'system', content: PromptBuilder.translation(data) },
            { role: 'user', content: data.sourceText }
        ];
    }
}

export class GeneralChatTool extends ToolBase {
    get id() {
        return TOOL_IDS.GENERAL;
    }

    getConfig() {
        return TOOL_CONFIG.general;
    }

    async execute({ model, data }) {
        Validator.model(model);
        Validator.text(data.userMessage, 'Message');

        const config = this.getConfig();
        const messages = this.buildMessages(data);
        const output = await this.client.createChatCompletion({
            model,
            messages,
            temperature: config.temperature,
            max_tokens: config.max_tokens
        });

        return {
            output: ResponseSanitizer.clean(output),
            feedback: 'Response received'
        };
    }

    buildMessages(data) {
        const messages = [];
        if (data.systemPrompt) {
            messages.push({ role: 'system', content: data.systemPrompt });
        }
        messages.push({ role: 'user', content: data.userMessage });
        return messages;
    }
}

export class ToolRegistry {
    #tools = new Map();

    register(tool) {
        this.#tools.set(tool.id, tool);
        return this;
    }

    get(toolId) {
        const tool = this.#tools.get(toolId);
        if (!tool) {
            throw new AppError(`Tool not found: ${toolId}`);
        }
        return tool;
    }

    has(toolId) {
        return this.#tools.has(toolId);
    }

    list() {
        return [...this.#tools.keys()];
    }
}
