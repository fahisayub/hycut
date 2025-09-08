import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";
import { VideoGenerationState, CharacterDesign, SceneInfo, VoiceData, PlanStep, ContentType, ContentAnalysis } from "@/types/video-generation-state";

export const VideoGenerationStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (current, update) => current.concat(update),
        default: () => [],
    }),

    userInput: Annotation<string>({
        reducer: (current, update) => update ?? current,
        default: () => "",
    }),
    contentType: Annotation<ContentType>({
        reducer: (current, update) => update ?? current,
        default: () => "unknown",
    }),
    analysisResult: Annotation<ContentAnalysis | null>({
        reducer: (current, update) => update ?? current,
        default: () => null,
    }),

    plan: Annotation<PlanStep[]>({
        reducer: (current, update) => update ?? current,
        default: () => [],
    }),
    completedSteps: Annotation<string[]>({
        reducer: (current, update) => {
            if (!update) return current;
            return [...new Set([...current, ...update])];
        },
        default: () => [],
    }),
    currentStep: Annotation<string>({
        reducer: (current, update) => update ?? current,
        default: () => "start",
    }),
    nextSteps: Annotation<string[]>({
        reducer: (current, update) => update ?? current,
        default: () => [],
    }),

    story: Annotation<string | null>({
        reducer: (current, update) => update ?? current,
        default: () => null,
    }),
    script: Annotation<string | null>({
        reducer: (current, update) => update ?? current,
        default: () => null,
    }),
    characters: Annotation<CharacterDesign[]>({
        reducer: (current, update) => update ?? current,
        default: () => [],
    }),
    characterImages: Annotation<Record<string, string>>({
        reducer: (current, update) => ({ ...current, ...update }),
        default: () => ({}),
    }),
    locations: Annotation<string | null>({
        reducer: (current, update) => update ?? current,
        default: () => null,
    }),
    scenes: Annotation<SceneInfo[]>({
        reducer: (current, update) => update ?? current,
        default: () => [],
    }),
    sceneImages: Annotation<string[]>({
        reducer: (current, update) => {
            if (!update) return current;
            return [...current, ...update];
        },
        default: () => [],
    }),
    generatedVideos: Annotation<string[]>({
        reducer: (current, update) => {
            if (!update) return current;
            return [...current, ...update];
        },
        default: () => [],
    }),
    voices: Annotation<VoiceData[]>({
        reducer: (current, update) => update ?? current,
        default: () => [],
    }),
    finalVideo: Annotation<string | null>({
        reducer: (current, update) => update ?? current,
        default: () => null,
    }),

    startTime: Annotation<Date | null>({
        reducer: (current, update) => update ?? current,
        default: () => null,
    }),
    stepTimings: Annotation<Record<string, { start: Date; end?: Date; duration?: number }>>({
        reducer: (current, update) => ({ ...current, ...update }),
        default: () => ({}),
    }),
    errors: Annotation<{ step: string; error: string; timestamp: Date }[]>({
        reducer: (current, update) => {
            if (!update) return current;
            return [...current, ...update];
        },
        default: () => [],
    }),
    quality: Annotation<{
        storyQuality?: number;
        scriptQuality?: number;
        characterConsistency?: number;
        overallRating?: number;
    } | null>({
        reducer: (current, update) => ({ ...current, ...update }),
        default: () => null,
    }),

    modelConfig: Annotation<Record<string, string> | null>({
        reducer: (current, update) => ({ ...current, ...update }),
        default: () => null,
    }),

    progress: Annotation<{
        currentStepProgress: number;
        overallProgress: number;
        estimatedTimeRemaining?: number;
    } | null>({
        reducer: (current, update) => {
            if (!current) return update;
            if (!update) return current;
            return { ...current, ...update };
        },
        default: () => ({ currentStepProgress: 0, overallProgress: 0 }),
    }),
});

export type LangGraphVideoState = typeof VideoGenerationStateAnnotation.State;

export function convertToLangGraphState(legacyState: VideoGenerationState): LangGraphVideoState {
    return {
        messages: legacyState.messages || [],
        userInput: legacyState.userInput,
        contentType: legacyState.contentType,
        analysisResult: legacyState.analysisResult ? JSON.parse(legacyState.analysisResult) : null,
        plan: legacyState.plan || [],
        completedSteps: legacyState.completedSteps || [],
        currentStep: legacyState.currentStep || "start",
        nextSteps: legacyState.nextSteps || [],
        story: legacyState.story || null,
        script: legacyState.script || null,
        characters: legacyState.characters || [],
        characterImages: legacyState.characterImages || {},
        locations: legacyState.locations || null,
        scenes: legacyState.scenes || [],
        sceneImages: legacyState.sceneImages || [],
        generatedVideos: legacyState.generatedVideos || [],
        voices: legacyState.voices || [],
        finalVideo: legacyState.finalVideo || null,
        startTime: legacyState.startTime || null,
        stepTimings: legacyState.stepTimings || {},
        errors: legacyState.errors || [],
        quality: legacyState.quality || null,
        modelConfig: legacyState.modelConfig || null,
        progress: legacyState.progress || { currentStepProgress: 0, overallProgress: 0 },
    };
}

export function convertFromLangGraphState(langGraphState: LangGraphVideoState): VideoGenerationState {
    return {
        messages: langGraphState.messages,
        userInput: langGraphState.userInput,
        contentType: langGraphState.contentType,
        analysisResult: langGraphState.analysisResult ? JSON.stringify(langGraphState.analysisResult) : undefined,
        plan: langGraphState.plan,
        completedSteps: langGraphState.completedSteps,
        currentStep: langGraphState.currentStep,
        nextSteps: langGraphState.nextSteps,
        story: langGraphState.story || undefined,
        script: langGraphState.script || undefined,
        characters: langGraphState.characters,
        characterImages: langGraphState.characterImages,
        locations: langGraphState.locations || undefined,
        scenes: langGraphState.scenes,
        sceneImages: langGraphState.sceneImages,
        generatedVideos: langGraphState.generatedVideos,
        voices: langGraphState.voices,
        finalVideo: langGraphState.finalVideo || undefined,
        startTime: langGraphState.startTime || undefined,
        stepTimings: langGraphState.stepTimings,
        errors: langGraphState.errors,
        quality: langGraphState.quality || undefined,
        modelConfig: langGraphState.modelConfig || undefined,
        progress: langGraphState.progress || undefined,
    };
}


