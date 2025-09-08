import { NextRequest, NextResponse } from 'next/server';
import { createVideoGenerationGraph } from '@/graph/video-generation';
import { convertFromLangGraphState, LangGraphVideoState } from '@/state/langgraph-state';

/**
 * 🔄 REAL-TIME STREAMING API FOR LANGGRAPH VIDEO GENERATION
 * 
 * This endpoint provides step-by-step real-time updates during video generation
 * using Server-Sent Events (SSE) for live frontend updates
 */

export async function POST(request: NextRequest) {
    const { userInput, preset = 'BALANCED' } = await request.json();

    if (!userInput || typeof userInput !== 'string') {
        return NextResponse.json({
            success: false,
            error: 'Invalid user input'
        }, { status: 400 });
    }

    // Create a ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            // Helper function to send SSE data
            const sendUpdate = (data: unknown) => {
                const message = `data: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(message));
            };

            try {
                console.log('🚀 Starting Real-Time LangGraph Video Generation...');
                console.log(`📝 User Input: ${userInput}`);
                console.log(`⚙️ Model Preset: ${preset}`);

                // Models will be initialized automatically by getModelForTask() in tools

                // Send initial status
                sendUpdate({
                    type: 'status',
                    message: 'Initializing LangGraph workflow...',
                    step: 'initialization',
                    timestamp: new Date().toISOString(),
                    thinking: 'Setting up the AI agent system and preparing for content analysis'
                });

                // Create and configure the graph for streaming
                const graph = createVideoGenerationGraph();

                // Initial state
                const initialState = {
                    userInput,
                    contentType: 'unknown' as const,
                    completedSteps: [],
                    currentStep: 'content_analysis',
                    startTime: new Date(),
                    errors: [],
                    progress: {
                        currentStepProgress: 0,
                        overallProgress: 0
                    }
                };

                // Send planning start
                sendUpdate({
                    type: 'step_start',
                    step: 'content_analysis',
                    message: '🎯 Analyzing your request and creating custom workflow...',
                    timestamp: new Date().toISOString(),
                    thinking: `Examining "${userInput}" to determine content type, complexity, and required workflow steps`,
                    progress: 5
                });

                // Use LangGraph streaming to get real-time updates
                let stepCounter = 0;
                const totalEstimatedSteps = 8; // Estimate based on typical workflow
                let finalResult: unknown = null;

                for await (const update of await graph.stream(initialState)) {
                    stepCounter++;
                    const progressPercent = Math.round((stepCounter / totalEstimatedSteps) * 100);

                    // Type the update object properly
                    const typedUpdate = update as Record<string, unknown>;

                    // Get the current step from the state
                    const currentStep = typedUpdate.currentStep as string || 'unknown';
                    const completedSteps = typedUpdate.completedSteps as string[] || [];
                    const lastCompletedStep = completedSteps[completedSteps.length - 1];

                    // 🔄 TOKEN-BY-TOKEN: Send partial content updates for real-time display
                    if (typedUpdate.story && typeof typedUpdate.story === 'string') {
                        sendUpdate({
                            type: 'content_update',
                            step: 'story_generation',
                            message: '📖 Story being generated...',
                            timestamp: new Date().toISOString(),
                            thinking: 'Creating compelling narrative with engaging characters and plot development',
                            progress: progressPercent,
                            data: { story: typedUpdate.story }
                        });
                    }

                    if (typedUpdate.script && typeof typedUpdate.script === 'string') {
                        sendUpdate({
                            type: 'content_update',
                            step: 'script_writing',
                            message: '📝 Script being written...',
                            timestamp: new Date().toISOString(),
                            thinking: 'Converting story into professional screenplay format',
                            progress: progressPercent,
                            data: { script: typedUpdate.script }
                        });
                    }

                    if (typedUpdate.characters && Array.isArray(typedUpdate.characters)) {
                        sendUpdate({
                            type: 'content_update',
                            step: 'character_design',
                            message: '👥 Characters being designed...',
                            timestamp: new Date().toISOString(),
                            thinking: 'Developing detailed character profiles and personalities',
                            progress: progressPercent,
                            data: { characters: typedUpdate.characters }
                        });
                    }

                    // Send step completion update
                    if (lastCompletedStep) {
                        const stepName = getStepDisplayName(lastCompletedStep);
                        const thinking = getStepThinking(lastCompletedStep, update);

                        sendUpdate({
                            type: 'step_complete',
                            step: lastCompletedStep,
                            stepName,
                            message: `✅ ${stepName} completed`,
                            timestamp: new Date().toISOString(),
                            thinking,
                            progress: progressPercent,
                            data: getStepData(lastCompletedStep, update)
                        });
                    }

                    // Send next step start if not completed
                    if (currentStep && currentStep !== 'completed') {
                        const nextStepName = getStepDisplayName(currentStep);
                        const nextThinking = getStepThinking(currentStep, update);

                        sendUpdate({
                            type: 'step_start',
                            step: currentStep,
                            stepName: nextStepName,
                            message: `🔄 Starting ${nextStepName}...`,
                            timestamp: new Date().toISOString(),
                            thinking: nextThinking,
                            progress: progressPercent
                        });
                    }

                    // Store the final result
                    finalResult = update;

                    // Add delay for better UX (optional)
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // Convert final state for API compatibility
                const legacyResult = finalResult ? convertFromLangGraphState(finalResult as LangGraphVideoState) : null;

                // Send completion
                sendUpdate({
                    type: 'complete',
                    message: '🎉 Video generation completed successfully!',
                    timestamp: new Date().toISOString(),
                    thinking: 'All workflow steps completed. Final video and content are ready for review.',
                    progress: 100,
                    result: legacyResult ? {
                        // Core content
                        story: legacyResult.story,
                        script: legacyResult.script,
                        characters: legacyResult.characters,
                        characterImages: legacyResult.characterImages,
                        locations: legacyResult.locations,
                        scenes: legacyResult.scenes,
                        sceneImages: legacyResult.sceneImages,
                        generatedVideos: legacyResult.generatedVideos,
                        voices: legacyResult.voices,
                        finalVideo: legacyResult.finalVideo,

                        // Workflow metadata
                        currentStep: legacyResult.currentStep,
                        contentType: legacyResult.contentType,
                        plan: legacyResult.plan,
                        completedSteps: legacyResult.completedSteps,
                        progress: legacyResult.progress,
                        errors: legacyResult.errors,

                        // Streaming metadata
                        workflow: 'langgraph-streaming',
                        version: '2.0.0',
                        modelPreset: preset,
                        processingTime: legacyResult.startTime
                    } : {
                        error: 'No final result available'
                    }
                });

            } catch (error) {
                console.error('❌ Streaming Video Generation Error:', error);

                sendUpdate({
                    type: 'error',
                    message: 'Video generation failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString(),
                    thinking: 'An error occurred during processing. The system will attempt to provide fallback content.',
                    workflow: 'langgraph-streaming',
                    version: '2.0.0'
                });
            } finally {
                controller.close();
            }
        }
    });

    // Return SSE response
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

/**
 * Get display-friendly step names
 */
function getStepDisplayName(stepId: string): string {
    const stepNames: Record<string, string> = {
        'content_analysis': '🎯 Content Analysis',
        'story_generation': '🎭 Story Generation',
        'script_writing': '📝 Script Writing',
        'character_design': '👥 Character Design',
        'character_image_generation': '🖼️ Character Images',
        'scene_generation': '🎬 Scene Planning',
        'scene_image_generation': '🌆 Scene Images',
        'media_generation': '🎨 Media Generation',
        'voice_generation': '🎵 Voice Generation',
        'video_generation': '🎥 Video Generation',
        'video_assembly': '🎞️ Final Assembly'
    };
    return stepNames[stepId] || stepId;
}

/**
 * Get thinking state messages for each step
 */
function getStepThinking(stepId: string, state: unknown): string {
    const s = state as Record<string, unknown>;
    const thinkingStates: Record<string, (state: Record<string, unknown>) => string> = {
        'content_analysis': () => `Analyzing input "${s.userInput}" to determine if this should be a single-character tutorial, storytelling narrative, or multi-character film`,
        'story_generation': (state) => `Creating a compelling ${state.contentType || 'story'} narrative with engaging characters and plot development`,
        'script_writing': (state) => `Converting the story into professional screenplay format with dialogue and scene directions for ${state.contentType || 'video'} production`,
        'character_design': (state) => `Developing detailed character profiles, personalities, and visual descriptions for ${(state.characters as unknown[])?.length || 'the'} characters`,
        'character_image_generation': (state) => `Generating visual representations for ${(state.characters as unknown[])?.length || 'the'} characters using AI image generation`,
        'scene_generation': () => `Breaking down the script into visual scenes with camera angles, lighting, and composition details`,
        'scene_image_generation': (state) => `Creating background images and visual assets for ${(state.scenes as unknown[])?.length || 'the'} scenes`,
        'media_generation': () => `Running parallel processes: character images + scene backgrounds + voice synthesis for optimal performance`,
        'voice_generation': () => `Synthesizing character voices and dialogue from the script using advanced text-to-speech`,
        'video_generation': () => `Creating video content by combining scenes, characters, and visual elements`,
        'video_assembly': () => `Compiling all generated content into the final video with transitions and effects`
    };

    const thinkingFn = thinkingStates[stepId];
    return thinkingFn ? thinkingFn(s) : `Processing ${stepId}...`;
}

/**
 * Extract relevant data for each step
 */
function getStepData(stepId: string, state: unknown): unknown {
    const s = state as Record<string, unknown>;
    switch (stepId) {
        case 'content_analysis':
            return {
                contentType: s.contentType,
                plan: s.plan
            };
        case 'story_generation':
            return {
                story: s.story // Send full story content
            };
        case 'script_writing':
            return {
                script: s.script // Send full script content
            };
        case 'character_design':
            return {
                characters: s.characters || []
            };
        case 'character_image_generation':
            return {
                characterImages: s.characterImages || {}
            };
        case 'scene_generation':
            return {
                scenes: s.scenes || [],
                locations: s.locations
            };
        case 'scene_image_generation':
            return {
                sceneImages: s.sceneImages || []
            };
        case 'voice_generation':
            return {
                voices: s.voices || []
            };
        case 'video_generation':
            return {
                generatedVideos: s.generatedVideos || [],
                finalVideo: s.finalVideo
            };
        default:
            return null;
    }
}
