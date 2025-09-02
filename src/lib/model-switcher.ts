import { MODEL_CONFIGS, updateModelConfig } from './model-config';

export const MODEL_SWITCHER = {
    // Easy switching functions
    switchToOpenAI: (task: keyof typeof MODEL_CONFIGS, model: string) => {
        updateModelConfig(task, {
            provider: 'openai',
            model,
            apiKey: process.env.OPENAI_API_KEY
        });
    },

    switchToAnthropic: (task: keyof typeof MODEL_CONFIGS, model: string) => {
        updateModelConfig(task, {
            provider: 'anthropic',
            model,
            apiKey: process.env.ANTHROPIC_API_KEY
        });
    },

    switchToLocal: (task: keyof typeof MODEL_CONFIGS, model: string, baseUrl: string) => {
        updateModelConfig(task, {
            provider: 'local',
            model,
            baseUrl
        });
    },

    // Batch switching
    switchAllToOpenAI: (model: string) => {
        Object.keys(MODEL_CONFIGS).forEach((task) => {
            updateModelConfig(task as keyof typeof MODEL_CONFIGS, {
                provider: 'openai',
                model,
                apiKey: process.env.OPENAI_API_KEY
            });
        });
    },

    switchAllToAnthropic: (model: string) => {
        Object.keys(MODEL_CONFIGS).forEach((task) => {
            updateModelConfig(task as keyof typeof MODEL_CONFIGS, {
                provider: 'anthropic',
                model,
                apiKey: process.env.ANTHROPIC_API_KEY
            });
        });
    }
};

// Usage examples:
// MODEL_SWITCHER.switchToOpenAI('story_generation', 'gpt-4o');
// MODEL_SWITCHER.switchToAnthropic('script_writing', 'claude-3-haiku-20240307');
// MODEL_SWITCHER.switchAllToOpenAI('gpt-4o-mini');
