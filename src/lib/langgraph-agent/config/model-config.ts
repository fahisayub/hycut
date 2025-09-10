export interface ModelConfig {
    provider: 'openai' | 'anthropic' | 'ollama' | 'local' | 'elevenlabs' | 'google';
    model: string;
    apiKey?: string;
    baseUrl?: string;
}

export const MODEL_CONFIGS = {
    story_generation: {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY,
    },
    story_editing: {
        provider: 'anthropic' as const,
        model: 'claude-3-5-sonnet-20240620',
        apiKey: process.env.ANTHROPIC_API_KEY,
    },
    script_writing: {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY,
    },
    character_design: {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY,
    },
    character_image_generation: {
        provider: 'openai' as const,
        model: 'dall-e-2',
        apiKey: process.env.OPENAI_API_KEY,
    },
    location_design: {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY,
    },
    voice_generation: {
        provider: 'elevenlabs' as const,
        model: 'eleven_multilingual_v2',
        apiKey: process.env.ELEVENLABS_API_KEY,
    },
    scene_generation: {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY,
    },
    video_generation: {
        provider: 'google' as const,
        model: 'veo-2',
        apiKey: process.env.GOOGLE_API_KEY,
    },
    video_assembly: {
        provider: 'openai' as const,
        model: 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY,
    },
};

// Easy model switching function
export function updateModelConfig(task: keyof typeof MODEL_CONFIGS, newConfig: Partial<ModelConfig>) {
    (MODEL_CONFIGS[task] as ModelConfig) = { ...MODEL_CONFIGS[task], ...newConfig };
}


