# Quick Test Guide 🧪

## Test the AI Video Generation System

### 1. **Start the Development Server**
```bash
npm run dev
```

### 2. **Open Your Browser**
Go to: `http://localhost:3000`

### 3. **Test the Complete Flow**

#### Step 1: Enter a Story Idea
- Type: "A robot discovering emotions in a post-apocalyptic world"
- Click "Generate Film"

#### Step 2: Watch the AI Pipeline
You should see the system process through:
1. **Story Generation** ✅
2. **Script Writing** ✅  
3. **Character Design** ✅
4. **Location Design** ✅
5. **Scene Generation** ✅
6. **Video Assembly** ✅

### 4. **Expected Results**
- Each stage should complete with generated content
- Progress bars should fill up
- Status should change from "Pending" → "Generating" → "Completed"

### 5. **Check the Console**
- Look for any error messages
- Verify API calls are working
- Check if models are responding

### 6. **Test Model Switching** (Optional)
```typescript
// In browser console or your code:
import { MODEL_SWITCHER } from '@/lib/model-switcher';
MODEL_SWITCHER.switchToOpenAI('story_generation', 'gpt-4o');
```

## 🚨 Troubleshooting

### If You Get API Errors:
1. Check `.env.local` file exists
2. Verify API keys are correct
3. Ensure you have credits in your OpenAI/Anthropic account

### If Build Fails:
1. Run `npm install` to ensure all dependencies
2. Check TypeScript errors in the console
3. Verify all files are in the correct locations

### If Frontend Doesn't Load:
1. Check if port 3000 is available
2. Look for JavaScript errors in browser console
3. Verify Next.js is running properly

## ✅ Success Indicators

- **Homepage loads** with input form
- **Generate button works** and redirects to projects
- **AI pipeline processes** through all 6 stages
- **Content is generated** for each stage
- **No console errors** in browser
- **Build completes** without TypeScript errors

## 🎯 What You Should See

1. **Beautiful UI** with modern design
2. **Smooth animations** and transitions
3. **Real-time progress** updates
4. **Generated content** for each pipeline stage
5. **Responsive design** that works on all devices

---

**If all tests pass, congratulations! Your AI Video Generation System is working perfectly! 🎉**
