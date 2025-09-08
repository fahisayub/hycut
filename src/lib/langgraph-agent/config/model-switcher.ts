import { MODEL_CONFIGS, updateModelConfig } from '../config/model-config';
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

export const MODEL_SWITCHER = {
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

export function getModelForTask(task: keyof typeof MODEL_CONFIGS): ChatOpenAI | ChatAnthropic {
    const config = MODEL_CONFIGS[task];
    switch (config.provider) {
        case 'openai':
            return new ChatOpenAI({
                model: config.model,
                apiKey: config.apiKey || process.env.OPENAI_API_KEY,
                temperature: 0.7
            });
        case 'anthropic':
            return new ChatAnthropic({
                model: config.model,
                apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
                temperature: 0.7
            });
        default:
            if (!process.env.OPENAI_API_KEY) {
                console.warn(`⚠️  No API key for ${config.provider}, and no OpenAI fallback available`);
                throw new Error(`No API key configured for ${config.provider} and no OpenAI fallback`);
            }
            return new ChatOpenAI({
                model: 'gpt-4o-mini',
                apiKey: process.env.OPENAI_API_KEY,
                temperature: 0.7
            });
    }
}


