# AI Video Generation Setup

## Quick Start (1 Day MVP)

### 1. Install Dependencies
```bash
npm install @langchain/langgraph @langchain/openai @langchain/anthropic @langchain/core zod
```

### 2. Environment Variables
Create `.env.local` file in your project root:
```env
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### 3. Get API Keys
- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/
- **ElevenLabs**: https://elevenlabs.io/

### 4. Run the Project
```bash
npm run dev
```

## How It Works

1. **User Input**: Enter story idea in HeroSection
2. **LangGraph Pipeline**: Automatically processes through 6 stages:
   - Story Generation
   - Script Writing
   - Character Design
   - Location Design
   - Scene Generation
   - Video Assembly

## Model Switching

### Easy Model Switching
```typescript
import { MODEL_SWITCHER } from '@/lib/model-switcher';

// Switch specific task to different model
MODEL_SWITCHER.switchToOpenAI('story_generation', 'gpt-4o');
MODEL_SWITCHER.switchToAnthropic('script_writing', 'claude-3-haiku-20240307');

// Switch all tasks at once
MODEL_SWITCHER.switchAllToOpenAI('gpt-4o-mini');
```

### Supported Models
- **OpenAI**: gpt-4o, gpt-4o-mini, gpt-3.5-turbo
- **Anthropic**: claude-3-opus, claude-3-sonnet, claude-3-haiku
- **Local**: Ollama models (llama3.1:8b, mistral:7b)

## Architecture

```
HeroSection → Projects → API Route → LangGraph → AI Models
     ↓              ↓           ↓         ↓         ↓
  User Input → Dashboard → /api/video-generation → Workflow → OpenAI/Anthropic
```

## Customization

### Add New Tasks
1. Update `Task` interface in `Projects.tsx`
2. Add new node in `video-generation-graph.ts`
3. Update model config in `model-config.ts`

### Add New AI Providers
1. Update `ModelConfig` interface
2. Add provider case in `getModelForTask()`
3. Update `MODEL_SWITCHER`

## Troubleshooting

### Common Issues
- **API Key Error**: Check `.env.local` file
- **Model Not Found**: Verify model name in config
- **Generation Fails**: Check browser console for errors

### Performance Tips
- Start with `gpt-4o-mini` for faster responses
- Use `claude-3-haiku` for cost-effective generation
- Switch to local models for privacy/offline use

## Next Steps

1. **Add Image Generation**: Integrate DALL-E, Midjourney, or Stable Diffusion
2. **Voice Generation**: Implement ElevenLabs or Coqui TTS
3. **Video Assembly**: Add FFmpeg integration for final video creation
4. **Progress Tracking**: Real-time streaming updates
5. **Error Handling**: Retry logic and fallback models
