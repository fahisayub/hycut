import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getModelForTask } from "@/config/model-switcher";
import { ContentType } from "@/types/video-generation-state";

export const scriptWriterTool = tool(
    async ({ userInput, story, contentType }: { userInput: string; story?: string; contentType: ContentType }) => {
        if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
            console.warn('⚠️  No API keys found, using fallback script');
            return createFallbackScript(userInput, story);
        }
        const model = getModelForTask('script_writing');
        const scriptPrompt = createScriptPrompt(userInput, story, contentType);
        try {
            const response = await model.invoke(scriptPrompt);
            return response.content as string;
        } catch (error) {
            console.error('Error generating script:', error);
            return createFallbackScript(userInput, story);
        }
    },
    {
        name: "script_writer",
        description: "Generate screenplay/script based on story and content type for video production",
        schema: z.object({
            userInput: z.string().describe("The user's original video request"),
            story: z.string().optional().describe("The generated story to adapt into script format"),
            contentType: z.enum(["single_character", "storytelling", "multi_character", "unknown"]).describe("The content type for script formatting"),
        }),
    }
);

function createScriptPrompt(userInput: string, story: string | undefined, contentType: ContentType): string {
    const baseContext = `User Request: "${userInput}"\nContent Type: ${contentType}\n${story ? `Story: "${story}"\n` : ''}`;
    switch (contentType) {
        case 'single_character':
            return `${baseContext}
        Create a single-character video script perfect for one person speaking to camera.
        
        Guidelines:
        - Direct address to audience or camera
        - Clear, engaging monologue structure
        - Include stage directions for gestures and expressions
        - Format for easy teleprompter reading
        - Target duration: 1-2 minutes
        - Include natural pauses and emphasis cues
        - Structure: Hook → Main Content → Conclusion
        
        Format: Professional script format with:
        - CHARACTER NAME (SPEAKING TO CAMERA)
        - Clear dialogue with natural flow
        - Minimal but effective stage directions
        - Visual cues and timing notes
        
        Script:`;
        case 'storytelling':
            return `${baseContext}
        Create a storytelling script that combines narrator voice with story visualization.
        
        Guidelines:
        - Mix of narrator speaking and story scenes
        - Rich descriptive language for visualization
        - Character voices within the story
        - Natural storytelling rhythm and pacing
        - Target duration: 2-3 minutes
        - Include both spoken and visual elements
        - Structure: Setup → Story Development → Resolution
        
        Format: Screenplay format with:
        - NARRATOR (voice-over and on-camera)
        - CHARACTER dialogue within story
        - Scene descriptions for visualization
        - Transition cues between narrator and story
        
        Script:`;
        case 'multi_character':
            return `${baseContext}
        Create a multi-character short film script with dialogue and interactions.
        
        Guidelines:
        - Multiple distinct character voices
        - Natural dialogue and character development
        - Clear scene structure and transitions
        - Visual storytelling through action
        - Target duration: 2-3 minutes
        - Include conflict and resolution
        - Structure: Setup → Conflict → Resolution
        
        Format: Standard screenplay format with:
        - Scene headings (INT./EXT. LOCATION - TIME)
        - Character names and dialogue
        - Action lines and stage directions
        - Camera and editing notes where helpful
        
        Script:`;
        default:
            return `${baseContext}
        Create a video script based on the provided content.
        
        Guidelines:
        - Clear structure appropriate for video format
        - Engaging dialogue and visual elements
        - Target duration: 2-3 minutes
        - Include character interactions as needed
        - Professional script formatting
        
        Script:`;
    }
}

function createFallbackScript(userInput: string, story?: string): string {
    return `TITLE: ${userInput}

FADE IN:

EXT. SETTING - DAY

A scene unfolds based on the concept: "${userInput}"

${story ? `Based on the story: ${story.substring(0, 200)}...` : 'The narrative develops naturally from the initial premise.'}

CHARACTER
This is where the main character would speak and develop the story further.

The script continues with dialogue and action that brings the concept to life through visual storytelling.

FADE OUT.

THE END`;
}


