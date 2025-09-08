import { BaseMessage } from "@langchain/core/messages";

/**
 * Content types for dynamic video generation
 */
export type ContentType =
    | 'single_character'  // One person talking, tutorial, vlog
    | 'storytelling'      // Grandmother telling story, narrative with narrator
    | 'multi_character'   // Short film with multiple characters, dialogue
    | 'unknown';          // To be determined by AI analysis

/**
 * Individual voice data for character voices
 */
export interface VoiceData {
    character: string;
    text: string;
    voice: string;
    audioDataUrl: string;
}

/**
 * Character design information
 */
export interface CharacterDesign {
    name: string;
    role: string;
    description: string;
    personality?: string;
    age?: string;
    appearance?: string;
}

/**
 * Scene information with metadata
 */
export interface SceneInfo {
    id: string;
    description: string;
    location?: string;
    characters?: string[];
    duration?: number;
    imageUrl?: string;
    videoUrl?: string;
    visualNotes?: string;
    cameraAngle?: string;
    lighting?: string;
}

/**
 * Generation plan step
 */
export interface PlanStep {
    id: string;
    name: string;
    description: string;
    required: boolean;
    dependencies?: string[];
    estimatedDuration?: number;
}

/**
 * Comprehensive state interface for LangGraph video generation workflow
 */
export interface VideoGenerationState {
    // Core LangGraph state
    messages: BaseMessage[];

    // Input and analysis
    userInput: string;
    contentType: ContentType;
    analysisResult?: string;

    // Planning and execution
    plan: PlanStep[];
    completedSteps: string[];
    currentStep: string;
    nextSteps: string[];

    // Generated content
    story?: string;
    script?: string;
    characters?: CharacterDesign[];
    characterImages?: { [key: string]: string };
    locations?: string;
    scenes?: SceneInfo[];
    sceneImages?: string[];
    generatedVideos?: string[];
    voices?: VoiceData[];
    finalVideo?: string;

    // Metadata
    startTime?: Date;
    stepTimings?: { [stepId: string]: { start: Date; end?: Date; duration?: number } };
    errors?: { step: string; error: string; timestamp: Date }[];
    quality?: {
        storyQuality?: number;
        scriptQuality?: number;
        characterConsistency?: number;
        overallRating?: number;
    };

    // Configuration
    modelConfig?: {
        storyModel?: string;
        scriptModel?: string;
        characterModel?: string;
        imageModel?: string;
        voiceModel?: string;
    };

    // Progress tracking
    progress?: {
        currentStepProgress: number;
        overallProgress: number;
        estimatedTimeRemaining?: number;
    };
}

/**
 * Tool execution result interface
 */
export interface ToolResult {
    success: boolean;
    data?: unknown;
    error?: string;
    stepId: string;
    duration: number;
}

/**
 * Content analysis result
 */
export interface ContentAnalysis {
    contentType: ContentType;
    complexity: 'simple' | 'medium' | 'complex';
    estimatedDuration: number;
    requiredSteps: string[];
    characterCount: number;
    locationCount: number;
    suggestedStyle: 'realistic' | 'animated' | 'documentary' | 'artistic';
    themes: string[];
    targetAudience: 'children' | 'family' | 'adult' | 'general';
}
