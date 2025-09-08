import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { makePromptKey, saveToStorage, loadFromStorage } from '@/utils/storage';

export type GenerationResult = {
    story?: string;
    script?: string;
    characters?: string;
    characterImages?: Record<string, string>;
    locations?: string;
    scenes?: string;
    sceneImages?: string[];
    generatedVideos?: string[];
    finalVideo?: string;
    currentStep?: string;
};

export type TaskStatus = 'pending' | 'generating' | 'completed' | 'error';

export interface TaskProgress {
    id: string;
    title: string;
    status: TaskStatus;
    progress: number;
    content?: string;
    error?: string;
}

// Slices
interface PipelineSlice {
    activePrompt: string;
    result: GenerationResult;
    setPrompt: (p: string) => void;
    setResultPart: (partial: Partial<GenerationResult>) => void;
    loadCachedResult: (prefix: string, prompt: string) => GenerationResult | null;
    saveCachedResult: (prefix: string, prompt: string, data: GenerationResult) => void;
}

interface TasksSlice {
    tasks: TaskProgress[];
    setTasks: (tasks: TaskProgress[]) => void;
    updateTask: (id: string, patch: Partial<TaskProgress>) => void;
    resetTasks: () => void;
}

export type VideoStore = PipelineSlice & TasksSlice;

const initialTasks: TaskProgress[] = [
    { id: 'story', title: 'Story Generation', status: 'pending', progress: 0 },
    { id: 'script', title: 'Script Writing', status: 'pending', progress: 0 },
    { id: 'characters', title: 'Character Design', status: 'pending', progress: 0 },
    { id: 'character_images', title: 'Character Images', status: 'pending', progress: 0 },
    { id: 'locations', title: 'Location Scouting', status: 'pending', progress: 0 },
    { id: 'scenes', title: 'Scene Creation', status: 'pending', progress: 0 },
    { id: 'scene_images', title: 'Scene Images', status: 'pending', progress: 0 },
    { id: 'videos', title: 'Video Generation', status: 'pending', progress: 0 },
    { id: 'film', title: 'Final Film', status: 'pending', progress: 0 },
];

const createPipelineSlice = (): PipelineSlice => ({
    activePrompt: '',
    result: {},
    setPrompt(p) {
        this.activePrompt = p;
    },
    setResultPart(partial) {
        this.result = { ...this.result, ...partial };
    },
    loadCachedResult(prefix, prompt) {
        const key = makePromptKey(prefix, prompt);
        return loadFromStorage<GenerationResult>(key, 1000 * 60 * 60 * 24); // 24h cache
    },
    saveCachedResult(prefix, prompt, data) {
        const key = makePromptKey(prefix, prompt);
        saveToStorage(key, data);
    },
});

const createTasksSlice = (): TasksSlice => ({
    tasks: initialTasks,
    setTasks(tasks) {
        this.tasks = tasks;
    },
    updateTask(id, patch) {
        this.tasks = this.tasks.map(t => (t.id === id ? { ...t, ...patch } : t));
    },
    resetTasks() {
        this.tasks = initialTasks.map(t => ({ ...t }));
    },
});

export const useVideoStore = create<VideoStore>()(
    devtools(
        persist(
            immer((set) => ({
                ...createPipelineSlice(),
                ...createTasksSlice(),
                // Override methods to use set/get safely
                setPrompt: (p) => set(state => { state.activePrompt = p; }),
                setResultPart: (partial) => set(state => { state.result = { ...state.result, ...partial }; }),
                setTasks: (tasks) => set(state => { state.tasks = tasks; }),
                updateTask: (id, patch) => set(state => { state.tasks = state.tasks.map(t => (t.id === id ? { ...t, ...patch } : t)); }),
                resetTasks: () => set(state => { state.tasks = initialTasks.map(t => ({ ...t })); }),
                loadCachedResult: (prefix, prompt) => {
                    const key = makePromptKey(prefix, prompt);
                    return loadFromStorage<GenerationResult>(key, 1000 * 60 * 60 * 24);
                },
                saveCachedResult: (prefix, prompt, data) => {
                    const key = makePromptKey(prefix, prompt);
                    saveToStorage(key, data);
                },
            })),
            { name: 'video-store' }
        )
    )
);
