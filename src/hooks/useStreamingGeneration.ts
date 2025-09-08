import { useState, useCallback } from 'react';

/**
 * 🔄 Real-Time Streaming Hook for LangGraph Video Generation
 * 
 * Handles Server-Sent Events (SSE) for live updates during video generation
 */

export interface StreamingUpdate {
    type: 'status' | 'step_start' | 'step_complete' | 'content_update' | 'complete' | 'error';
    step?: string;
    stepName?: string;
    message: string;
    timestamp: string;
    thinking?: string;
    progress?: number;
    data?: unknown;
    result?: unknown;
    error?: string;
}

export interface StreamingState {
    isStreaming: boolean;
    updates: StreamingUpdate[];
    currentStep: string | null;
    progress: number;
    completedSteps: string[];
    error: string | null;
    result: unknown | null;
    thinking: string | null;
}

export function useStreamingGeneration() {
    const [state, setState] = useState<StreamingState>({
        isStreaming: false,
        updates: [],
        currentStep: null,
        progress: 0,
        completedSteps: [],
        error: null,
        result: null,
        thinking: null
    });

    const startGeneration = useCallback(async (userInput: string, preset = 'BALANCED') => {
        // Reset state
        setState({
            isStreaming: true,
            updates: [],
            currentStep: null,
            progress: 0,
            completedSteps: [],
            error: null,
            result: null,
            thinking: 'Initializing AI agent...'
        });

        try {
            const response = await fetch('/api/video-generation/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userInput, preset }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body reader');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const update: StreamingUpdate = JSON.parse(line.slice(6));

                            setState(prevState => {
                                const newUpdates = [...prevState.updates, update];
                                const newCompletedSteps = update.type === 'step_complete' && update.step
                                    ? [...new Set([...prevState.completedSteps, update.step])]
                                    : prevState.completedSteps;

                                // 🔄 REAL-TIME: Progressively build result from each step
                                let newResult = prevState.result || {};
                                if ((update.type === 'step_complete' || update.type === 'content_update') && update.data) {
                                    newResult = { ...newResult, ...update.data };
                                } else if (update.type === 'complete' && update.result) {
                                    newResult = update.result;
                                }

                                return {
                                    ...prevState,
                                    updates: newUpdates,
                                    currentStep: update.step || prevState.currentStep,
                                    progress: typeof update.progress === 'number' ? update.progress : prevState.progress,
                                    completedSteps: newCompletedSteps,
                                    thinking: update.thinking || prevState.thinking,
                                    error: update.type === 'error' ? update.error || update.message : null,
                                    result: newResult, // 🔄 Update result progressively
                                    isStreaming: update.type !== 'complete' && update.type !== 'error'
                                };
                            });
                        } catch {
                            console.warn('Failed to parse SSE data:', line);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Streaming generation failed:', error);
            setState(prevState => ({
                ...prevState,
                isStreaming: false,
                error: error instanceof Error ? error.message : 'Streaming failed',
                thinking: 'Connection to AI agent was interrupted'
            }));
        }
    }, []);

    const reset = useCallback(() => {
        setState({
            isStreaming: false,
            updates: [],
            currentStep: null,
            progress: 0,
            completedSteps: [],
            error: null,
            result: null,
            thinking: null
        });
    }, []);

    return {
        ...state,
        startGeneration,
        reset
    };
}

/**
 * Helper hook for getting step status
 */
export function useStepStatus(stepId: string, streamingState: StreamingState) {
    if (streamingState.completedSteps.includes(stepId)) {
        return 'completed';
    }
    if (streamingState.currentStep === stepId) {
        return 'generating';
    }
    return 'pending';
}

/**
 * Helper hook for getting step data
 */
export function useStepData(stepId: string, streamingState: StreamingState) {
    const stepUpdate = streamingState.updates.find(
        update => update.step === stepId && update.type === 'step_complete'
    );
    return stepUpdate?.data || null;
}
