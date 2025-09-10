# Video Combiner Tool Usage Guide

This guide explains how to use the new video combiner tools that combine AI-generated voice audio with images to create videos using open-source FFmpeg.

## Overview

The video combiner tools provide two main functionalities:

1. **Single Voice + Image Video**: Combine one voice segment with one or multiple images
2. **Multi-Voice + Images Video**: Combine multiple voice segments with corresponding images

## Dependencies

The tools use the following open-source packages:
- `fluent-ffmpeg`: Node.js wrapper for FFmpeg
- `@types/fluent-ffmpeg`: TypeScript definitions

Make sure FFmpeg is installed on your system:
- **Windows**: Download from https://ffmpeg.org/download.html
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt install ffmpeg` (Ubuntu/Debian) or `sudo yum install ffmpeg` (CentOS/RHEL)

## Tools Available

### 1. voiceImageVideoCombinerTool

Combines a single voice segment with images to create a video.

**Parameters:**
- `voiceData`: Voice data object containing character info and audio URL
- `imageUrls`: Single image URL or array of image URLs
- `outputFileName`: Optional custom filename
- `imageDuration`: Duration for each image in slideshow mode (seconds)
- `createSlideshow`: Whether to create slideshow from multiple images

**Example Usage:**

```typescript
import { voiceImageVideoCombinerTool } from '@/lib/langgraph-agent/tools/video-combiner-tool';

const result = await voiceImageVideoCombinerTool.invoke({
    voiceData: {
        character: "Narrator",
        text: "Welcome to our story",
        voice: "alloy",
        audioDataUrl: "https://example.com/audio.wav"
    },
    imageUrls: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
    createSlideshow: true,
    imageDuration: 3
});
```

### 2. multiVoiceImageVideoCombinerTool

Combines multiple voice segments with corresponding images.

**Parameters:**
- `voiceSegments`: Array of voice data objects
- `imageUrls`: Array of corresponding image URLs
- `outputFileName`: Optional custom filename
- `transitionDuration`: Duration of transitions between segments

**Example Usage:**

```typescript
import { multiVoiceImageVideoCombinerTool } from '@/lib/langgraph-agent/tools/video-combiner-tool';

const result = await multiVoiceImageVideoCombinerTool.invoke({
    voiceSegments: [
        {
            character: "Character1",
            text: "Hello there!",
            voice: "alloy",
            audioDataUrl: "https://example.com/audio1.wav"
        },
        {
            character: "Character2", 
            text: "Nice to meet you!",
            voice: "nova",
            audioDataUrl: "https://example.com/audio2.wav"
        }
    ],
    imageUrls: [
        "https://example.com/character1.jpg",
        "https://example.com/character2.jpg"
    ],
    transitionDuration: 0.5
});
```

## Service Functions

### combineVoiceAndImageVideo()

Direct service function for combining voice and images.

```typescript
import { combineVoiceAndImageVideo } from '@/lib/langgraph-agent/util/video-generation-service';

const result = await combineVoiceAndImageVideo({
    voiceData: {
        character: "Narrator",
        text: "This is a test",
        voice: "alloy", 
        audioDataUrl: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEA..."
    },
    imageUrls: "https://example.com/image.jpg",
    outputFileName: "my_video.mp4"
});
```

### combineMultiVoiceImageVideo()

Direct service function for multi-segment videos.

```typescript
import { combineMultiVoiceImageVideo } from '@/lib/langgraph-agent/util/video-generation-service';

const result = await combineMultiVoiceImageVideo({
    voiceSegments: [
        {
            character: "Alice",
            text: "Hello world!",
            voice: "alloy",
            audioDataUrl: "data:audio/wav;base64,..."
        }
    ],
    imageUrls: ["https://example.com/alice.jpg"],
    outputFileName: "alice_video.mp4"
});
```

## Output

All tools return a result object with:

```typescript
{
    success: boolean;
    videoUrl?: string;        // Public URL to access the video
    duration?: number;        // Video duration in seconds
    fileName?: string;        // Generated filename
    error?: string;           // Error message if failed
    segmentCount?: number;    // Number of segments (multi-voice only)
}
```

## File Storage

Generated videos are saved to:
- **Local Path**: `public/generated-videos/`
- **Public URL**: `/generated-videos/filename.mp4`

## Error Handling

The tools handle various error scenarios:
- Missing voice data or images
- Download failures
- FFmpeg processing errors
- File system errors

All errors are logged and returned in the result object.

## Performance Notes

- Videos are processed using FFmpeg's efficient encoding
- Temporary files are automatically cleaned up
- Supports various image formats (JPEG, PNG, etc.)
- Supports various audio formats (WAV, MP3, etc.)
- Output format: MP4 with H.264 video and AAC audio

## Integration with LangGraph

The tools are fully integrated with the LangGraph workflow and can be used in the video generation pipeline:

```typescript
// In your LangGraph workflow
const tools = {
    voiceImageVideoCombiner: voiceImageVideoCombinerTool,
    multiVoiceImageVideoCombiner: multiVoiceImageVideoCombinerTool,
    // ... other tools
};
```

## Troubleshooting

1. **FFmpeg not found**: Ensure FFmpeg is installed and in your system PATH
2. **Download failures**: Check that image/audio URLs are accessible
3. **Memory issues**: Large files may require more system memory
4. **Permission errors**: Ensure write permissions for the output directory

## Example Workflow

```typescript
// Complete example: Generate voice, images, then combine into video
import { voiceGenerationTool } from './voice-generation-tool';
import { characterImageTool } from './image-generation-tool';
import { voiceImageVideoCombinerTool } from './video-combiner-tool';

// 1. Generate voice
const voices = await voiceGenerationTool.invoke({
    script: "Hello, welcome to our story!",
    maxLines: 1
});

// 2. Generate character images
const characterImages = await characterImageTool.invoke({
    characters: [{
        name: "Narrator",
        role: "Storyteller", 
        description: "A friendly narrator"
    }]
});

// 3. Combine voice and image into video
const video = await voiceImageVideoCombinerTool.invoke({
    voiceData: voices[0],
    imageUrls: Object.values(characterImages)[0],
    outputFileName: "story_intro.mp4"
});

console.log("Video created:", video.videoUrl);
```
