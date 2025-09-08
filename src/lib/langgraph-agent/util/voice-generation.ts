import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface VoiceLine {
    character: string;
    text: string;
    voice: string;
    audioDataUrl: string; // data:audio/mpeg;base64,...
}

function pickVoiceForCharacter(name: string): string {
    // Simple deterministic mapping; can be extended
    const voices = ['alloy', 'verse', 'aria', 'sage'];
    const idx = Math.abs(Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0)) % voices.length;
    return voices[idx];
}

function parseDialogLines(script: string): Array<{ character: string; text: string }> {
    const lines = script.split('\n');
    const results: Array<{ character: string; text: string }> = [];
    for (const raw of lines) {
        const line = raw.trim();
        // Match "CHARACTER: dialog"
        const m = /^([A-Z][A-Z\s\-']{1,40}):\s*(.+)$/.exec(line);
        if (m) {
            const character = m[1].trim();
            const text = m[2].trim();
            if (text.length > 0) results.push({ character, text });
        }
    }
    return results;
}

export async function generateVoicesFromScript(script: string, maxLines: number = 8): Promise<VoiceLine[]> {
    const dialogs = parseDialogLines(script).slice(0, maxLines);
    const out: VoiceLine[] = [];
    for (const d of dialogs) {
        const voice = pickVoiceForCharacter(d.character);
        try {
            const speech = await openai.audio.speech.create({
                model: 'gpt-4o-mini-tts',
                voice,
                input: d.text,
            });
            const arrayBuffer = await speech.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            out.push({ character: d.character, text: d.text, voice, audioDataUrl: `data:audio/mpeg;base64,${base64}` });
        } catch {
            // continue on failure for this line
        }
    }
    return out;
}
