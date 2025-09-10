import { tool } from "@langchain/core/tools";
import { z } from "zod";
import ffmpeg from "fluent-ffmpeg";
import { promises as fs } from "fs";
import path from "path";
import { VoiceData } from "@/types/video-generation-state";

/**
 * Interface for video combination result
 */
interface VideoCombinationResult {
    success: boolean;
    videoUrl?: string;
    error?: string;
    duration?: number;
}

/**
 * Downloads a file from URL to local filesystem
 */
async function downloadFile(url: string, filePath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(buffer));
}

/**
 * Creates a temporary directory for processing files
 */
async function createTempDir(): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp', `video-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
}

/**
 * Cleans up temporary files
 */
async function cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
        try {
            await fs.unlink(filePath);
        } catch (error) {
            console.warn(`Failed to delete temp file ${filePath}:`, error);
        }
    }
}

/**
 * Combines voice audio with images to create a video
 */
async function combineVoiceAndImage(
    voiceData: VoiceData,
    imageUrl: string,
    outputPath: string,
    duration?: number
): Promise<VideoCombinationResult> {
    const tempDir = await createTempDir();
    const tempFiles: string[] = [];

    try {
        // Download voice audio file
        const audioPath = path.join(tempDir, 'audio.wav');
        await downloadFile(voiceData.audioDataUrl, audioPath);
        tempFiles.push(audioPath);

        // Download image file
        const imagePath = path.join(tempDir, 'image.jpg');
        await downloadFile(imageUrl, imagePath);
        tempFiles.push(imagePath);

        // Get audio duration if not provided
        const audioDuration = duration || await new Promise<number>((resolve, reject) => {
            ffmpeg.ffprobe(audioPath, (err, metadata) => {
                if (err) reject(err);
                else resolve(metadata.format.duration || 0);
            });
        });

        // Create video using FFmpeg
        await new Promise<void>((resolve, reject) => {
            ffmpeg()
                .input(imagePath)
                .input(audioPath)
                .inputOptions(['-loop 1', '-t', audioDuration.toString()])
                .outputOptions([
                    '-c:v libx264',
                    '-tune stillimage',
                    '-c:a aac',
                    '-b:a 192k',
                    '-pix_fmt yuv420p',
                    '-shortest'
                ])
                .output(outputPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
        });

        return {
            success: true,
            videoUrl: outputPath,
            duration: audioDuration
        };

    } catch (error) {
        console.error('Error combining voice and image:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    } finally {
        // Clean up temporary files
        await cleanupTempFiles(tempFiles);
        try {
            await fs.rmdir(tempDir);
        } catch (error) {
            console.warn(`Failed to delete temp directory ${tempDir}:`, error);
        }
    }
}

/**
 * Creates a slideshow video from multiple images with voice narration
 */
async function createSlideshowVideo(
    voiceData: VoiceData,
    imageUrls: string[],
    outputPath: string,
    imageDuration?: number
): Promise<VideoCombinationResult> {
    const tempDir = await createTempDir();
    const tempFiles: string[] = [];

    try {
        // Download voice audio file
        const audioPath = path.join(tempDir, 'audio.wav');
        await downloadFile(voiceData.audioDataUrl, audioPath);
        tempFiles.push(audioPath);

        // Download all images
        const imagePaths: string[] = [];
        for (let i = 0; i < imageUrls.length; i++) {
            const imagePath = path.join(tempDir, `image_${i}.jpg`);
            await downloadFile(imageUrls[i], imagePath);
            imagePaths.push(imagePath);
            tempFiles.push(imagePath);
        }

        // Get audio duration
        const audioDuration = await new Promise<number>((resolve, reject) => {
            ffmpeg.ffprobe(audioPath, (err, metadata) => {
                if (err) reject(err);
                else resolve(metadata.format.duration || 0);
            });
        });

        // Calculate duration per image
        const durationPerImage = imageDuration || (audioDuration / imageUrls.length);

        // Create slideshow video
        await new Promise<void>((resolve, reject) => {
            let command = ffmpeg();

            // Add all images with duration
            imagePaths.forEach(imagePath => {
                command = command.input(imagePath);
            });

            command
                .input(audioPath)
                .complexFilter([
                    // Create slideshow from images
                    ...imagePaths.map((_, i) =>
                        `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[img${i}]`
                    ),
                    // Concatenate images with timing
                    ...imagePaths.map((_, i) =>
                        `[img${i}]trim=duration=${durationPerImage},setpts=PTS-STARTPTS[trim${i}]`
                    ),
                    // Concatenate all trimmed images
                    `[trim0]${imagePaths.slice(1).map((_, i) => `[trim${i + 1}]`).join('')}concat=n=${imagePaths.length}:v=1:a=0[outv]`
                ])
                .outputOptions([
                    '-map [outv]',
                    '-map 1:a',
                    '-c:v libx264',
                    '-c:a aac',
                    '-b:a 192k',
                    '-pix_fmt yuv420p',
                    '-shortest'
                ])
                .output(outputPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
        });

        return {
            success: true,
            videoUrl: outputPath,
            duration: audioDuration
        };

    } catch (error) {
        console.error('Error creating slideshow video:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    } finally {
        // Clean up temporary files
        await cleanupTempFiles(tempFiles);
        try {
            await fs.rmdir(tempDir);
        } catch (error) {
            console.warn(`Failed to delete temp directory ${tempDir}:`, error);
        }
    }
}

/**
 * Tool to combine voice audio with images to create videos
 */
export const voiceImageVideoCombinerTool = tool(
    async ({
        voiceData,
        imageUrls,
        outputFileName,
        imageDuration,
        createSlideshow = false
    }: {
        voiceData: VoiceData;
        imageUrls: string | string[];
        outputFileName?: string;
        imageDuration?: number;
        createSlideshow?: boolean;
    }) => {
        if (!voiceData || !voiceData.audioDataUrl) {
            console.warn('⚠️  No voice data provided for video combination');
            return { success: false, error: 'No voice data provided' };
        }

        if (!imageUrls || (Array.isArray(imageUrls) && imageUrls.length === 0)) {
            console.warn('⚠️  No images provided for video combination');
            return { success: false, error: 'No images provided' };
        }

        try {
            // Ensure output directory exists
            const outputDir = path.join(process.cwd(), 'public', 'generated-videos');
            await fs.mkdir(outputDir, { recursive: true });

            // Generate output filename
            const timestamp = Date.now();
            const fileName = outputFileName || `video_${voiceData.character}_${timestamp}.mp4`;
            const outputPath = path.join(outputDir, fileName);

            let result: VideoCombinationResult;

            if (createSlideshow && Array.isArray(imageUrls)) {
                // Create slideshow video
                result = await createSlideshowVideo(voiceData, imageUrls, outputPath, imageDuration);
            } else {
                // Single image video
                const singleImageUrl = Array.isArray(imageUrls) ? imageUrls[0] : imageUrls;
                result = await combineVoiceAndImage(voiceData, singleImageUrl, outputPath, imageDuration);
            }

            if (result.success) {
                console.log(`✅ Successfully created video: ${fileName}`);
                console.log(`📁 Video saved to: ${outputPath}`);
                console.log(`⏱️  Duration: ${result.duration?.toFixed(2)}s`);

                // Return public URL for web access
                const publicUrl = `/generated-videos/${fileName}`;
                return {
                    success: true,
                    videoUrl: publicUrl,
                    duration: result.duration,
                    fileName: fileName
                };
            } else {
                console.error('❌ Failed to create video:', result.error);
                return result;
            }

        } catch (error) {
            console.error('Error in voice-image video combiner tool:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    },
    {
        name: "voice_image_video_combiner",
        description: "Combine AI-generated voice audio with images to create videos using FFmpeg",
        schema: z.object({
            voiceData: z.object({
                character: z.string(),
                text: z.string(),
                voice: z.string(),
                audioDataUrl: z.string(),
            }).describe("Voice data containing audio URL and metadata"),
            imageUrls: z.union([
                z.string(),
                z.array(z.string())
            ]).describe("Single image URL or array of image URLs for slideshow"),
            outputFileName: z.string().optional().describe("Custom filename for the output video"),
            imageDuration: z.number().optional().describe("Duration for each image in slideshow mode (seconds)"),
            createSlideshow: z.boolean().optional().default(false).describe("Whether to create a slideshow from multiple images"),
        }),
    }
);

/**
 * Tool to combine multiple voice segments with corresponding images
 */
export const multiVoiceImageVideoCombinerTool = tool(
    async ({
        voiceSegments,
        imageUrls,
        outputFileName,
        transitionDuration = 0.5
    }: {
        voiceSegments: VoiceData[];
        imageUrls: string[];
        outputFileName?: string;
        transitionDuration?: number;
    }) => {
        if (!voiceSegments || voiceSegments.length === 0) {
            console.warn('⚠️  No voice segments provided');
            return { success: false, error: 'No voice segments provided' };
        }

        if (!imageUrls || imageUrls.length === 0) {
            console.warn('⚠️  No images provided');
            return { success: false, error: 'No images provided' };
        }

        if (voiceSegments.length !== imageUrls.length) {
            console.warn('⚠️  Voice segments and images count mismatch');
            return { success: false, error: 'Voice segments and images count must match' };
        }

        try {
            // Ensure output directory exists
            const outputDir = path.join(process.cwd(), 'public', 'generated-videos');
            await fs.mkdir(outputDir, { recursive: true });

            // Generate output filename
            const timestamp = Date.now();
            const fileName = outputFileName || `multi_video_${timestamp}.mp4`;
            const outputPath = path.join(outputDir, fileName);

            const tempDir = await createTempDir();
            const tempFiles: string[] = [];

            try {
                // Download all voice segments and images
                const audioPaths: string[] = [];
                const imagePaths: string[] = [];

                for (let i = 0; i < voiceSegments.length; i++) {
                    // Download audio
                    const audioPath = path.join(tempDir, `audio_${i}.wav`);
                    await downloadFile(voiceSegments[i].audioDataUrl, audioPath);
                    audioPaths.push(audioPath);
                    tempFiles.push(audioPath);

                    // Download image
                    const imagePath = path.join(tempDir, `image_${i}.jpg`);
                    await downloadFile(imageUrls[i], imagePath);
                    imagePaths.push(imagePath);
                    tempFiles.push(imagePath);
                }

                // Create concatenated video
                await new Promise<void>((resolve, reject) => {
                    let command = ffmpeg();

                    // Add all inputs
                    audioPaths.forEach(audioPath => command = command.input(audioPath));
                    imagePaths.forEach(imagePath => command = command.input(imagePath));

                    command
                        .complexFilter([
                            // Process each image
                            ...imagePaths.map((_, i) =>
                                `[${i + voiceSegments.length}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[img${i}]`
                            ),
                            // Process each audio
                            ...audioPaths.map((_, i) =>
                                `[${i}:a]atrim=duration=0,asetpts=PTS-STARTPTS[audio${i}]`
                            ),
                            // Concatenate videos
                            `[img0]${imagePaths.slice(1).map((_, i) => `[img${i + 1}]`).join('')}concat=n=${imagePaths.length}:v=1:a=0[outv]`,
                            // Concatenate audios
                            `[audio0]${audioPaths.slice(1).map((_, i) => `[audio${i + 1}]`).join('')}concat=n=${audioPaths.length}:v=0:a=1[outa]`
                        ])
                        .outputOptions([
                            '-map [outv]',
                            '-map [outa]',
                            '-c:v libx264',
                            '-c:a aac',
                            '-b:a 192k',
                            '-pix_fmt yuv420p'
                        ])
                        .output(outputPath)
                        .on('end', () => resolve())
                        .on('error', (err) => reject(err))
                        .run();
                });

                console.log(`✅ Successfully created multi-segment video: ${fileName}`);
                console.log(`📁 Video saved to: ${outputPath}`);

                // Return public URL for web access
                const publicUrl = `/generated-videos/${fileName}`;
                return {
                    success: true,
                    videoUrl: publicUrl,
                    fileName: fileName,
                    segmentCount: voiceSegments.length
                };

            } finally {
                // Clean up temporary files
                await cleanupTempFiles(tempFiles);
                try {
                    await fs.rmdir(tempDir);
                } catch (error) {
                    console.warn(`Failed to delete temp directory ${tempDir}:`, error);
                }
            }

        } catch (error) {
            console.error('Error in multi-voice-image video combiner tool:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    },
    {
        name: "multi_voice_image_video_combiner",
        description: "Combine multiple voice segments with corresponding images to create a single video",
        schema: z.object({
            voiceSegments: z.array(z.object({
                character: z.string(),
                text: z.string(),
                voice: z.string(),
                audioDataUrl: z.string(),
            })).describe("Array of voice data segments"),
            imageUrls: z.array(z.string()).describe("Array of corresponding image URLs"),
            outputFileName: z.string().optional().describe("Custom filename for the output video"),
            transitionDuration: z.number().optional().default(0.5).describe("Duration of transitions between segments (seconds)"),
        }),
    }
);
