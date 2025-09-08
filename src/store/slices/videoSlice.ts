import { StateCreator } from 'zustand';

export interface TaskProgress {
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'generating' | 'completed' | 'error';
    progress: number;
    content?: string;
    error?: string;
    icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export interface GenerationResult {
    story?: string;
    script?: string;
    characters?: unknown;
    characterImages?: { [key: string]: string };
    locations?: string;
    scenes?: unknown;
    sceneImages?: string[];
    generatedVideos?: string[];
    voices?: unknown[];
    finalVideo?: string;
    currentStep?: string;
    contentType?: string;
    plan?: unknown[];
    completedSteps?: string[];
    progress?: {
        currentStepProgress: number;
        overallProgress: number;
        estimatedTimeRemaining?: number;
    };
    errors?: unknown[];
}

export interface VideoSlice {
    tasks: TaskProgress[];
    setTasks: (tasks: TaskProgress[]) => void;
    updateTask: (id: string, updates: Partial<TaskProgress>) => void;

    result: GenerationResult;
    setResult: (result: GenerationResult) => void;
    setResultPart: (partialResult: Partial<GenerationResult>) => void;
    clearResult: () => void;
}

export const createVideoSlice: StateCreator<VideoSlice, [], [], VideoSlice> = (set) => ({
    tasks: [],
    setTasks: (tasks) => set({ tasks }),
    updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map(task => task.id === id ? { ...task, ...updates } : task)
    })),

    result: {},
    setResult: (result) => set({ result }),
    setResultPart: (partialResult) => set((state) => ({
        result: { ...state.result, ...partialResult }
    })),
    clearResult: () => set({ result: {} })
});