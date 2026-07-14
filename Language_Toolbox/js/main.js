import { ApplicationRoot } from './app.js';
import { APP_VERSION } from './constants.js';

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const app = new ApplicationRoot();
        await app.initialize();
        console.info(`AI Toolbox ${APP_VERSION} initialized`);
    } catch (error) {
        console.error('Application startup failed', error);
        alert(`Startup failed:\n${error.message}`);
    }
});

