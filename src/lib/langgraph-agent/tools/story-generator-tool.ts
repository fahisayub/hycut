import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getModelForTask } from "@/config/model-switcher";
import { ContentType } from "@/types/video-generation-state";

export const storyGeneratorTool = tool(
    async ({ userInput, contentType }: { userInput: string; contentType: ContentType }) => {
        if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
            console.warn('⚠️  No API keys found, using fallback story');
            return createFallbackStory(userInput);
        }

        const model = getModelForTask('story_generation');
        const storyPrompt = createStoryPrompt(userInput, contentType);

        try {
            const response = await model.invoke(storyPrompt);
            return response.content as string;
        } catch (error) {
            console.error('Error generating story:', error);
            return createFallbackStory(userInput);
        }
    },
    {
        name: "story_generator",
        description: "Generate compelling story content based on user input and content type",
        schema: z.object({
            userInput: z.string().describe("The user's original video request"),
            contentType: z.enum(["single_character", "storytelling", "multi_character", "unknown"]).describe("The determined content type for the video"),
        }),
    }
);

function createStoryPrompt(userInput: string, contentType: ContentType): string {
    const baseContext = `User Request: "${userInput}"\nContent Type: ${contentType}\n`;
    switch (contentType) {
        case 'single_character':
            return `${baseContext}
        Create a compelling single-character story for a video where one person will be speaking directly.
        
        Guidelines:
        - Focus on one person's perspective, experience, or message
        - Structure as a monologue, tutorial, or personal narrative
        - Keep it engaging and suitable for video format
        - Target length: 1-2 minutes of spoken content
        - Include emotional hooks and clear beginning, middle, end
        
        Format: Write as a narrative story that can be easily adapted to script format.
        
        Story:`;
        case 'storytelling':
            return `${baseContext}
        Create a captivating story perfect for storytelling format (like a grandmother telling a story).
        
        Guidelines:
        - Classic storytelling structure with narrator
        - Engaging, family-friendly narrative
        - Rich descriptions that can be visualized
        - Include dialogue and character interactions
        - Build to a satisfying conclusion
        - Target length: 2-3 minutes
        - Consider the storytelling tradition (folklore, fables, family stories)
        
        Format: Write as a complete story with narrative voice and embedded dialogue.
        
        Story:`;
        case 'multi_character':
            return `${baseContext}
        Create a compelling short film story with multiple characters and interactions.
        
        Guidelines:
        - Multiple distinct characters with clear motivations
        - Character development and relationship dynamics
        - Conflict and resolution suitable for short format
        - Visual storytelling opportunities
        - Dialogue-driven scenes
        - Target length: 2-3 minutes
        - Clear three-act structure
        
        Format: Write as a story treatment that includes character interactions and plot development.
        
        Story:`;
        default:
            return `${baseContext}
        Create a compelling story based on the user's request.
        
        Guidelines:
        - Engaging narrative with clear structure
        - Suitable for video adaptation
        - Target length: 2-3 minutes
        - Include character development and visual elements
        - Build emotional connection with audience
        
        Story:`;
    }
}

function createFallbackStory(userInput: string): string {
    return `A compelling story about: ${userInput}

This is a story that explores the themes and ideas mentioned in your request. The narrative follows interesting characters as they navigate through challenges and discoveries.

In this tale, we see how the central concept of "${userInput}" unfolds through dramatic moments, character development, and meaningful interactions that drive the plot forward.

The story builds to a satisfying conclusion that resonates with the initial premise while providing entertainment and emotional engagement for the audience.`;
}


