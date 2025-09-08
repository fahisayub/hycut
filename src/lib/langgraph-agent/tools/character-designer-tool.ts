import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getModelForTask } from "../config/model-switcher";
import { CharacterDesign, ContentType } from "@/types/video-generation-state";

export const characterDesignerTool = tool(
    async ({ userInput, script, contentType }: { userInput: string; script?: string; contentType: ContentType }) => {
        if (!script) {
            console.warn('⚠️  No script available for character design, creating default characters');
            return createDefaultCharacters(userInput);
        }
        if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
            console.warn('⚠️  No API keys found, using basic character extraction');
            const basicCharacters = extractBasicCharactersFromScript(script);
            return basicCharacters.length > 0 ? basicCharacters : createDefaultCharacters(userInput);
        }
        const scriptCharacters = extractBasicCharactersFromScript(script);
        if (scriptCharacters.length === 0) {
            console.log('📋 No characters found in script, creating default character');
            return createDefaultCharacters(userInput);
        }
        const model = getModelForTask('character_design');
        try {
            const enhancedCharacters: CharacterDesign[] = [];
            for (const char of scriptCharacters) {
                const characterPrompt = createCharacterDesignPrompt(char, userInput, contentType);
                const response = await model.invoke(characterPrompt);
                try {
                    const characterData = JSON.parse(response.content as string);
                    enhancedCharacters.push({
                        name: char.name,
                        role: char.role,
                        description: characterData.description || char.description,
                        personality: characterData.personality || 'Engaging and well-developed',
                        age: characterData.age,
                        appearance: characterData.appearance || 'Visually appealing and appropriate for the story'
                    });
                } catch {
                    enhancedCharacters.push({
                        name: char.name,
                        role: char.role,
                        description: response.content as string,
                        personality: 'Engaging and well-developed character',
                        appearance: 'Visually appealing and appropriate for the story'
                    });
                }
            }
            return enhancedCharacters;
        } catch (error) {
            console.error('Error enhancing character designs:', error);
            return scriptCharacters;
        }
    },
    {
        name: "character_designer",
        description: "Design and develop detailed characters based on script and content type",
        schema: z.object({
            userInput: z.string().describe("The user's original video request"),
            script: z.string().optional().describe("The script to extract and enhance characters from"),
            contentType: z.enum(["single_character", "storytelling", "multi_character", "unknown"]).describe("The content type to guide character development"),
        }),
    }
);

function extractBasicCharactersFromScript(script: string): CharacterDesign[] {
    const characters: CharacterDesign[] = [];
    const lines = script.split('\n');
    const characterNames = new Set<string>();
    for (const line of lines) {
        const trimmed = line.trim();
        const characterMatch = trimmed.match(/^([A-Z][A-Z\s\-']{0,30})$/);
        if (characterMatch) {
            const name = characterMatch[1].trim();
            const scriptTerms = ['FADE IN', 'FADE OUT', 'CUT TO', 'SCENE', 'ACT', 'END', 'INT', 'EXT'];
            if (!scriptTerms.includes(name) && name.length > 1 && name.length < 25) {
                characterNames.add(name);
            }
        }
        const dialogueMatch = trimmed.match(/^([A-Z][A-Z\s\-']{0,30}):/);
        if (dialogueMatch) {
            const name = dialogueMatch[1].trim();
            characterNames.add(name);
        }
    }
    Array.from(characterNames).forEach((name, index) => {
        const role = index === 0 ? 'Protagonist' : `Supporting Character ${index}`;
        characters.push({
            name,
            role,
            description: `Character appearing in the script with dialogue and interactions`,
            personality: 'To be developed based on script context',
            appearance: 'To be designed for visual consistency'
        });
    });
    return characters;
}

function createCharacterDesignPrompt(character: CharacterDesign, userInput: string, contentType: ContentType): string {
    return `
    Enhance this character design for a ${contentType} video about: "${userInput}"
    
    Current Character:
    Name: ${character.name}
    Role: ${character.role}
    Basic Description: ${character.description}
    
    Please provide enhanced character details in JSON format:
    {
      "description": "Detailed character background and personality",
      "personality": "Key personality traits and characteristics",
      "age": "Age range or specific age",
      "appearance": "Physical description suitable for visual generation"
    }
    
    Guidelines:
    - Make the character compelling and three-dimensional
    - Ensure consistency with the ${contentType} format
    - Include visual details suitable for image/video generation
    - Keep descriptions family-friendly and appropriate
    - Consider the character's role in the story context
  `;
}

function createDefaultCharacters(userInput: string): CharacterDesign[] {
    return [{
        name: 'Main Character',
        role: 'Protagonist',
        description: `The central character in the story about ${userInput}`,
        personality: 'Determined, curious, and engaging',
        appearance: 'Professional and approachable appearance suitable for the story context'
    }];
}


