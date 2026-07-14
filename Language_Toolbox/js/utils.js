export function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const normalizeText = (text) => {
    if (typeof text !== 'string') return text;
    return text.trim().replace(/\s+/g, ' ');
};

export function stripQuotes(text) {
    const trimmed = normalizeText(text);
    while (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1).trim();
    }
    return trimmed;
}

export function countWords(text) {
    return text.replace(/^\/me\s*/i, '').trim().split(/\s+/).filter(Boolean).length;
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function normalizeMeCommand(text) {
    const trimmed = normalizeText(text);
    if (trimmed.toLowerCase().startsWith('/me ')) {
        return trimmed;
    }
    return `/me ${trimmed}`;
}

export function populateSelect(elementId, values, selected) {
    const select = document.getElementById(elementId);
    if (!select) return;
    select.innerHTML = '';
    for (const value of values) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    }
    if (selected && values.includes(selected)) {
        select.value = selected;
    }
}

export const normalizeRP = (text, actorName) => {
    // Guard against non‑string or empty input
    if (typeof text !== 'string') return text;
    const trimmed = normalizeText(text);
    if (!trimmed) return '/me';

    // Already normalised
    if (/^\/me\b/.test(trimmed)) return trimmed;

    const words = trimmed.split(' ');
    const firstWord = words[0];
    const lowerFirst = firstWord.toLowerCase();

    // Clean first word: remove leading/trailing punctuation for pronoun detection
    const cleanFirst = firstWord.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
    const lowerClean = cleanFirst.toLowerCase();

    // Known subject pronouns (case‑insensitive)
    const subjectPronouns = new Set([
        'i', 'you', 'he', 'she', 'it', 'we', 'they',
    ]);

    // Words that are very unlikely to be an actor’s name when they appear
    // at the start of a sentence.  Extend this set if you encounter other false positives.
    const nonNameWords = new Set([
        // Interjections / greetings
        'hi', 'hello', 'hey', 'ah', 'oh', 'wow', 'oops', 'ouch', 'hmm', 'uh',
        // Articles
        'the', 'a', 'an',
        // Demonstratives / possessives
        'this', 'that', 'these', 'those',
        'my', 'your', 'his', 'her', 'its', 'our', 'their',
        // Conjunctions
        'and', 'but', 'or', 'nor', 'for', 'so', 'yet',
        // Prepositions
        'in', 'on', 'at', 'by', 'with', 'from', 'to', 'of',
        // Question words
        'what', 'which', 'who', 'whom', 'whose',
        'when', 'where', 'why', 'how',
        // Subordinating conjunctions
        'if', 'because', 'although', 'since', 'while',
        // Auxiliary / modal verbs
        'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
        'do', 'does', 'did',
        'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had',
        // Existential / adverbs that often start a sentence
        'there', 'here', 'now', 'then',
        // Polite / filler words
        'please', 'just', 'only', 'also', 'very',
        // Other
        'not', 'no',
    ]);

    // ----- Subject detection -----
    const isPronoun = subjectPronouns.has(lowerClean);
    // Handle contractions like I'm, you're, he's, etc.
    const isContraction = (() => {
        if (!lowerClean.includes("'")) return false;
        const base = lowerClean.split("'")[0];
        return subjectPronouns.has(base);
    })();
    const isLets = lowerClean === "let's";
    const isProbableName =
        firstWord[0] === firstWord[0].toUpperCase() &&
        firstWord[0] !== firstWord[0].toLowerCase() &&
        !nonNameWords.has(lowerFirst) &&
        words.length > 1;
    const isActorName = typeof actorName === 'string' &&
                        actorName.length === 1 &&
                        actorName === firstWord[0].toUpperCase();

    // Single-word sentences: always prepend (unless already "/me")
    if (words.length === 1) {
        return '/me ' + trimmed;
    }

    // Replace blocklisted common words (greetings, articles, etc.) with "/me"
    const isNonName = nonNameWords.has(lowerFirst) && words.length > 1;

    if (isPronoun || isContraction || isLets || isProbableName || isActorName || isNonName) {
        words[0] = '/me';
        return words.join(' ');
    }

    // No explicit subject found → prepend “/me ”
    return '/me ' + trimmed;
};
