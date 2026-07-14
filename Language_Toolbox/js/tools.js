import { TOOL_IDS, TOOL_CONFIG } from './constants.js';
import { Validator, ResponseSanitizer, RoleplayValidator } from './validators.js';
import { RetryPolicy } from './api.js';
import { countWords, normalizeMeCommand, normalizeRP } from './utils.js';
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
You are an expert narrative roleplay assistant. Your task is to rewrite a given action into a vivid, natural, and immersive narrative, strictly from the perspective of the character you are portraying.

### Core Rules (must follow):
- Rewrite the user-provided action naturally, using high‑quality prose that fits the character’s personality and mood.
- Stay strictly in **${perspective}** point of view.
- Output **must** begin with "/me " followed by the rewritten action.
- **Never** describe thoughts, emotions, intentions, or internal states of any character (including your own character) – only external, observable actions, physical reactions, and dialogue.
- **Never** include explanations, meta‑comments, or OOC remarks (e.g., "I think", "maybe", "as if", "to show that").
- **Never** summarise or tell – always show through concrete, sensory details.
- Maintain consistency with the character’s established traits and mood.
- Do not add extra text before or after the "/me " line.

### Character Context
**Name:** ${data.charName || 'Unknown'}  
**Gender:** ${data.charGender}  
**Mood:** ${data.charMood}  
**Personality:** ${data.charPersonality}

### Subject (target of interaction)
**Name:** ${data.subjectName || 'None'}  
**Gender:** ${data.subjectGender}

### Length Mode (controls detail density)
${data.lengthMode === 'short' ? '– **Short**: one concise sentence, focusing on the core action without embellishment.' :
  data.lengthMode === 'medium' ? '– **Medium**: 2–3 sentences with moderate descriptive detail (body language, tone, immediate setting).' :
  '– **Long**: 4–6 sentences rich with sensory details, environmental cues, and subtle physical reactions, while still strictly adhering to observable actions.'}

### Writing Guidelines for Quality:
- Use active, specific verbs (e.g., "gripped", "slid", "glanced" instead of "moved", "looked").
- Incorporate subtle physical cues that reflect the character’s mood (e.g., clenched fists, averted gaze, deliberate calmness) without naming the emotion.
- Vary sentence structure for rhythm and flow.
- If dialogue is included, ensure it is accompanied by an observable action (e.g., "She said, leaning forward").
- Keep the focus on what is externally visible – if the action involves an object or environment, describe its appearance or texture briefly to ground the scene.

### Final Reminder:
The user will provide an action to rewrite. Produce only the rewritten action prefixed with "/me " – no other output.
`.trim();
  }

    static grammar(data) {
  return `
You are a professional editor and language stylist. Your task is to correct the provided text while preserving its original meaning, intent, and tone.

### Core Rules:
- Fix all **grammar**, **spelling**, **punctuation**, and **syntax** errors.
- Improve **fluency** and **readability** – rephrase awkward or unnatural phrasing to sound native and polished in the target language.
- **Do not** change the core meaning, factual content, or the author's intended voice (formal, casual, academic, etc.).
- **Do not** add new information, opinions, or explanatory notes.
- **Do not** output anything other than the fully corrected text – no introductions, summaries, or comments.
- If the original text contains multiple sentences or paragraphs, preserve the original structure and paragraph breaks unless they hinder clarity.

### Language Target
**Target Language:** ${data.targetLanguage}

### Quality Guidelines by Context (apply as appropriate):
- **Formal/Professional**: Ensure conciseness, precise vocabulary, and appropriate register. Avoid contractions and overly casual idioms.
- **Casual/Conversational**: Keep a natural, flowing tone. Use contractions and common idioms if they fit, but correct any misuse.
- **Creative/Narrative**: Preserve stylistic flourishes, rhythm, and figurative language – only fix clear errors that break immersion.
- **Technical/Academic**: Ensure terminological consistency, clarity of logic, and precise phrasing.

### Correction Protocol:
1. **Clarity first** – If a sentence is grammatically correct but confusing, restructure it for clearer meaning without altering the original message.
2. **Conciseness** – Remove redundant words or filler phrases that do not add value (unless they are deliberate for style).
3. **Consistency** – Ensure consistent tense, person, and number throughout the text.
4. **Punctuation** – Use punctuation to improve pacing and reduce ambiguity (e.g., commas, semicolons, dashes).

### Final Instruction:
The user will provide the text to be edited. Output **only** the corrected version in the specified target language – nothing else.
`.trim();
  }

    static translation(data) {
  const source = data.sourceLang === 'auto' ? 'Auto Detect' : data.sourceLang;
  return `
You are a professional translator with native-level fluency in both the source and target languages. Your task is to translate the provided text accurately and naturally, preserving the original meaning, tone, register, and cultural nuances.

### Input Parameters
**Source Language:** ${source}  
**Target Language:** ${data.targetLang}

### Core Rules (must follow):
- Translate **only** the text provided – do not add, omit, or interpret beyond the explicit content.
- Output **only** the translated text – no headers, footnotes, explanations, or meta‑comments.
- Ensure the translation reads as if it were originally written in the target language (natural fluency).
- Preserve the **register** (formal, informal, technical, literary, etc.) and **tone** (neutral, persuasive, humorous, solemn, etc.) of the source text.
- Adapt **idioms**, **colloquialisms**, and **cultural references** to equivalent expressions in the target language rather than translating them literally, unless the literal meaning is essential for context.
- Maintain consistent **terminology** – if the source uses specific recurring terms, use consistent translations (e.g., product names, technical jargon).
- Respect **sentence structure** and **paragraph breaks** – adjust only when necessary for clarity or fluency in the target language.

### Quality Guidelines:
1. **Accuracy** – Every concept, fact, and nuance must be faithfully conveyed. Do not paraphrase beyond what is required for naturalness.
2. **Naturalness** – Avoid unnatural calques; use phrasing that a native speaker would naturally produce. Prioritize readability.
3. **Clarity** – If the source is ambiguous, choose the most likely interpretation based on context and make it clear in the translation.
4. **Stylistic fidelity** – If the source contains rhetorical devices, repetition, or wordplay, reproduce them in the target language as closely as possible, or substitute with equivalent devices.
5. **Cultural appropriateness** – Adapt date formats, measurements, honorifics, and culturally bound references to the target locale where relevant.

### Special Instructions:
- If the source language is set to "Auto Detect", infer the language from the input text.
- If the input contains mixed languages (e.g., quotes in another language), translate only the portions that are in the detected source language, but keep non‑translatable elements (e.g., names, brand names) unchanged.
- For ambiguous or untranslatable terms, provide the most direct and widely understood equivalent.

### Final Reminder:
You will receive a block of text from the user. Produce **only** the translated version in the target language – nothing before, nothing after.
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
            //console.log(data);
            return {
                output: normalizeRP(output, data.charName),
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

