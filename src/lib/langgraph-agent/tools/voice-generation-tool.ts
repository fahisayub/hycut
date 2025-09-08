import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { generateVoicesFromScript } from "@/lib/util/voice-generation";
import { VoiceData } from "@/types/video-generation-state";

export const voiceGenerationTool = tool(
    async ({ script, maxLines = 8 }: { script: string; maxLines?: number }) => {
        if (!script) {
            console.warn('⚠️  No script provided for voice generation');
            return [];
        }
        try {
            const voices: VoiceData[] = await generateVoicesFromScript(script, maxLines);
            console.log(`✅ Generated ${voices.length} voice lines from script`);
            return voices;
        } catch (error) {
            console.error('Error generating voices:', error);
            return [];
        }
    },
    {
        name: "voice_generator",
        description: "Generate character voices and audio from script dialogue",
        schema: z.object({
            script: z.string().describe("The script containing dialogue to convert to speech"),
            maxLines: z.number().optional().default(8).describe("Maximum number of dialogue lines to process"),
        }),
    }
);

export const videoGenerationTool = tool(
    async ({
        scenes,
        characterImages
    }: {
        scenes: Array<{ id: string; description: string; duration?: number }>;
        characterImages?: Record<string, string>;
    }) => {
        const generatedVideos: string[] = [];
        if (!scenes || scenes.length === 0) {
            console.warn('⚠️  No scenes provided for video generation');
            return generatedVideos;
        }
        try {
            const { generateCharacterConsistentVideo } = await import('@/lib/util/video-generation-service');
            const firstCharacterUrl = characterImages ? Object.values(characterImages)[0] : '';
            const scenesToProcess = scenes.slice(0, 3);
            for (const scene of scenesToProcess) {
                try {
                    const videoResult = await generateCharacterConsistentVideo(
                        firstCharacterUrl,
                        scene.description,
                        scene.duration || 5
                    );
                    if (videoResult.videoUrl) {
                        generatedVideos.push(videoResult.videoUrl);
                        console.log(`✅ Generated video for scene: ${scene.id}`);
                    }
                } catch (error) {
                    console.warn(`Failed to generate video for scene ${scene.id}:`, error);
                }
            }
            return generatedVideos;
        } catch (error) {
            console.error('Error in video generation tool:', error);
            return [];
        }
    },
    {
        name: "video_generator",
        description: "Generate video content from scene descriptions and character images",
        schema: z.object({
            scenes: z.array(z.object({
                id: z.string(),
                description: z.string(),
                duration: z.number().optional(),
            })).describe("Array of scenes to generate videos for"),
            characterImages: z.record(z.string()).optional().describe("Character images for video consistency"),
        }),
    }
);

export const videoAssemblyTool = tool(
    async ({
        generatedVideos,
        sceneImages,
        script,
        finalVideo
    }: {
        generatedVideos?: string[];
        sceneImages?: string[];
        script?: string;
        finalVideo?: string;
    }) => {
        const result = finalVideo ||
            (generatedVideos && generatedVideos.length > 0 ? generatedVideos[0] : null) ||
            (sceneImages && sceneImages.length > 0 ? sceneImages[0] : null) ||
            script ||
            'Video generation completed';
        console.log('✅ Video assembly completed');
        return result;
    },
    {
        name: "video_assembler",
        description: "Assemble final video from generated content",
        schema: z.object({
            generatedVideos: z.array(z.string()).optional().describe("Generated video URLs"),
            sceneImages: z.array(z.string()).optional().describe("Generated scene images"),
            script: z.string().optional().describe("Script content as fallback"),
            finalVideo: z.string().optional().describe("Pre-existing final video"),
        }),
    }
);


