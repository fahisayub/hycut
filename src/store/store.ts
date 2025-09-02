import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { createVideoSlice, VideoSlice } from './slices/videoSlice';
import { makePromptKey, loadFromStorage, saveToStorage } from '@/lib/storage';

export type RootStore = VideoSlice & {
    loadCachedResult: (prefix: string, prompt: string) => VideoSlice['result'] | null;
    saveCachedResult: (prefix: string, prompt: string, data: VideoSlice['result']) => void;
};

export const useStore = create<RootStore>()(
    devtools(
        persist(
            immer((set) => ({
                ...createVideoSlice(set),
                loadCachedResult: (prefix, prompt) => {
                    const key = makePromptKey(prefix, prompt);
                    return loadFromStorage<VideoSlice['result']>(key, 1000 * 60 * 60 * 24);
                },
                saveCachedResult: (prefix, prompt, data) => {
                    const key = makePromptKey(prefix, prompt);
                    saveToStorage(key, data);
                },
            })),
            { name: 'root-store' }
        )
    )
);
