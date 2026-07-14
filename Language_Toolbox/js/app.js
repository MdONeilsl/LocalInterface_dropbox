import { APP_VERSION, DEFAULT_CONFIG, MOODS, PERSONALITIES } from './constants.js';
import { populateSelect } from './utils.js';
import { EventBus, AppStore } from './core.js';
import { LLMClient, ModelService } from './api.js';
import {
    RoleplayTool, GrammarTool, TranslationTool, GeneralChatTool, ToolRegistry
} from './tools.js';
import { RequestPipeline } from './pipeline.js';
import {
    DOMCache, UIRenderer, SettingsPersistence,
    TabController, ConnectionController,
    GenerateCommand, ResendCommand, CopyCommand, KeyboardController
} from './ui.js';

export class ApplicationRoot {
    async initialize() {
        const eventBus = new EventBus();
        const store = new AppStore(eventBus);
        const dom = new DOMCache();
        const renderer = new UIRenderer(dom);

        const settings = new SettingsPersistence(dom);
        settings.restore();

        const client = new LLMClient({
            baseUrl: dom.baseUrl.value || DEFAULT_CONFIG.baseUrl,
            apiKey: dom.apiKey.value
        });

        const modelService = new ModelService(client);

        const registry = new ToolRegistry();
        registry
            .register(new RoleplayTool(client))
            .register(new GrammarTool(client))
            .register(new TranslationTool(client))
            .register(new GeneralChatTool(client));

        const pipeline = new RequestPipeline({ store, registry });

        const generateCommand = new GenerateCommand({ store, pipeline, dom });
        const resendCommand = new ResendCommand({ store, pipeline });
        const copyCommand = new CopyCommand({ store, renderer });

        const connectionController = new ConnectionController({
            store,
            modelService,
            renderer,
            dom,
            client
        });

        const tabController = new TabController({ store, dom });
        const keyboardController = new KeyboardController({ generateCommand });

        eventBus.on('store:changed', state => renderer.render(state));

        dom.generateBtn.addEventListener('click', async () => {
            try {
                await generateCommand.execute();
            } catch (error) {
                console.error(error);
            }
        });

        dom.resendBtn.addEventListener('click', async () => {
            try {
                await resendCommand.execute();
            } catch (error) {
                console.error(error);
            }
        });

        dom.resendOutputBtn.addEventListener('click', async () => {
            try {
                await resendCommand.execute();
            } catch (error) {
                console.error(error);
            }
        });

        dom.copyBtn.addEventListener('click', async () => {
            try {
                await copyCommand.execute();
            } catch (error) {
                console.error(error);
            }
        });

        dom.testConnBtn.addEventListener('click', async () => {
            try {
                await connectionController.connect();
            } catch (error) {
                store.patch({ connected: false, feedbackText: error.message });
            }
        });

        dom.modelSelect.addEventListener('change', event => {
            store.setSelectedModel(event.target.value);
        });

        tabController.initialize();
        keyboardController.initialize();
        settings.initialize();

        populateSelect('charMood', MOODS, 'Neutral');
        populateSelect('charPersonality', PERSONALITIES, 'Brave');

        renderer.render(store.getState());
    }
}