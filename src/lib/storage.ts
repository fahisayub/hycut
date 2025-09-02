export type StoredResult<T> = {
    timestamp: number;
    promptKey: string;
    data: T;
};

export function normalizePrompt(prompt: string): string {
    return prompt.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 512);
}

export function makePromptKey(prefix: string, prompt: string): string {
    return `${prefix}:${normalizePrompt(prompt)}`;
}

export function saveToStorage<T>(key: string, data: T) {
    if (typeof window === 'undefined') return;
    const payload: StoredResult<T> = { timestamp: Date.now(), promptKey: key, data };
    localStorage.setItem(key, JSON.stringify(payload));
}

export function loadFromStorage<T>(key: string, maxAgeMs?: number): T | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as StoredResult<T>;
        if (maxAgeMs && Date.now() - parsed.timestamp > maxAgeMs) return null;
        return parsed.data;
    } catch {
        return null;
    }
}

export function clearStorage(key: string) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
}
