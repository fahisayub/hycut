import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { VideoSlice, GenerationResult, TaskProgress } from './slices/videoSlice';
import { makePromptKey, loadFromStorage, saveToStorage } from '@/utils/storage';

export type RootStore = VideoSlice & {
    loadCachedResult: (prefix: string, prompt: string) => GenerationResult | null;
    saveCachedResult: (prefix: string, prompt: string, data: GenerationResult) => void;
};

export const useStore = create<RootStore>()(
    devtools((set) => ({
        // Video slice state
        tasks: [],
        result: {},

        // Video slice actions
        setTasks: (tasks: TaskProgress[]) => set({ tasks }),
        updateTask: (id: string, updates: Partial<TaskProgress>) =>
            set((state) => ({
                tasks: state.tasks.map(task => task.id === id ? { ...task, ...updates } : task)
            })),
        setResult: (result: GenerationResult) => set({ result }),
        setResultPart: (partialResult: Partial<GenerationResult>) =>
            set((state) => ({
                result: { ...state.result, ...partialResult }
            })),
        clearResult: () => set({ result: {} }),

        // Additional store actions
        loadCachedResult: (prefix: string, prompt: string) => {
            const key = makePromptKey(prefix, prompt);
            return loadFromStorage<GenerationResult>(key, 1000 * 60 * 60 * 24);
        },
        saveCachedResult: (prefix: string, prompt: string, data: GenerationResult) => {
            const key = makePromptKey(prefix, prompt);
            saveToStorage(key, data);
        },
    }))
);