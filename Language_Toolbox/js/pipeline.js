import { OUTPUT_STATES } from './constants.js';

export class RequestPipeline {
    constructor({ store, registry }) {
        this.store = store;
        this.registry = registry;
        this.activeRequest = null;
    }

    async execute({ toolId, model, data }) {
        const tool = this.registry.get(toolId);
        this.store.patch({
            outputState: OUTPUT_STATES.LOADING,
            feedbackText: 'Generating...',
            outputText: '⏳ Thinking...'
        });

        try {
            const result = await tool.execute({ model, data });
            this.store.patch({
                outputState: OUTPUT_STATES.SUCCESS,
                outputText: result.output,
                feedbackText: result.feedback,
                lastRequest: { toolId, model, data }
            });
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.store.patch({
                outputState: OUTPUT_STATES.ERROR,
                outputText: '❌ Error',
                feedbackText: message
            });
            throw error;
        }
    }
}

