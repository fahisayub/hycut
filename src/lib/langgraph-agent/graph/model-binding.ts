import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { MODEL_CONFIGS, type ModelConfig } from "../config/model-config";

export interface LangGraphModelConfig extends ModelConfig {
    streaming?: boolean;
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
    fallbacks?: string[];
}

export interface ModelBindingOptions {
    enableFallbacks?: boolean;
    enableStreaming?: boolean;
    maxRetries?: number;
    timeout?: number;
}

export class LangGraphModelFactory {
    private static instance: LangGraphModelFactory;
    private modelCache = new Map<string, BaseChatModel>();
    private options: ModelBindingOptions;

    constructor(options: ModelBindingOptions = {}) {
        this.options = {
            enableFallbacks: true,
            enableStreaming: false,
            maxRetries: 3,
            timeout: 30000,
            ...options
        };
    }

    static getInstance(options?: ModelBindingOptions): LangGraphModelFactory {
        if (!this.instance) {
            this.instance = new LangGraphModelFactory(options);
        }
        return this.instance;
    }

    async getModelForTask(task: keyof typeof MODEL_CONFIGS): Promise<BaseChatModel> {
        const config = MODEL_CONFIGS[task];
        const cacheKey = `${config.provider}:${config.model}:${task}`;
        if (this.modelCache.has(cacheKey)) {
            return this.modelCache.get(cacheKey)!;
        }
        const model = await this.createEnhancedModel(config, task);
        this.modelCache.set(cacheKey, model);
        return model;
    }

    private async createEnhancedModel(config: ModelConfig, task: string): Promise<BaseChatModel> {
        const baseConfig = {
            temperature: 0.7,
            maxRetries: this.options.maxRetries,
            timeout: this.options.timeout,
        } as const;

        try {
            let model: BaseChatModel;
            switch (config.provider) {
                case 'openai':
                    model = new ChatOpenAI({
                        ...baseConfig,
                        model: config.model,
                        apiKey: config.apiKey || process.env.OPENAI_API_KEY,
                        streaming: this.options.enableStreaming,
                    });
                    break;
                case 'anthropic':
                    model = new ChatAnthropic({
                        ...baseConfig,
                        model: config.model,
                        apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
                        streaming: this.options.enableStreaming,
                    });
                    break;
                case 'local':
                case 'ollama':
                    model = new ChatOpenAI({
                        ...baseConfig,
                        model: config.model,
                        // Some environments support custom base URLs; omit here to satisfy types
                        apiKey: config.apiKey || process.env.OPENAI_API_KEY || 'ollama',
                    });
                    break;
                default:
                    console.warn(`Unknown provider '${config.provider}', defaulting to OpenAI`);
                    model = new ChatOpenAI({
                        ...baseConfig,
                        model: 'gpt-4o-mini',
                        apiKey: process.env.OPENAI_API_KEY,
                    });
            }
            await this.testModel(model);
            console.log(`✅ Model ready: ${config.provider}:${config.model} for ${task}`);
            return model;
        } catch (error) {
            console.warn(`❌ Primary model failed for ${task}: ${config.provider}:${config.model}`);
            if (this.options.enableFallbacks) {
                return this.createFallbackModel(task, error);
            }
            throw error;
        }
    }

    private async createFallbackModel(task: string, originalError: unknown): Promise<BaseChatModel> {
        console.log(`🔄 Attempting fallback models for ${task}...`);
        const fallbackConfigs = [
            { provider: 'openai', model: 'gpt-4o-mini', apiKey: process.env.OPENAI_API_KEY },
            { provider: 'anthropic', model: 'claude-3-haiku-20240307', apiKey: process.env.ANTHROPIC_API_KEY },
            { provider: 'openai', model: 'gpt-3.5-turbo', apiKey: process.env.OPENAI_API_KEY },
        ] as const;
        for (const fallbackConfig of fallbackConfigs) {
            try {
                if (!fallbackConfig.apiKey) continue;
                let fallbackModel: BaseChatModel;
                if (fallbackConfig.provider === 'openai') {
                    fallbackModel = new ChatOpenAI({
                        model: fallbackConfig.model,
                        apiKey: fallbackConfig.apiKey,
                        temperature: 0.7,
                        maxRetries: 1,
                    });
                } else {
                    fallbackModel = new ChatAnthropic({
                        model: fallbackConfig.model,
                        apiKey: fallbackConfig.apiKey,
                        temperature: 0.7,
                        maxRetries: 1,
                    });
                }
                await this.testModel(fallbackModel);
                console.log(`✅ Fallback model working: ${fallbackConfig.provider}:${fallbackConfig.model} for ${task}`);
                return fallbackModel;
            } catch {
                console.warn(`❌ Fallback failed: ${fallbackConfig.provider}:${fallbackConfig.model}`);
                continue;
            }
        }
        const errorMessage = originalError instanceof Error ? originalError.message : String(originalError);
        throw new Error(`All models failed for task '${task}'. Original error: ${errorMessage}`);
    }

    private async testModel(model: BaseChatModel): Promise<void> {
        try {
            await model.invoke("Hello");
        } catch (error) {
            throw new Error(`Model test failed: ${error}`);
        }
    }

    clearCache(): void {
        this.modelCache.clear();
        console.log('🗑️ Model cache cleared');
    }

    getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.modelCache.size,
            keys: Array.from(this.modelCache.keys())
        };
    }
}

export async function getLangGraphModelForTask(
    task: keyof typeof MODEL_CONFIGS,
    options?: ModelBindingOptions
): Promise<BaseChatModel> {
    const factory = LangGraphModelFactory.getInstance(options);
    return factory.getModelForTask(task);
}

export function bindModelToTool(tool: { bind: (args: Record<string, unknown>) => unknown }, model: BaseChatModel) {
    return tool.bind({ model });
}

export const MODEL_PRESETS = {
    FAST: {
        enableFallbacks: true,
        enableStreaming: false,
        maxRetries: 1,
        timeout: 15000,
    },
    BALANCED: {
        enableFallbacks: true,
        enableStreaming: false,
        maxRetries: 3,
        timeout: 30000,
    },
    QUALITY: {
        enableFallbacks: true,
        enableStreaming: true,
        maxRetries: 5,
        timeout: 60000,
    },
} as const;

export function initializeLangGraphModels(preset: keyof typeof MODEL_PRESETS = 'BALANCED') {
    const options = MODEL_PRESETS[preset];
    console.log(`🔧 Initializing LangGraph models with ${preset} preset`);
    return LangGraphModelFactory.getInstance(options);
}



