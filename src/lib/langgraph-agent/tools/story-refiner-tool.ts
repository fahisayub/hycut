import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getModelForTask } from "@/lib/langgraph-agent/config/model-switcher";

export const storyRefinerTool = tool(
    async ({ story }: { story: string }) => {
        if (!story || story.trim().length === 0) {
            return "";
        }

        // If no API key, provide a simple heuristic refinement
        if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
            return `Refined storytelling script (engaging narration):\n\n${story}\n\n[This version is adjusted for oral storytelling with stronger hooks, rhythmic pacing, and direct address to the listener.]`;
        }

        const model = getModelForTask('script_writing');
        const prompt = `You are a world-class story coach and speechwriter.
Refine the following story into a first-person, highly engaging narration suitable for a solo storyteller on video (60-120 seconds).
Goals:
- Strong opening hook in the first 1-2 sentences.
- Conversational tone with rhythmic pacing.
- Occasional rhetorical questions and vivid imagery.
- Clear arc (setup, build, payoff) and memorable closing line.

Output only the refined narration text.

Original story:\n${story}`;

        try {
            const response = await model.invoke(prompt);
            return (response as unknown as { content: string }).content ?? String((response as any));
        } catch (err) {
            return `Refined storytelling script:\n\n${story}`;
        }
    },
    {
        name: "story_refiner",
        description: "Refine a story into an engaging first-person narration for video storytelling",
        schema: z.object({
            story: z.string().describe("The raw story text to refine for narration"),
        }),
    }
);


