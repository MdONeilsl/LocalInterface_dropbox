export function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripQuotes(text) {
    const trimmed = text.trim();
    if (
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
    const trimmed = text.trim();
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