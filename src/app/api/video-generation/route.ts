import { NextRequest, NextResponse } from 'next/server';
import { processVideoGenerationWithLangGraph } from '@/lib/langgraph-agent/graph/video-generation';
import { convertFromLangGraphState } from '@/lib/langgraph-agent/state/langgraph-state';
import { initializeLangGraphModels } from '@/lib/langgraph-agent/graph/model-binding';

/**
 * 🚀 COMPLETE LANGGRAPH API INTEGRATION
 * This API now uses 100% LangGraph implementation with:
 * - StateGraph workflow orchestration
 * - LangGraph tool system
 * - Native model binding and fallbacks
 * - Parallel processing capabilities
 * - Advanced error handling and state management
 */

export async function POST(request: NextRequest) {
    try {
        const { userInput, preset = 'BALANCED' } = await request.json();

        if (!userInput || typeof userInput !== 'string') {
            return NextResponse.json({
                success: false,
                error: 'Invalid user input'
            }, { status: 400 });
        }

        console.log('🎬 Starting LangGraph Video Generation API...');
        console.log(`📝 User Input: ${userInput}`);
        console.log(`⚙️ Model Preset: ${preset}`);

        // Initialize LangGraph model system with chosen preset
        initializeLangGraphModels(preset as 'FAST' | 'BALANCED' | 'QUALITY');

        // Process video generation using complete LangGraph workflow
        const langGraphResult = await processVideoGenerationWithLangGraph(userInput);

        // Convert LangGraph state back to legacy format for API compatibility
        const legacyResult = convertFromLangGraphState(langGraphResult);

        console.log('✅ LangGraph Video Generation API Completed!');
        console.log(`📊 Final State: ${legacyResult.currentStep}`);
        console.log(`🎯 Completed Steps: ${legacyResult.completedSteps.join(', ')}`);

        return NextResponse.json({
            success: true,
            result: {
                // Core content
                story: legacyResult.story,
                script: legacyResult.script,
                characters: legacyResult.characters,
                characterImages: legacyResult.characterImages,
                locations: legacyResult.locations,
                scenes: legacyResult.scenes,
                sceneImages: legacyResult.sceneImages,
                generatedVideos: legacyResult.generatedVideos,
                voices: legacyResult.voices,
                finalVideo: legacyResult.finalVideo,

                // Workflow metadata  
                currentStep: legacyResult.currentStep,
                contentType: legacyResult.contentType,
                plan: legacyResult.plan,
                completedSteps: legacyResult.completedSteps,
                progress: legacyResult.progress,
                errors: legacyResult.errors,

                // LangGraph metadata (new)
                workflow: 'langgraph',
                version: '2.0.0',
                modelPreset: preset,
                processingTime: legacyResult.startTime
                    ? new Date().getTime() - legacyResult.startTime.getTime()
                    : undefined,
                stepTimings: legacyResult.stepTimings
            }
        });

    } catch (error) {
        console.error('❌ LangGraph Video Generation Error:', error);

        return NextResponse.json({
            success: false,
            error: 'Failed to generate video with LangGraph',
            details: error instanceof Error ? error.message : 'Unknown error',
            workflow: 'langgraph',
            version: '2.0.0'
        }, { status: 500 });
    }
}
