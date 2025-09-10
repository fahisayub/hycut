import { StateGraph, END, START } from "@langchain/langgraph";
import { VideoGenerationStateAnnotation, type LangGraphVideoState } from "../state/langgraph-state";
import type { CharacterDesign } from "@/types/video-generation-state";
import {
    contentAnalyzerTool,
    storyGeneratorTool,
    storyRefinerTool,
    scriptWriterTool,
    characterDesignerTool,
    sceneGeneratorTool,
    characterImageTool,
    sceneImageTool,
    voiceGenerationTool,
    videoAssemblyTool,
    voiceImageVideoCombinerTool,
    multiVoiceImageVideoCombinerTool,
} from "../tools";

/**
 * Complete LangGraph implementation of the video generation workflow
 * This replaces the manual sequential processing with proper StateGraph orchestration
 */

// ============================================================================
// NODE FUNCTIONS (LangGraph Nodes that use our tools)
// ============================================================================

async function contentAnalysisNode(state: LangGraphVideoState): Promise<Partial<LangGraphVideoState>> {
    console.log('🎯 LangGraph Node: Content Analysis');

    try {
        const result = await contentAnalyzerTool.invoke({
            userInput: state.userInput
        });

        return {
            contentType: result.contentType,
            analysisResult: result.analysis,
            plan: result.plan,
            completedSteps: [...state.completedSteps, 'content_analysis'],
            currentStep: 'story_generation',
            startTime: new Date(),
            stepTimings: {
                ...state.stepTimings,
                content_analysis: {
                    start: new Date(),
                    end: new Date(),
                    duration: 0
                }
            }
        };
    } catch (error) {
        console.error('❌ Content Analysis Node Error:', error);
        return {
            errors: [
                ...state.errors,
                {
                    step: 'content_analysis',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date()
                }
            ]
        };
    }
}

async function storyGenerationNode(state: LangGraphVideoState): Promise<Partial<LangGraphVideoState>> {
    console.log('🎭 LangGraph Node: Story Generation');

    try {
        const story = await storyGeneratorTool.invoke({
            userInput: state.userInput,
            contentType: state.contentType
        });
        console.log(story);
        return {
            story,
            completedSteps: [...state.completedSteps, 'story_generation'],
            currentStep: 'script_writing'
        };
    } catch (error) {
        console.error('❌ Story Generation Node Error:', error);
        return {
            story: `A compelling story about: ${state.userInput}`,
            errors: [
                ...state.errors,
                {
                    step: 'story_generation',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date()
                }
            ]
        };
    }
}

async function scriptWritingNode(state: LangGraphVideoState): Promise<Partial<LangGraphVideoState>> {
    console.log('📝 LangGraph Node: Script Writing');

    try {
        const script = await scriptWriterTool.invoke({
            userInput: state.userInput,
            story: state.story || undefined,
            contentType: state.contentType
        });
        console.log(script);
        return {
            script,
            completedSteps: [...state.completedSteps, 'script_writing'],
            currentStep: 'character_design'
        };
    } catch (error) {
        console.error('❌ Script Writing Node Error:', error);
        return {
            script: `TITLE: ${state.userInput}\n\nA script based on: ${state.story || state.userInput}`,
            errors: [
                ...state.errors,
                {
                    step: 'script_writing',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date()
                }
            ]
        };
    }
}

async function characterDesignNode(state: LangGraphVideoState): Promise<Partial<LangGraphVideoState>> {
    console.log('👥 LangGraph Node: Character Design');

    try {
        const characters = await characterDesignerTool.invoke({
            userInput: state.userInput,
            script: state.script || undefined,
            contentType: state.contentType
        });
        console.log(characters);
        return {
            characters,
            completedSteps: [...state.completedSteps, 'character_design'],
            currentStep: 'scene_generation'
        };
    } catch (error) {
        console.error('❌ Character Design Node Error:', error);
        return {
            characters: [{ name: 'Main Character', role: 'Protagonist', description: 'The main character' }],
            errors: [
                ...state.errors,
                {
                    step: 'character_design',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date()
                }
            ]
        };
    }
}

async function sceneGenerationNode(state: LangGraphVideoState): Promise<Partial<LangGraphVideoState>> {
    console.log('🎬 LangGraph Node: Scene Generation');

    try {
        const scenes = await sceneGeneratorTool.invoke({
            script: state.script || '',
            contentType: state.contentType,
            characters: state.characters,
            locations: state.locations || undefined
        });
        console.log(scenes);
        return {
            scenes,
            completedSteps: [...state.completedSteps, 'scene_generation'],
            currentStep: 'media_generation'
        };
    } catch (error) {
        console.error('❌ Scene Generation Node Error:', error);
        return {
            scenes: [],
            errors: [
                ...state.errors,
                {
                    step: 'scene_generation',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date()
                }
            ]
        };
    }
}

async function mediaGenerationNode(state: LangGraphVideoState): Promise<Partial<LangGraphVideoState>> {
    console.log('🎨 LangGraph Node: Media Generation (Parallel)');

    try {
        const [characterImages, sceneImages, voices] = await Promise.all([
            state.characters.length > 0
                ? characterImageTool.invoke({ characters: state.characters })
                : Promise.resolve({}),
            state.scenes.length > 0
                ? sceneImageTool.invoke({
                    scenes: state.scenes,
                    characterImages: state.characterImages
                })
                : Promise.resolve([]),
            state.script
                ? voiceGenerationTool.invoke({ script: state.script })
                : Promise.resolve([])
        ]);

        return {
            characterImages: { ...state.characterImages, ...characterImages },
            sceneImages: [...state.sceneImages, ...sceneImages],
            voices,
            completedSteps: [...state.completedSteps, 'media_generation'],
            currentStep: 'video_generation'
        };
    } catch (error) {
        console.error('❌ Media Generation Node Error:', error);
        return {
            errors: [
                ...state.errors,
                {
                    step: 'media_generation',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date()
                }
            ]
        };
    }
}

async function videoGenerationNode(state: LangGraphVideoState): Promise<Partial<LangGraphVideoState>> {
    console.log('🎥 LangGraph Node: Video Generation (Voice + Image Combiner)');

    try {
        const generatedVideos: string[] = [];

        // Check if we have voices and images to combine
        if (state.voices && state.voices.length > 0 && state.sceneImages && state.sceneImages.length > 0) {
            console.log(`🎬 Combining ${state.voices.length} voice segments with ${state.sceneImages.length} images`);

            // Use multi-voice combiner if we have multiple voices
            if (state.voices.length > 1) {
                const result = await multiVoiceImageVideoCombinerTool.invoke({
                    voiceSegments: state.voices,
                    imageUrls: state.sceneImages.slice(0, state.voices.length), // Match voice count
                    outputFileName: `combined_video_${Date.now()}.mp4`,
                    transitionDuration: 0.5
                });

                if (result.success && result.videoUrl) {
                    generatedVideos.push(result.videoUrl);
                    console.log(`✅ Multi-voice video created: ${result.videoUrl}`);
                }
            } else {
                // Use single voice combiner for one voice segment
                const result = await voiceImageVideoCombinerTool.invoke({
                    voiceData: state.voices[0],
                    imageUrls: state.sceneImages,
                    outputFileName: `single_voice_video_${Date.now()}.mp4`,
                    createSlideshow: state.sceneImages.length > 1,
                    imageDuration: 3
                });

                if (result.success && result.videoUrl) {
                    generatedVideos.push(result.videoUrl);
                    console.log(`✅ Single voice video created: ${result.videoUrl}`);
                }
            }
        } else if (state.voices && state.voices.length > 0 && state.characterImages && Object.keys(state.characterImages).length > 0) {
            // Fallback: use character images if no scene images
            console.log('🎭 Using character images as fallback for video generation');

            const characterImageUrls = Object.values(state.characterImages);
            const result = await voiceImageVideoCombinerTool.invoke({
                voiceData: state.voices[0],
                imageUrls: characterImageUrls,
                outputFileName: `character_video_${Date.now()}.mp4`,
                createSlideshow: characterImageUrls.length > 1,
                imageDuration: 3
            });

            if (result.success && result.videoUrl) {
                generatedVideos.push(result.videoUrl);
                console.log(`✅ Character video created: ${result.videoUrl}`);
            }
        } else {
            console.warn('⚠️  No voices or images available for video generation');
        }

        return {
            generatedVideos: [...state.generatedVideos, ...generatedVideos],
            completedSteps: [...state.completedSteps, 'video_generation'],
            currentStep: 'video_assembly'
        };
    } catch (error) {
        console.error('❌ Video Generation Node Error:', error);
        return {
            errors: [
                ...state.errors,
                {
                    step: 'video_generation',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date()
                }
            ]
        };
    }
}

async function videoAssemblyNode(state: LangGraphVideoState): Promise<Partial<LangGraphVideoState>> {
    console.log('🎞️ LangGraph Node: Final Assembly');

    try {
        // If we have generated videos from the combiner, use the first one as final
        if (state.generatedVideos && state.generatedVideos.length > 0) {
            const finalVideo = state.generatedVideos[0];
            console.log(`✅ Final video ready: ${finalVideo}`);

            return {
                finalVideo,
                completedSteps: [...state.completedSteps, 'video_assembly'],
                currentStep: 'completed',
                progress: {
                    currentStepProgress: 100,
                    overallProgress: 100,
                    estimatedTimeRemaining: 0
                }
            };
        }

        // Fallback to original assembly tool if no videos were generated
        const finalVideo = await videoAssemblyTool.invoke({
            generatedVideos: state.generatedVideos,
            sceneImages: state.sceneImages,
            script: state.script || undefined,
            finalVideo: state.finalVideo || undefined
        });

        return {
            finalVideo,
            completedSteps: [...state.completedSteps, 'video_assembly'],
            currentStep: 'completed',
            progress: {
                currentStepProgress: 100,
                overallProgress: 100,
                estimatedTimeRemaining: 0
            }
        };
    } catch (error) {
        console.error('❌ Video Assembly Node Error:', error);
        return {
            finalVideo: state.generatedVideos?.[0] || state.script || 'Video generation completed with errors',
            errors: [
                ...state.errors,
                {
                    step: 'video_assembly',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date()
                }
            ]
        };
    }
}

// ============================================================================
// CONDITIONAL ROUTING FUNCTIONS
// ============================================================================

function shouldGenerateStory(state: LangGraphVideoState): string {
    const needsStory = state.plan.some(step => step.id === 'story_generation') ||
        ['storytelling', 'multi_character'].includes(state.contentType);

    return needsStory ? 'story_generation' : 'script_writing';
}

function shouldGenerateCharacters(state: LangGraphVideoState): string {
    const needsCharacters = state.plan.some(step => step.id === 'character_design') ||
        ['storytelling', 'multi_character'].includes(state.contentType);

    return needsCharacters ? 'character_design' : 'scene_generation';
}

function shouldGenerateScenes(state: LangGraphVideoState): string {
    const needsScenes = state.contentType !== 'single_character' ||
        (state.script && state.script.length > 500);

    return needsScenes ? 'scene_generation' : 'media_generation';
}

// ============================================================================
// MAIN WORKFLOW GRAPH CONSTRUCTION
// ============================================================================

/**
 * Creates the complete LangGraph workflow for video generation
 */
export function createVideoGenerationGraph() {
    console.log('🏗️ Building LangGraph Video Generation Workflow...');

    const workflow = new StateGraph(VideoGenerationStateAnnotation)

        .addNode("content_analysis", contentAnalysisNode)
        .addNode("story_generation", storyGenerationNode)
        .addNode("script_writing", scriptWritingNode)
        .addNode("character_design", characterDesignNode)
        .addNode("scene_generation", sceneGenerationNode)
        .addNode("media_generation", mediaGenerationNode)
        .addNode("video_generation", videoGenerationNode)
        .addNode("video_assembly", videoAssemblyNode)

        .addEdge(START, "content_analysis")

        .addConditionalEdges(
            "content_analysis",
            shouldGenerateStory,
            {
                "story_generation": "story_generation",
                "script_writing": "script_writing"
            }
        )

        .addEdge("story_generation", "script_writing")

        .addConditionalEdges(
            "script_writing",
            shouldGenerateCharacters,
            {
                "character_design": "character_design",
                "scene_generation": "scene_generation"
            }
        )

        .addConditionalEdges(
            "character_design",
            shouldGenerateScenes,
            {
                "scene_generation": "scene_generation",
                "media_generation": "media_generation"
            }
        )

        .addEdge("scene_generation", "media_generation")
        .addEdge("media_generation", "video_generation")
        .addEdge("video_generation", "video_assembly")
        .addEdge("video_assembly", END);

    const compiledGraph = workflow.compile();

    console.log('✅ LangGraph Video Generation Workflow Ready!');
    console.log(compiledGraph);
    return compiledGraph;
}

/**
 * Convenience function to process video generation using LangGraph
 */
export async function processVideoGenerationWithLangGraph(userInput: string): Promise<LangGraphVideoState> {
    console.log('🚀 Starting LangGraph Video Generation Workflow...');

    const graph = createVideoGenerationGraph();

    const initialState: Partial<LangGraphVideoState> = {
        userInput,
        contentType: 'unknown',
        completedSteps: [],
        currentStep: 'content_analysis',
        startTime: new Date(),
        errors: [],
        progress: {
            currentStepProgress: 0,
            overallProgress: 0
        }
    };

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const finalState = await graph.invoke(initialState as any);
        console.log('✅ LangGraph Video Generation Completed!');
        return finalState;
    } catch (error) {
        console.error('❌ LangGraph Video Generation Failed:', error);
        throw error;
    }
}

// ============================================================================
// SIMPLE STORY PIPELINE (story -> refine -> audio -> character -> compose)
// ============================================================================

async function simpleStoryNode(state: LangGraphVideoState): Promise<Partial<LangGraphVideoState>> {
    const story = await storyGeneratorTool.invoke({
        userInput: state.userInput,
        contentType: 'storytelling',
    });
    return {
        story: String(story),
        completedSteps: [...state.completedSteps, 'story_generation'],
        currentStep: 'story_refine',
    };
}

async function simpleRefineNode(state: LangGraphVideoState): Promise<Partial<LangGraphVideoState>> {
    const refined = await storyRefinerTool.invoke({ story: state.story || '' });
    return {
        script: String(refined),
        completedSteps: [...state.completedSteps, 'story_refine'],
        currentStep: 'voice_generation',
    };
}

async function simpleVoiceNode(state: LangGraphVideoState): Promise<Partial<LangGraphVideoState>> {
    const voices = await voiceGenerationTool.invoke({ script: state.script || '' });
    return {
        voices: Array.isArray(voices) ? voices : [],
        completedSteps: [...state.completedSteps, 'voice_generation'],
        currentStep: 'character_image_generation',
    };
}

async function simpleCharacterImageNode(state: LangGraphVideoState): Promise<Partial<LangGraphVideoState>> {
    const narrator: CharacterDesign = {
        name: 'Narrator',
        role: 'Storyteller',
        description: 'A friendly, trustworthy narrator speaking directly to camera',
        appearance: 'Warm lighting, clear facial features, approachable style',
    };
    const images = await characterImageTool.invoke({ characters: [narrator] });
    return {
        characters: [narrator],
        characterImages: images || {},
        completedSteps: [...state.completedSteps, 'character_image_generation'],
        currentStep: 'compose_output',
    };
}

async function simpleComposeNode(state: LangGraphVideoState): Promise<Partial<LangGraphVideoState>> {
    console.log('🎬 Simple Compose Node: Creating video from voice and character image');

    try {
        // Use the video combiner to create a video from voice and character image
        if (state.voices && state.voices.length > 0 && state.characterImages && Object.keys(state.characterImages).length > 0) {
            const characterImageUrls = Object.values(state.characterImages);
            const result = await voiceImageVideoCombinerTool.invoke({
                voiceData: state.voices[0],
                imageUrls: characterImageUrls[0], // Use first character image
                outputFileName: `story_video_${Date.now()}.mp4`,
                createSlideshow: false
            });

            if (result.success && result.videoUrl) {
                console.log(`✅ Story video created: ${result.videoUrl}`);
                return {
                    finalVideo: result.videoUrl,
                    completedSteps: [...state.completedSteps, 'compose_output'],
                    currentStep: 'completed',
                };
            }
        }

        // Fallback to original assembly
        const assembled = await videoAssemblyTool.invoke({
            generatedVideos: state.generatedVideos,
            sceneImages: state.sceneImages,
            script: state.script || undefined,
            finalVideo: state.finalVideo || undefined,
        });

        return {
            finalVideo: typeof assembled === 'string' ? assembled : state.finalVideo || null,
            completedSteps: [...state.completedSteps, 'compose_output'],
            currentStep: 'completed',
        };
    } catch (error) {
        console.error('❌ Simple Compose Node Error:', error);
        return {
            finalVideo: state.script || 'Video generation completed with errors',
            completedSteps: [...state.completedSteps, 'compose_output'],
            currentStep: 'completed',
            errors: [
                ...state.errors,
                {
                    step: 'compose_output',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date()
                }
            ]
        };
    }
}

export function createSimpleStoryGraph() {
    const workflow = new StateGraph(VideoGenerationStateAnnotation)
        .addNode('story_generation', simpleStoryNode)
        .addNode('story_refine', simpleRefineNode)
        .addNode('voice_generation', simpleVoiceNode)
        .addNode('character_image_generation', simpleCharacterImageNode)
        .addNode('compose_output', simpleComposeNode)
        .addEdge(START, 'story_generation')
        .addEdge('story_generation', 'story_refine')
        .addEdge('story_refine', 'voice_generation')
        .addEdge('voice_generation', 'character_image_generation')
        .addEdge('character_image_generation', 'compose_output')
        .addEdge('compose_output', END);

    return workflow.compile();
}


