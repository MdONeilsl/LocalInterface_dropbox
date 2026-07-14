export const APP_VERSION = '2.0.0';

export const STORAGE_KEYS = Object.freeze({
    SETTINGS: 'ai_toolbox.settings',
    LAST_MODEL: 'ai_toolbox.last_model',
    ACTIVE_TAB: 'ai_toolbox.active_tab'
});

export const DEFAULT_CONFIG = Object.freeze({
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    requestTimeoutMs: 30000,
    retryDelayMs: 1000,
    maxRetries: 3
});

export const OUTPUT_STATES = Object.freeze({
    IDLE: 'idle',
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error'
});

export const TOOL_IDS = Object.freeze({
    RP: 'rp',
    GRAMMAR: 'grammar',
    TRANSLATE: 'translate',
    GENERAL: 'general'
});

export const WORD_LIMITS = Object.freeze({
    short: { min: 5, max: 30 },
    medium: { min: 31, max: 80 },
    long: { min: 81, max: 300 }
});

export const TOOL_CONFIG = Object.freeze({
    rp: { temperature: 0.7, max_tokens: 350, retries: 10 },
    grammar: { temperature: 0.3, max_tokens: 400, retries: 1 },
    translate: { temperature: 0.4, max_tokens: 500, retries: 1 },
    general: { temperature: 0.8, max_tokens: 600, retries: 1 }
});

export const MOODS = Object.freeze([
    "Calm", "Excited", "Anxious", "Angry", "Sad", "Neutral",
    "Cheerful", "Melancholic", "Hopeful", "Jealous", "Envious",
    "Confident", "Shy", "Bold", "Playful", "Serious", "Sleepy",
    "Energetic", "Grateful", "Lonely", "Nostalgic", "Proud",
    "Ashamed", "Curious", "Suspicious", "Trusting", "Defensive",
    "Affectionate", "Cold", "Passionate", "Bored", "Terrified",
    "Relieved", "Stressed", "Mischievous", "Thoughtful", "Indifferent"
]);

export const PERSONALITIES = Object.freeze([
    "Brave", "Cunning", "Honest", "Deceitful", "Altruistic",
    "Selfish", "Optimistic", "Pessimistic", "Charismatic", "Awkward",
    "Intellectual", "Impulsive", "Patient", "Hot-headed", "Gentle",
    "Rough", "Loyal", "Treacherous", "Ambitious", "Lazy",
    "Creative", "Analytical", "Emotional", "Stoic", "Nurturing",
    "Dominant", "Submissive", "Flirtatious", "Reserved", "Outgoing",
    "Stubborn", "Flexible", "Perfectionist", "Carefree", "Vengeful",
    "Forgiving", "Mysterious", "Frank", "Diplomatic", "Blunt",
    "Eccentric", "Conventional", "Daring", "Cautious", "Curious",
    "Indifferent", "Obsessive", "Detached", "Sarcastic", "Witty"
]);