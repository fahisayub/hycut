import { GoogleGenAI, GenerateVideosParameters } from '@google/genai';

export interface VideoGenerationRequest {
    prompt: string;
    characterImageUrl?: string;
    sceneDescription: string;
    duration?: number; // seconds
    style?: string;
}

export interface VideoGenerationResult {
    videoUrl: string;
    duration: number;
    prompt: string;
}

interface GoogleVideoRef { video: { uri: string } }
interface GoogleOperation {
    done?: boolean;
    error?: { message?: string } | null;
    response?: { generatedVideos?: GoogleVideoRef[] } | null;
}
interface GoogleOperationArg { operation: GoogleOperation }

interface RunwayStatusOutputItem { video?: string }
interface RunwayStatus {
    state: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
    output?: RunwayStatusOutputItem | RunwayStatusOutputItem[];
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Google Veo 2
async function generateWithGoogle(request: VideoGenerationRequest): Promise<string> {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.API_KEY;
    if (!apiKey) throw new Error('Missing GOOGLE_API_KEY');
    const ai = new GoogleGenAI({ vertexai: false, apiKey });

    const model = process.env.VIDEO_MODEL || 'veo-2.0-generate-001';

    const config: GenerateVideosParameters = {
        model,
        prompt: `${request.prompt}\nScene: ${request.sceneDescription}\nStyle: ${request.style || 'cinematic, filmic, character-consistent'}`,
        config: { numberOfVideos: 1 },
    };

    let operation = (await ai.models.generateVideos(config)) as unknown as GoogleOperation;
    if (operation.done && operation.error) {
        const msg = operation.error.message || 'Google Veo operation failed';
        throw new Error(msg);
    }
    for (let i = 0; i < 120 && !operation.done; i++) {
        await sleep(2000);
        const arg: GoogleOperationArg = { operation };
        operation = (await ai.operations.getVideosOperation(arg as unknown as Parameters<typeof ai.operations.getVideosOperation>[0])) as unknown as GoogleOperation;
        if (operation.done && operation.error) {
            const msg = operation.error.message || 'Google Veo operation failed';
            throw new Error(msg);
        }
    }
    const videos = operation.response?.generatedVideos;
    if (!videos || videos.length === 0) throw new Error('No videos generated');
    const first = videos[0]?.video?.uri;
    if (!first) throw new Error('Google response missing video uri');
    const url = decodeURIComponent(first);
    return url;
}

// Runway Gen-3 (dev)
async function generateWithRunway(request: VideoGenerationRequest): Promise<string> {
    const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;
    if (!RUNWAY_API_KEY) throw new Error('Missing RUNWAY_API_KEY');
    const duration = request.duration || 5;
    const model = process.env.RUNWAY_MODEL || 'gen3a';
    const versionHeader = { 'X-Runway-Version': '2024-09-18' };

    const createRes = await fetch('https://api.dev.runwayml.com/v1/tasks', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RUNWAY_API_KEY}`, 'Content-Type': 'application/json', ...versionHeader },
        body: JSON.stringify({
            model,
            input: {
                prompt: `${request.prompt}\nScene: ${request.sceneDescription}\nStyle: ${request.style || 'cinematic, filmic, character-consistent'}`,
                duration,
            },
        }),
    });
    if (!createRes.ok) throw new Error(`Runway create failed: ${createRes.status} ${await createRes.text()}`);
    const { id } = await createRes.json() as { id: string };

    for (let i = 0; i < 60; i++) {
        await sleep(4000);
        const statusRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${id}`, { headers: { 'Authorization': `Bearer ${RUNWAY_API_KEY}`, ...versionHeader } });
        if (!statusRes.ok) continue;
        const statusJson = await statusRes.json() as RunwayStatus;
        if (statusJson.state === 'SUCCEEDED') {
            const out = Array.isArray(statusJson.output)
                ? (statusJson.output.find((o) => !!o.video)?.video || '')
                : (statusJson.output?.video || '');
            if (!out) throw new Error('Runway missing video URL');
            return out;
        }
        if (statusJson.state === 'FAILED' || statusJson.state === 'CANCELLED') throw new Error(`Runway task ${statusJson.state}`);
    }
    throw new Error('Runway timeout');
}

// Replicate fallback (best-effort)
async function generateWithReplicate(request: VideoGenerationRequest): Promise<string> {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) throw new Error('Missing REPLICATE_API_TOKEN');
    const res = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: 'a25f2b5a-7b8f-4f78-8d33-51e2bbf0b3a0', input: { prompt: request.prompt } }),
    });
    if (!res.ok) throw new Error(`Replicate create failed: ${res.status}`);
    const { id } = await res.json() as { id: string };
    for (let i = 0; i < 60; i++) {
        await sleep(4000);
        const statusRes = await fetch(`https://api.replicate.com/v1/predictions/${id}`, { headers: { 'Authorization': `Token ${token}` } });
        if (!statusRes.ok) continue;
        const status = await statusRes.json() as { status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'; output?: string | string[] };
        if (status.status === 'succeeded') {
            const out = Array.isArray(status.output)
                ? (status.output.find((u) => typeof u === 'string' && u.endsWith('.mp4')) || '')
                : (typeof status.output === 'string' ? status.output : '');
            if (!out) throw new Error('Replicate missing video URL');
            return out;
        }
        if (status.status === 'failed' || status.status === 'canceled') throw new Error(`Replicate task ${status.status}`);
    }
    throw new Error('Replicate timeout');
}

export async function generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResult> {
    const provider = (process.env.VIDEO_PROVIDER || 'google').toLowerCase();
    const duration = request.duration || 5;

    try {
        let url = '';
        if (provider === 'google') url = await generateWithGoogle(request);
        else if (provider === 'runway') url = await generateWithRunway(request);
        else if (provider === 'replicate') url = await generateWithReplicate(request);
        else url = await generateWithGoogle(request);

        return { videoUrl: url, duration, prompt: request.prompt };
    } catch (err) {
        console.error('Video generation error:', err);
        return { videoUrl: '', duration, prompt: request.prompt };
    }
}

export async function generateCharacterConsistentVideo(
    characterImageUrl: string,
    sceneDescription: string,
    duration: number = 5
): Promise<VideoGenerationResult> {
    const prompt = `Generate a cinematic video scene featuring a main character.
The character should match the reference image (appearance and clothing) consistently.
Avoid text overlays, logos, gore, violence, or sensitive content.`;
    return generateVideo({ prompt, characterImageUrl, sceneDescription, duration, style: 'Character-consistent, cinematic, high-quality' });
}

/**
 * Interface for voice-image video combination
 */
export interface VoiceImageVideoRequest {
    voiceData: {
        character: string;
        text: string;
        voice: string;
        audioDataUrl: string;
    };
    imageUrls: string | string[];
    outputFileName?: string;
    imageDuration?: number;
    createSlideshow?: boolean;
}

/**
 * Interface for multi-voice-image video combination
 */
export interface MultiVoiceImageVideoRequest {
    voiceSegments: Array<{
        character: string;
        text: string;
        voice: string;
        audioDataUrl: string;
    }>;
    imageUrls: string[];
    outputFileName?: string;
    transitionDuration?: number;
}

/**
 * Combines voice audio with images to create a video using FFmpeg
 * This function provides a direct interface to the video combiner functionality
 */
export async function combineVoiceAndImageVideo(request: VoiceImageVideoRequest): Promise<{
    success: boolean;
    videoUrl?: string;
    duration?: number;
    fileName?: string;
    error?: string;
}> {
    try {
        // Import the video combiner tool dynamically to avoid circular dependencies
        const { voiceImageVideoCombinerTool } = await import('../tools/video-combiner-tool');

        // Execute the tool with the provided parameters
        const result = await voiceImageVideoCombinerTool.invoke({
            voiceData: request.voiceData,
            imageUrls: request.imageUrls,
            outputFileName: request.outputFileName,
            imageDuration: request.imageDuration,
            createSlideshow: request.createSlideshow
        });

        return result as {
            success: boolean;
            videoUrl?: string;
            duration?: number;
            fileName?: string;
            error?: string;
        };
    } catch (error) {
        console.error('Error in combineVoiceAndImageVideo:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}

/**
 * Combines multiple voice segments with corresponding images to create a single video
 */
export async function combineMultiVoiceImageVideo(request: MultiVoiceImageVideoRequest): Promise<{
    success: boolean;
    videoUrl?: string;
    fileName?: string;
    segmentCount?: number;
    error?: string;
}> {
    try {
        // Import the multi-voice video combiner tool dynamically
        const { multiVoiceImageVideoCombinerTool } = await import('../tools/video-combiner-tool');

        // Execute the tool with the provided parameters
        const result = await multiVoiceImageVideoCombinerTool.invoke({
            voiceSegments: request.voiceSegments,
            imageUrls: request.imageUrls,
            outputFileName: request.outputFileName,
            transitionDuration: request.transitionDuration
        });

        return result as {
            success: boolean;
            videoUrl?: string;
            fileName?: string;
            segmentCount?: number;
            error?: string;
        };
    } catch (error) {
        console.error('Error in combineMultiVoiceImageVideo:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}