import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getModelForTask } from "@/lib/langgraph-agent/config/model-switcher";
import { SceneInfo, ContentType, CharacterDesign } from "@/types/video-generation-state";

export const sceneGeneratorTool = tool(
    async ({
        script,
        contentType,
        characters,
        locations
    }: {
        script: string;
        contentType: ContentType;
        characters?: CharacterDesign[];
        locations?: string;
    }) => {
        if (!script) {
            throw new Error('Script is required for scene generation');
        }
        const model = getModelForTask('scene_generation');
        const scenePrompt = createScenePrompt(script, contentType, characters, locations);
        try {
            const response = await model.invoke(scenePrompt);
            const scenes = parseSceneResponse(response.content as string);
            return scenes;
        } catch (error) {
            console.error('Error generating scenes:', error);
            return createFallbackScenes(script, contentType);
        }
    },
    {
        name: "scene_generator",
        description: "Generate detailed scene breakdown from script with visual and timing information",
        schema: z.object({
            script: z.string().describe("The script to break down into scenes"),
            contentType: z.enum(["single_character", "storytelling", "multi_character", "unknown"]).describe("Content type for scene formatting"),
            characters: z.array(z.object({
                name: z.string(),
                role: z.string(),
                description: z.string(),
            })).optional().describe("Character information for scene planning"),
            locations: z.string().optional().describe("Location information for scene setup"),
        }),
    }
);

function createScenePrompt(
    script: string,
    contentType: ContentType,
    characters?: CharacterDesign[],
    locations?: string
): string {
    const characterContext = characters && characters.length > 0
        ? `\nCharacters: ${characters.map(c => `${c.name} (${c.role}): ${c.description}`).join(', ')}\n`
        : '';
    const locationContext = locations
        ? `\nLocations: ${locations}\n`
        : '';
    switch (contentType) {
        case 'single_character':
            return `${characterContext}${locationContext}
        Break down this single-character script into visual scenes:
        
        Script: "${script}"
        
        Guidelines:
        - Focus on visual variety within single-character format
        - Consider camera angles and shots
        - Include close-ups, medium shots, wide shots
        - Plan for visual interest and engagement
        - Each scene should be 10-30 seconds
        - Include visual transitions
        
        Return JSON array of scenes.`;
        case 'storytelling':
            return `${characterContext}${locationContext}
        Break down this storytelling script into visual scenes:
        
        Script: "${script}"
        
        Guidelines:
        - Mix narrator shots with story visualization
        - Show story scenes as narrator describes them
        - Include both narrator and story characters
        - Plan for smooth transitions between narration and story
        - Each scene should be 15-45 seconds
        - Consider both realistic and stylized visuals
        
        Return JSON array of scenes with both narration and story visuals.`;
        case 'multi_character':
            return `${characterContext}${locationContext}
        Break down this multi-character script into cinematic scenes:
        
        Script: "${script}"
        
        Guidelines:
        - Each scene should advance the story
        - Include character interactions and dialogue
        - Plan for multiple camera angles
        - Consider establishing shots and close-ups
        - Each scene should be 20-60 seconds
        - Include action and emotional beats
        
        Return JSON array of scenes with full cinematic breakdown.`;
        default:
            return `${characterContext}${locationContext}
        Break down this script into visual scenes:
        
        Script: "${script}"
        
        Return JSON array of scenes with descriptions, characters, and visual notes.`;
    }
}

function parseSceneResponse(response: string): SceneInfo[] {
    try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const scenes = JSON.parse(jsonMatch[0]);
            return scenes.map((scene: Record<string, unknown>, index: number) => ({
                id: (scene as any).id || `scene_${index + 1}`,
                description: (scene as any).description || `Scene ${index + 1}`,
                location: (scene as any).location || 'Unspecified location',
                characters: Array.isArray((scene as any).characters) ? (scene as any).characters as string[] : ['Main Character'],
                duration: typeof (scene as any).duration === 'number' ? (scene as any).duration : 30,
                visualNotes: (scene as any).visualNotes || 'Standard shot composition',
                cameraAngle: (scene as any).cameraAngle || 'Eye level',
                lighting: (scene as any).lighting || 'Natural lighting'
            }));
        }
        return parseSceneResponseFallback(response);
    } catch (error) {
        console.error('Error parsing scene response:', error);
        return parseSceneResponseFallback(response);
    }
}

function parseSceneResponseFallback(response: string): SceneInfo[] {
    const lines = response.split('\n').filter(line => line.trim());
    const scenes: SceneInfo[] = [];
    let currentScene: Partial<SceneInfo> = {};
    let sceneIndex = 1;
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().includes('scene') || trimmed.includes('SCENE')) {
            if (currentScene.description) {
                scenes.push(finalizeScene(currentScene, sceneIndex));
                sceneIndex++;
            }
            currentScene = {
                id: `scene_${sceneIndex}`,
                description: trimmed.replace(/scene\s*\d*:?\s*/i, '').trim()
            };
        } else if (trimmed.length > 10) {
            if (!currentScene.description) {
                currentScene = {
                    id: `scene_${sceneIndex}`,
                    description: trimmed
                };
            }
        }
    }
    if (currentScene.description) {
        scenes.push(finalizeScene(currentScene, sceneIndex));
    }
    return scenes.length > 0 ? scenes : createFallbackScenes('', 'unknown');
}

function finalizeScene(scene: Partial<SceneInfo>, index: number): SceneInfo {
    return {
        id: scene.id || `scene_${index}`,
        description: scene.description || `Scene ${index}`,
        location: scene.location || 'Unspecified location',
        characters: (scene.characters as string[]) || ['Main Character'],
        duration: (scene.duration as number) || 30,
        visualNotes: (scene.visualNotes as string) || 'Standard composition',
        cameraAngle: (scene.cameraAngle as string) || 'Eye level',
        lighting: (scene.lighting as string) || 'Natural lighting'
    };
}

function createFallbackScenes(script: string, contentType: ContentType): SceneInfo[] {
    const wordCount = script.split(' ').length;
    const estimatedDuration = Math.max(30, Math.min(180, wordCount / 3));
    const sceneCount = Math.ceil(estimatedDuration / 45);
    const scenes: SceneInfo[] = [];
    for (let i = 1; i <= sceneCount; i++) {
        scenes.push({
            id: `scene_${i}`,
            description: `Scene ${i}: Part of the narrative based on the script`,
            location: contentType === 'single_character' ? 'Simple background' : `Location ${i}`,
            characters: ['Main Character'],
            duration: Math.floor(estimatedDuration / sceneCount),
            visualNotes: `Visual representation of scene ${i} content`,
            cameraAngle: 'Eye level',
            lighting: 'Natural lighting'
        });
    }
    return scenes;
}


