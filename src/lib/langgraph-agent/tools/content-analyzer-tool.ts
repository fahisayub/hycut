import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getModelForTask } from "@/lib/langgraph-agent/config/model-switcher";
import { ContentAnalysis, ContentType, PlanStep } from "@/types/video-generation-state";

export const contentAnalyzerTool = tool(
    async ({ userInput }: { userInput: string }) => {
        try {
            if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
                console.warn('⚠️  No API keys found, using fallback analysis');
                return createFallbackAnalysis(userInput);
            }
            const model = getModelForTask('story_generation');
            const analysisPrompt = `
    Analyze this video generation request and provide a detailed analysis:
    
    User Input: "${userInput}"
    
    Determine:
    1. Content Type:
       - single_character: One person talking (tutorial, vlog, monologue, presentation)
       - storytelling: Narrative with narrator (documentary style)
       - multi_character: Multiple characters interacting (short film, dialogue)
    
    2. Complexity Level:
       - simple | medium | complex
    3. Requirements Analysis (characters, locations, duration, style, themes)
    4. Required Steps (select only what's needed)
    Return strict JSON as described previously.`;

            const response = await model.invoke(analysisPrompt);
            let analysisData;
            try {
                const content = response.content as string;
                const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
                const jsonString = jsonMatch ? jsonMatch[1] : content;
                analysisData = JSON.parse(jsonString);
            } catch (parseError) {
                console.warn('JSON parsing failed, attempting cleanup:', parseError);
                const content = response.content as string;
                const cleanContent = content.replace(/```json|```/g, '').trim();
                analysisData = JSON.parse(cleanContent);
            }

            return {
                contentType: analysisData.contentType as ContentType,
                analysis: analysisData.analysis as ContentAnalysis,
                plan: analysisData.plan as PlanStep[]
            };
        } catch (error) {
            console.error('Error in content analysis:', error);
            return createFallbackAnalysis(userInput);
        }
    },
    {
        name: "content_analyzer",
        description: "Analyze user input to determine content type and create execution plan for video generation",
        schema: z.object({
            userInput: z.string().describe("The user's video generation request to analyze"),
        }),
    }
);

function createFallbackAnalysis(userInput: string): {
    contentType: ContentType;
    analysis: ContentAnalysis;
    plan: PlanStep[];
} {
    const input = userInput.toLowerCase();
    let contentType: ContentType = 'unknown';
    if (input.includes('tutorial') || input.includes('explain') || input.includes('teach') || input.includes('vlog')) {
        contentType = 'single_character';
    } else if (input.includes('story') || input.includes('narrative')) {
        contentType = 'storytelling';
    } else if (input.includes('dialogue') || input.includes('film')) {
        contentType = 'multi_character';
    } else {
        contentType = input.length > 50 ? 'storytelling' : 'single_character';
    }
    const analysis: ContentAnalysis = {
        contentType,
        complexity: input.length > 100 ? 'complex' : input.length > 50 ? 'medium' : 'simple',
        estimatedDuration: Math.min(Math.max(30, input.length * 2), 180),
        requiredSteps: getDefaultStepsForContentType(contentType),
        characterCount: contentType === 'single_character' ? 1 : contentType === 'multi_character' ? 3 : 2,
        locationCount: contentType === 'single_character' ? 1 : 2,
        suggestedStyle: 'realistic',
        themes: extractThemesFromInput(userInput),
        targetAudience: 'general'
    };
    return {
        contentType,
        analysis,
        plan: createDefaultPlan(contentType, analysis)
    };
}

function getDefaultStepsForContentType(contentType: ContentType): string[] {
    const baseSteps = ['script_writing', 'video_generation', 'video_assembly'];
    switch (contentType) {
        case 'single_character':
            return ['story_generation', ...baseSteps, 'voice_generation'];
        case 'storytelling':
            return ['story_generation', ...baseSteps, 'character_design', 'scene_breakdown', 'scene_image_generation', 'voice_generation'];
        case 'multi_character':
            return ['story_generation', ...baseSteps, 'character_design', 'character_image_generation', 'location_design', 'scene_breakdown', 'scene_image_generation', 'voice_generation'];
        default:
            return baseSteps;
    }
}

function extractThemesFromInput(userInput: string): string[] {
    const themes: string[] = [];
    const input = userInput.toLowerCase();
    const themeKeywords = {
        'adventure': ['adventure', 'journey', 'quest', 'explore'],
        'friendship': ['friend', 'friendship', 'buddy', 'companion'],
        'family': ['family', 'parent', 'child', 'mother', 'father'],
        'love': ['love', 'romance', 'relationship', 'heart'],
        'mystery': ['mystery', 'secret', 'hidden', 'discover'],
        'comedy': ['funny', 'comedy', 'humor', 'laugh'],
        'drama': ['drama', 'emotional', 'conflict', 'struggle'],
        'education': ['learn', 'teach', 'education', 'tutorial'],
        'technology': ['tech', 'robot', 'ai', 'computer', 'digital'],
        'nature': ['nature', 'environment', 'animal', 'forest', 'ocean']
    } as const;
    for (const [theme, keywords] of Object.entries(themeKeywords)) {
        if (keywords.some(keyword => input.includes(keyword))) {
            themes.push(theme);
        }
    }
    return themes.length > 0 ? themes : ['general'];
}

function createDefaultPlan(contentType: ContentType, analysis: ContentAnalysis): PlanStep[] {
    const steps: PlanStep[] = [
        { id: 'content_analysis', name: 'Content Analysis', description: 'Analyze user input and create execution plan', required: true, dependencies: [], estimatedDuration: 5 }
    ];
    if (analysis.requiredSteps.includes('story_generation')) {
        steps.push({ id: 'story_generation', name: 'Story Generation', description: 'Generate story', required: true, dependencies: ['content_analysis'], estimatedDuration: 30 });
    }
    steps.push({ id: 'script_writing', name: 'Script Writing', description: 'Convert story into screenplay', required: true, dependencies: analysis.requiredSteps.includes('story_generation') ? ['story_generation'] : ['content_analysis'], estimatedDuration: 25 });
    if (analysis.requiredSteps.includes('character_design')) {
        steps.push({ id: 'character_design', name: 'Character Design', description: 'Design characters', required: true, dependencies: ['script_writing'], estimatedDuration: 20 });
    }
    if (analysis.requiredSteps.includes('character_image_generation')) {
        steps.push({ id: 'character_image_generation', name: 'Character Images', description: 'Generate character images', required: false, dependencies: ['character_design'], estimatedDuration: 45 });
    }
    if (analysis.requiredSteps.includes('scene_breakdown')) {
        steps.push({ id: 'scene_breakdown', name: 'Scene Planning', description: 'Break script into scenes', required: true, dependencies: ['script_writing'], estimatedDuration: 15 });
    }
    if (analysis.requiredSteps.includes('scene_image_generation')) {
        steps.push({ id: 'scene_image_generation', name: 'Scene Images', description: 'Generate scene images', required: false, dependencies: ['scene_breakdown'], estimatedDuration: 60 });
    }
    if (analysis.requiredSteps.includes('voice_generation')) {
        steps.push({ id: 'voice_generation', name: 'Voice Generation', description: 'Generate character voices', required: false, dependencies: ['script_writing'], estimatedDuration: 40 });
    }
    steps.push({ id: 'video_generation', name: 'Video Generation', description: 'Generate video content', required: true, dependencies: ['script_writing'], estimatedDuration: 120 });
    steps.push({ id: 'video_assembly', name: 'Final Assembly', description: 'Compile final video', required: true, dependencies: ['video_generation'], estimatedDuration: 30 });
    return steps;
}


