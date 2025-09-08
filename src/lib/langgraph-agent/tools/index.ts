import { contentAnalyzerTool } from "./content-analyzer-tool";
import { characterImageTool, sceneImageTool } from "./image-generation-tool";
import { voiceGenerationTool, videoGenerationTool, videoAssemblyTool } from "./voice-generation-tool";
import { storyGeneratorTool } from "./story-generator-tool";
import { scriptWriterTool } from "./script-writer-tool";
import { characterDesignerTool } from "./character-designer-tool";
import { sceneGeneratorTool } from "./scene-generator-tool";

export {
    contentAnalyzerTool,
    characterImageTool,
    sceneImageTool,
    voiceGenerationTool,
    videoGenerationTool,
    videoAssemblyTool,
    storyGeneratorTool,
    scriptWriterTool,
    characterDesignerTool,
    sceneGeneratorTool,
};

export const ALL_TOOLS = {
    contentAnalyzer: contentAnalyzerTool,
    storyGenerator: storyGeneratorTool,
    scriptWriter: scriptWriterTool,
    characterDesigner: characterDesignerTool,
    sceneGenerator: sceneGeneratorTool,
    characterImage: characterImageTool,
    sceneImage: sceneImageTool,
    voiceGeneration: voiceGenerationTool,
    videoGeneration: videoGenerationTool,
    videoAssembly: videoAssemblyTool,
} as const;

export const TOOL_CATEGORIES = {
    CONTENT: ['contentAnalyzer', 'storyGenerator', 'scriptWriter'],
    CHARACTER: ['characterDesigner', 'characterImage'],
    SCENE: ['sceneGenerator', 'sceneImage'],
    MEDIA: ['voiceGeneration', 'videoGeneration', 'videoAssembly'],
} as const;

export type ToolName = keyof typeof ALL_TOOLS;


