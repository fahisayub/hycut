import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { generateCharacterImage, generateSceneImage } from "../util/image-generation";
import { CharacterDesign } from "@/types/video-generation-state";

export const characterImageTool = tool(
    async ({ characters }: { characters: CharacterDesign[] }) => {
        const characterImages: Record<string, string> = {};
        if (!characters || characters.length === 0) {
            console.warn('⚠️  No characters provided for image generation');
            return characterImages;
        }
        const charactersToProcess = characters.slice(0, 3);
        for (const character of charactersToProcess) {
            try {
                const imageUrl = await generateCharacterImage({
                    characterName: character.name,
                    role: character.role,
                    description: character.appearance || character.description
                });
                characterImages[character.name] = imageUrl;
                console.log(`✅ Generated image for character: ${character.name}`);
            } catch (error) {
                console.warn(`Failed to generate image for ${character.name}:`, error);
            }
        }
        return characterImages;
    },
    {
        name: "character_image_generator",
        description: "Generate visual character images from character designs",
        schema: z.object({
            characters: z.array(z.object({
                name: z.string(),
                role: z.string(),
                description: z.string(),
                appearance: z.string().optional(),
            })).describe("Array of character designs to generate images for"),
        }),
    }
);

export const sceneImageTool = tool(
    async ({
        scenes,
        characterImages
    }: {
        scenes: Array<{ id: string; description: string }>;
        characterImages?: Record<string, string>;
    }) => {
        const sceneImages: string[] = [];
        if (!scenes || scenes.length === 0) {
            console.warn('⚠️  No scenes provided for image generation');
            return sceneImages;
        }
        const firstCharacterUrl = characterImages ? Object.values(characterImages)[0] : undefined;
        const scenesToProcess = scenes.slice(0, 3);
        for (const scene of scenesToProcess) {
            try {
                const sceneImageUrl = await generateSceneImage(scene.description, firstCharacterUrl);
                sceneImages.push(sceneImageUrl);
                console.log(`✅ Generated scene image for: ${scene.id}`);
            } catch (error) {
                console.warn(`Failed to generate scene image for ${scene.id}:`, error);
            }
        }
        return sceneImages;
    },
    {
        name: "scene_image_generator",
        description: "Generate scene background images from scene descriptions",
        schema: z.object({
            scenes: z.array(z.object({
                id: z.string(),
                description: z.string(),
            })).describe("Array of scenes to generate images for"),
            characterImages: z.record(z.string()).optional().describe("Character images for scene consistency"),
        }),
    }
);


