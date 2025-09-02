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

export interface VideoSlice {
    activePrompt: string;
    result: GenerationResult;
    tasks: TaskProgress[];
    setPrompt: (p: string) => void;
    setResultPart: (partial: Partial<GenerationResult>) => void;
    setTasks: (tasks: TaskProgress[]) => void;
    updateTask: (id: string, patch: Partial<TaskProgress>) => void;
    resetTasks: () => void;
}

export const initialTasks: TaskProgress[] = [
    { id: 'story', title: 'Story Generation', status: 'pending', progress: 0 },
    { id: 'script', title: 'Script Writing', status: 'pending', progress: 0 },
    { id: 'voices', title: 'Voice Generation', status: 'pending', progress: 0 },
    { id: 'characters', title: 'Character Design', status: 'pending', progress: 0 },
    { id: 'character_images', title: 'Character Images', status: 'pending', progress: 0 },
    { id: 'locations', title: 'Location Scouting', status: 'pending', progress: 0 },
    { id: 'scenes', title: 'Scene Creation', status: 'pending', progress: 0 },
    { id: 'scene_images', title: 'Scene Images', status: 'pending', progress: 0 },
    { id: 'videos', title: 'Video Generation', status: 'pending', progress: 0 },
    { id: 'film', title: 'Final Film', status: 'pending', progress: 0 },
];

export const createVideoSlice = (set: (fn: (state: unknown) => void) => void): VideoSlice => ({
    activePrompt: '',
    result: {},
    tasks: initialTasks.map(t => ({ ...t })),
    setPrompt: (p) => set((state) => { (state as VideoSlice).activePrompt = p; }),
    setResultPart: (partial) => set((state) => { (state as VideoSlice).result = { ...(state as VideoSlice).result, ...partial }; }),
    setTasks: (tasks) => set((state) => { (state as VideoSlice).tasks = tasks; }),
    updateTask: (id, patch) => set((state) => { (state as VideoSlice).tasks = (state as VideoSlice).tasks.map(t => (t.id === id ? { ...t, ...patch } : t)); }),
    resetTasks: () => set((state) => { (state as VideoSlice).tasks = initialTasks.map(t => ({ ...t })); }),
});
