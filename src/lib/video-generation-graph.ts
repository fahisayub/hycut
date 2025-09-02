import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { generateCharacterImage, generateSceneImage } from "./image-generation";
import { generateCharacterConsistentVideo } from "./video-generation-service";
import { generateVoicesFromScript } from "./voice-generation";

// Enhanced state interface with images and videos
interface VideoGenerationState {
    messages: unknown[];
    currentStep: string;
    story?: string;
    script?: string;
    characters?: string;
    characterImages?: { [key: string]: string };
    locations?: string;
    scenes?: string;
    sceneImages?: string[];
    generatedVideos?: string[];
    voices?: { character: string; text: string; voice: string; audioDataUrl: string }[];
    finalVideo?: string;
}

// Helper function to get model based on task
function getModelForTask(provider: string, model: string, apiKey?: string) {
    if (provider === 'openai') {
        return new ChatOpenAI({
            model,
            apiKey,
            temperature: 0.7
        });
    } else if (provider === 'anthropic') {
        return new ChatAnthropic({
            model,
            apiKey,
            temperature: 0.7
        });
    } else {
        // Default to OpenAI
        return new ChatOpenAI({
            model: 'gpt-4o-mini',
            apiKey: process.env.OPENAI_API_KEY,
            temperature: 0.7
        });
    }
}

// Simplified sequential processing instead of complex graph
export async function processVideoGeneration(userInput: string): Promise<VideoGenerationState> {
    const state: VideoGenerationState = {
        messages: [],
        currentStep: 'story_generation',
    };

    try {
        // Step 1: Generate Story
        const storyModel = getModelForTask('openai', 'gpt-4o-mini', process.env.OPENAI_API_KEY);
        const storyPrompt = `Create a compelling short film story (<200 words) for: "${userInput}".`;
        const storyResponse = await storyModel.invoke(storyPrompt);
        state.story = storyResponse.content as string;
        state.currentStep = 'script_writing';

        // Step 2: Write Script
        const scriptModel = getModelForTask('openai', 'gpt-4o-mini', process.env.OPENAI_API_KEY);
        const scriptPrompt = `Write a concise 2-3 minute screenplay based on this story: "${state.story}".
Include scene headers, character names, and dialog.`;
        const scriptResponse = await scriptModel.invoke(scriptPrompt);
        state.script = scriptResponse.content as string;
        state.currentStep = 'voice_generation';

        // Step 3: Generate Voices
        state.voices = await generateVoicesFromScript(state.script || '', 8);

        // Step 4: Design Characters
        const characterModel = getModelForTask('openai', 'gpt-4o-mini', process.env.OPENAI_API_KEY);
        const characterPrompt = `From this script, list 2-3 main characters with Name, Role, Appearance in a simple list.
Script:\n${state.script}`;
        const characterResponse = await characterModel.invoke(characterPrompt);
        state.characters = characterResponse.content as string;
        state.currentStep = 'character_image_generation';

        // Step 3.5: Generate Character Images
        state.characterImages = {};
        const lines = (state.characters || '').split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines.slice(0, 3)) {
            // Expect format like: Name: Maya Chen; Role: Protagonist; Appearance: ...
            const nameMatch = /name\s*[:\-]\s*([^;]+)/i.exec(line);
            const roleMatch = /role\s*[:\-]\s*([^;]+)/i.exec(line);
            const appearanceMatch = /appearance\s*[:\-]\s*(.+)$/i.exec(line);
            const name = (nameMatch?.[1] || line.split(':')[0]).trim();
            const role = (roleMatch?.[1] || '').trim() || 'Character';
            const description = (appearanceMatch?.[1] || '').trim() || line;
            try {
                const url = await generateCharacterImage({ characterName: name, role, description });
                state.characterImages[name] = url;
            } catch {
                // ignore and continue
            }
        }
        state.currentStep = 'location_design';

        // Step 5: Design Locations
        const locationModel = getModelForTask('openai', 'gpt-4o-mini', process.env.OPENAI_API_KEY);
        const locationPrompt = `List key locations for this script with a sentence each.\nScript:\n${state.script}`;
        const locationResponse = await locationModel.invoke(locationPrompt);
        state.locations = locationResponse.content as string;
        state.currentStep = 'scene_generation';

        // Step 6: Generate Scenes
        const sceneModel = getModelForTask('openai', 'gpt-4o-mini', process.env.OPENAI_API_KEY);
        const scenePrompt = `Break down scenes for the film (Scene X: description) from this script:\n${state.script}`;
        const sceneResponse = await sceneModel.invoke(scenePrompt);
        state.scenes = sceneResponse.content as string;
        state.currentStep = 'scene_image_generation';

        // Step 6.5: Generate Scene Images
        state.sceneImages = [];
        const sceneLines = (state.scenes || '').split('\n').filter(l => /Scene\s*\d+/i.test(l));
        const firstCharacterUrl = Object.values(state.characterImages || {})[0];
        for (const s of sceneLines.slice(0, 3)) {
            try {
                const url = await generateSceneImage(s, firstCharacterUrl);
                state.sceneImages.push(url);
            } catch {
                // ignore
            }
        }
        state.currentStep = 'video_generation';

        // Step 6.6: Generate Videos for Each Scene
        state.generatedVideos = [];
        for (const s of sceneLines.slice(0, 3)) {
            try {
                const v = await generateCharacterConsistentVideo(firstCharacterUrl || '', s, 5);
                if (v.videoUrl) state.generatedVideos.push(v.videoUrl);
            } catch {
                // ignore
            }
        }
        state.currentStep = 'video_assembly';

        // Step 7: Assemble Video
        state.finalVideo = state.generatedVideos[0] || state.sceneImages?.[0] || state.script || '';
        state.currentStep = 'completed';

        return state;
    } catch (error) {
        console.error('Error in video generation:', error);
        throw error;
    }
}
