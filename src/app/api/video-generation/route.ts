import { NextRequest, NextResponse } from 'next/server';
import { processVideoGeneration } from '@/lib/video-generation-graph';

export async function POST(request: NextRequest) {
    try {
        const { userInput } = await request.json();

        if (!userInput || typeof userInput !== 'string') {
            return NextResponse.json({
                success: false,
                error: 'Invalid user input'
            }, { status: 400 });
        }

        const result = await processVideoGeneration(userInput);

        return NextResponse.json({
            success: true,
            result: {
                story: result.story,
                script: result.script,
                characters: result.characters,
                characterImages: result.characterImages,
                locations: result.locations,
                scenes: result.scenes,
                sceneImages: result.sceneImages,
                generatedVideos: result.generatedVideos,
                voices: result.voices,
                finalVideo: result.finalVideo,
                currentStep: result.currentStep
            }
        });
    } catch (error) {
        console.error('Video generation error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to generate video'
        }, { status: 500 });
    }
}
