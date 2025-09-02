import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface CharacterImageRequest {
    characterName: string;
    description: string;
    role: string;
    style?: string;
    referenceImageUrl?: string;
}

function buildSafePrompt(base: string): string {
    return `${base}

Restrictions: family-friendly, non-violent, no weapons, no text overlays, no logos, no brand names, no explicit or sensitive content.
Composition: neutral studio background, clear soft lighting, photographic realism, head-and-shoulders framing.`;
}

async function generateImageWithRetries(prompt: string, maxRetries = 2, referenceImageUrl?: string): Promise<string> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (referenceImageUrl) {
                // Attempt image variation prompt by including reference hint in text (OpenAI Images API lacks URL input without upload; so stick to prompt-only guidance)
                prompt = `${prompt}\nEnsure likeness stays consistent with prior portrait of the character (same hair color, clothing style).`;
            }
            const response = await openai.images.generate({
                model: 'dall-e-3',
                prompt,
                n: 1,
                size: '1024x1024',
                quality: 'standard',
                style: 'natural',
            });

            if (!response.data || response.data.length === 0) {
                throw new Error('Empty image response');
            }
            const url = response.data[0].url;
            if (!url) throw new Error('Missing image URL');
            return url;
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                prompt = buildSafePrompt(prompt + '\nMake it generic and non-controversial. Focus on neutral wardrobe.');
                continue;
            }
        }
    }
    throw lastError;
}

export async function generateCharacterImage(request: CharacterImageRequest): Promise<string> {
    const basePrompt = `Create a professional character portrait for a short film.

Character: ${request.characterName}
Role: ${request.role}
Description: ${request.description}

Style: ${request.style || 'Professional film character portrait, high quality, cinematic lighting, neutral background, suitable for video generation'}

Make it a clear, front-facing portrait for consistency across scenes.`;

    const safePrompt = buildSafePrompt(basePrompt);
    return generateImageWithRetries(safePrompt, 2, request.referenceImageUrl);
}

export async function generateSceneImage(sceneDescription: string, characterImageUrl?: string): Promise<string> {
    const basePrompt = `Create a cinematic scene for a short film.

Scene: ${sceneDescription}
${characterImageUrl ? 'Include a generic human figure with neutral wardrobe (do not include text overlays). Maintain non-violent context.' : ''}

Style: Cinematic, film-quality, dramatic lighting, suitable for video generation.`;

    const safePrompt = buildSafePrompt(basePrompt);
    return generateImageWithRetries(safePrompt, 2, characterImageUrl);
}
