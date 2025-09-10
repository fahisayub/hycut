"use client"
import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    FileText,
    Users,
    MapPin,
    Camera,
    Film,
    CheckCircle,
    Loader2,
    ArrowLeft,
    Sparkles,
    Brain,
    Clock,
    Zap,
    Eye
} from 'lucide-react';
import { useStore } from '@/store/store';
import { TaskProgress } from '@/store/slices/videoSlice';
import { useStreamingGeneration } from '@/hooks/useStreamingGeneration';

interface PlanStep {
    id: string;
    name: string;
    description: string;
    required: boolean;
    dependencies?: string[];
    estimatedDuration?: number;
}

const getIconForStep = (stepId: string): React.ComponentType<React.SVGProps<SVGSVGElement>> => {
    if (stepId.includes('story')) return FileText;
    if (stepId.includes('script')) return FileText;
    if (stepId.includes('character')) return Users;
    if (stepId.includes('location')) return MapPin;
    if (stepId.includes('scene')) return Camera;
    if (stepId.includes('voice')) return Film;
    if (stepId.includes('video')) return Film;
    return Sparkles;
};

const DashboardContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const userPrompt = searchParams.get('prompt') || '';

    const { tasks, setTasks, setResultPart } = useStore();

    // 🔄 NEW: Real-time streaming state
    const streamingState = useStreamingGeneration() as ReturnType<typeof useStreamingGeneration>;

    const [activeTask, setActiveTask] = useState<string>('');
    const [activeStep, setActiveStep] = useState<string>('');
    const [contentType, setContentType] = useState<string>('');
    const [dynamicPlan, setDynamicPlan] = useState<PlanStep[]>([]);
    const [hasStarted, setHasStarted] = useState(false);
    const [preset, setPreset] = useState<'FAST' | 'BALANCED' | 'QUALITY'>('BALANCED');

    // 🔄 NEW: Real-time streaming integration
    useEffect(() => {
        if (userPrompt && !hasStarted) {
            // Reset all state for new prompt
            setTasks([]);
            setResultPart({});
            setDynamicPlan([]);
            setActiveTask('');
            setContentType('');
            setHasStarted(false);
            streamingState.reset();

            // Auto-start streaming generation after a brief delay
            const timer = setTimeout(() => {
                startStreamingGeneration();
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [userPrompt, setTasks, setResultPart]); // eslint-disable-line react-hooks/exhaustive-deps

    // 🔄 NEW: Update UI based on streaming state
    useEffect(() => {
        if (streamingState.result) {
            const r = streamingState.result as Record<string, unknown>;
            setResultPart(r);
            setContentType((r.contentType as string) || 'multi_character');
            setDynamicPlan((r.plan as PlanStep[]) || []);
        }
    }, [streamingState.result, setResultPart]);

    // 🔄 NEW: Update tasks based on streaming updates
    useEffect(() => {
        if (streamingState.updates.length > 0) {
            const planningTask: TaskProgress = {
                id: 'content_analysis',
                title: '🎯 Content Analysis',
                description: 'AI analyzing your request and creating workflow...',
                icon: Brain,
                status: streamingState.completedSteps.includes('content_analysis') ? 'completed' :
                    streamingState.currentStep === 'content_analysis' ? 'generating' : 'pending',
                progress: streamingState.completedSteps.includes('content_analysis') ? 100 :
                    streamingState.currentStep === 'content_analysis' ? streamingState.progress : 0
            };

            // Create dynamic tasks from plan if available
            const dynamicTasks: TaskProgress[] = dynamicPlan.map((step) => ({
                id: step.id,
                title: step.name,
                description: step.description,
                icon: getIconForStep(step.id),
                status: streamingState.completedSteps.includes(step.id) ? 'completed' :
                    streamingState.currentStep === step.id ? 'generating' : 'pending',
                progress: streamingState.completedSteps.includes(step.id) ? 100 :
                    streamingState.currentStep === step.id ? streamingState.progress : 0
            }));

            setTasks([planningTask, ...dynamicTasks]);

            // Set active task to current streaming step
            if (streamingState.currentStep) {
                setActiveTask(streamingState.currentStep);
                setActiveStep(streamingState.currentStep);
            }
        }
    }, [streamingState.updates, streamingState.currentStep, streamingState.completedSteps, streamingState.progress, dynamicPlan, setTasks]);

    // Build sidebar strictly from streamed steps (first occurrence order)
    const sidebarSteps = useMemo(() => {
        const seen = new Set<string>();
        const order: string[] = [];
        for (const u of streamingState.updates) {
            if (u.step && !seen.has(u.step)) {
                seen.add(u.step);
                order.push(u.step);
            }
        }
        return order;
    }, [streamingState.updates]);

    // Simple step display name
    const getStepName = (id: string) => {
        const map: Record<string, string> = {
            content_analysis: 'Content Analysis',
            story_generation: 'Story Generation',
            story_refine: 'Storytelling Refinement',
            script_writing: 'Script Writing',
            character_design: 'Character Design',
            character_image_generation: 'Character Images',
            scene_generation: 'Scene Planning',
            scene_image_generation: 'Scene Images',
            voice_generation: 'Voice Generation',
            video_generation: 'Video Generation',
            video_assembly: 'Final Assembly',
            compose_output: 'Compose Output',
        };
        return map[id] || id;
    };

    // Render content for active streamed step
    const renderStreamedContent = (stepId: string) => {
        const r = (streamingState.result as Record<string, unknown>) || {};
        switch (stepId) {
            case 'story_generation':
                return typeof r.story === 'string' ? (
                    <div className="p-4 bg-card rounded-lg border whitespace-pre-wrap text-sm leading-relaxed">{r.story as string}</div>
                ) : null;
            case 'story_refine':
            case 'script_writing':
                return typeof r.script === 'string' ? (
                    <div className="p-4 bg-card rounded-lg border whitespace-pre-wrap text-sm leading-relaxed font-mono">{r.script as string}</div>
                ) : null;
            case 'voice_generation':
                return Array.isArray(r.voices) ? (
                    <div className="space-y-3">
                        {(r.voices as { character: string; audioDataUrl: string }[]).map((v, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="text-xs w-24 truncate">{v.character}</div>
                                <audio controls src={v.audioDataUrl} className="flex-1" />
                            </div>
                        ))}
                    </div>
                ) : null;
            case 'character_image_generation':
                return r.characterImages && typeof r.characterImages === 'object' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(r.characterImages as Record<string, string>).map(([name, url]) => (
                            <div key={name} className="rounded-lg overflow-hidden bg-muted">
                                <img src={url} alt={name} className="w-full h-auto" />
                                <div className="text-xs p-2 text-center">{name}</div>
                            </div>
                        ))}
                    </div>
                ) : null;
            case 'compose_output':
            case 'video_assembly':
                return r.finalVideo ? (
                    <video controls className="w-full rounded-lg" src={r.finalVideo as string} />
                ) : null;
            default:
                return null;
        }
    };

    const startStreamingGeneration = async () => {
        if (!userPrompt || hasStarted) return;

        setHasStarted(true);

        // Start the real-time streaming generation
        await streamingState.startGeneration(userPrompt, preset, 'SIMPLE_STORY');
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'generating': return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
            case 'error': return <div className="w-4 h-4 rounded-full bg-red-500" />;
            default: return <div className="w-4 h-4 rounded-full border-2 border-muted" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge variant="secondary" className="bg-green-500/20 text-green-400">Completed</Badge>;
            case 'generating': return <Badge variant="secondary" className="bg-primary/20 text-primary animate-pulse">Processing</Badge>;
            case 'error': return <Badge variant="secondary" className="bg-red-500/20 text-red-400">Error</Badge>;
            default: return <Badge variant="outline">Queued</Badge>;
        }
    };

    const activeTaskData = tasks.find(t => t.id === activeTask);

    const renderPlanningContent = () => (
        <div className="space-y-6">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Brain className="w-6 h-6 text-primary" />
                    <h3 className="text-lg font-semibold">AI Planning Phase</h3>
                    {streamingState.isStreaming && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                </div>

                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        🤖 Analyzing your request: <span className="font-medium text-foreground">&quot;{userPrompt}&quot;</span>
                    </p>

                    {contentType && (
                        <p className="text-sm">
                            📋 Detected content type: <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 ml-2">
                                {contentType.replace('_', ' ').toUpperCase()}
                            </Badge>
                        </p>
                    )}

                    {dynamicPlan.length > 0 && (
                        <div className="mt-4">
                            <p className="text-sm font-medium mb-3">🎯 Generated Workflow Plan:</p>
                            <div className="space-y-2">
                                {dynamicPlan.map((step, index) => (
                                    <div key={step.id} className="flex items-center gap-3 p-3 bg-card rounded-lg border">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-medium">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{step.name}</div>
                                            <div className="text-xs text-muted-foreground">{step.description}</div>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {step.estimatedDuration}s
                                        </div>
                                        {step.required && (
                                            <Badge variant="outline" className="text-xs">Required</Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderTaskContent = (task: TaskProgress) => {
        if (task.id === 'planning') {
            return renderPlanningContent();
        }

        // 🔄 Use real-time streaming results instead of store results
        const streamingResult = streamingState.result as Record<string, unknown> || {};

        return (
            <div className="bg-muted/50 rounded-lg p-6">
                <h4 className="font-semibold mb-3">Generated Content:</h4>

                {/* Show loading state if no content yet but task is active */}
                {!streamingResult[task.id.replace('_generation', '').replace('_design', 's').replace('_writing', '')] &&
                    streamingState.currentStep === task.id && (
                        <div className="flex items-center justify-center p-8 text-muted-foreground">
                            <div className="text-center">
                                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                                <p className="text-sm">Generating content...</p>
                            </div>
                        </div>
                    )}

                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed break-words">
                    {/* Debug: Show what's available */}
                    {Object.keys(streamingResult).length > 0 && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                            <h5 className="font-medium mb-2 text-blue-800">🔍 Debug Info</h5>
                            <div className="text-xs text-blue-700 space-y-1">
                                <div>Current Task: <strong>{task.id}</strong></div>
                                <div>Available Data: <strong>{Object.keys(streamingResult).join(', ')}</strong></div>
                                {streamingResult.story && typeof streamingResult.story === 'string' ? <div>Story Length: <strong>{(streamingResult.story as string).length} chars</strong></div> : null}
                                {streamingResult.script && typeof streamingResult.script === 'string' ? <div>Script Length: <strong>{(streamingResult.script as string).length} chars</strong></div> : null}
                            </div>
                        </div>
                    )}

                    {/* Show story for story_generation task OR if story exists and we're viewing any task */}
                    {(task.id === 'story_generation' || (typeof streamingResult.story === 'string' && streamingResult.story.length > 0)) && typeof streamingResult.story === 'string' && (
                        <div className="p-4 bg-card rounded-lg border">
                            <h5 className="font-medium mb-2">📖 Generated Story</h5>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                {streamingResult.story}
                            </div>
                        </div>
                    )}

                    {/* Show script for script_writing task OR if script exists and we're viewing any task */}
                    {(task.id === 'script_writing' || (typeof streamingResult.script === 'string' && streamingResult.script.length > 0)) && typeof streamingResult.script === 'string' && (
                        <div className="p-4 bg-card rounded-lg border">
                            <h5 className="font-medium mb-2">📝 Generated Script</h5>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed font-mono">
                                {streamingResult.script}
                            </div>
                        </div>
                    )}
                    {task.id === 'character_design' && Array.isArray(streamingResult.characters) && (
                        <div className="space-y-2">
                            <h5 className="font-medium mb-2">👥 Generated Characters</h5>
                            {Array.isArray(streamingResult.characters) ? (
                                (streamingResult.characters as { name: string; role: string; description: string }[]).map((char, i: number) => (
                                    <div key={i} className="p-3 bg-card rounded border">
                                        <div className="font-medium">{char.name}</div>
                                        <div className="text-xs text-muted-foreground">{char.role}</div>
                                        <div className="text-xs mt-1">{char.description}</div>
                                    </div>
                                ))
                            ) : (
                                <div>{typeof streamingResult.characters === 'string' ? streamingResult.characters : 'No character data'}</div>
                            )}
                        </div>
                    )}
                    {task.id === 'location_design' && typeof streamingResult.locations === 'string' && (
                        <div className="p-4 bg-card rounded-lg border">
                            <h5 className="font-medium mb-2">📍 Generated Locations</h5>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                {streamingResult.locations as string}
                            </div>
                        </div>
                    )}
                    {task.id === 'scene_generation' && Array.isArray(streamingResult.scenes) && (
                        <div className="space-y-2">
                            <h5 className="font-medium mb-2">🎬 Generated Scenes</h5>
                            {Array.isArray(streamingResult.scenes) ? (
                                (streamingResult.scenes as { id: string; description: string; location?: string }[]).map((scene, i: number) => (
                                    <div key={i} className="p-3 bg-card rounded border">
                                        <div className="font-medium">{scene.id}</div>
                                        <div className="text-xs mt-1">{scene.description}</div>
                                        {scene.location && <div className="text-xs text-muted-foreground">📍 {scene.location}</div>}
                                    </div>
                                ))
                            ) : (
                                <div>{typeof streamingResult.scenes === 'string' ? streamingResult.scenes : 'No scene data'}</div>
                            )}
                        </div>
                    )}
                </div>

                {task.id === 'voice_generation' && Array.isArray(streamingResult.voices) ? (
                    <div className="space-y-3 mt-4">
                        <h5 className="font-medium mb-2">🎵 Generated Voices</h5>
                        {(streamingResult.voices as { character: string; audioDataUrl: string }[]).map((v, i: number) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="text-xs w-24 truncate">{v.character}</div>
                                <audio controls src={v.audioDataUrl} className="flex-1" />
                            </div>
                        ))}
                    </div>
                ) : null}

                {task.id === 'character_image_generation' && streamingResult.characterImages && typeof streamingResult.characterImages === 'object' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        <h5 className="font-medium mb-2 col-span-full">🖼️ Character Images</h5>
                        {Object.entries(streamingResult.characterImages as Record<string, string>).map(([name, url]) => (
                            <div key={name} className="rounded-lg overflow-hidden bg-muted">
                                <img src={url} alt={name} className="w-full h-auto" />
                                <div className="text-xs p-2 text-center">{name}</div>
                            </div>
                        ))}
                    </div>
                ) : null}

                {task.id === 'scene_image_generation' && Array.isArray(streamingResult.sceneImages) ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        <h5 className="font-medium mb-2 col-span-full">🌆 Scene Images</h5>
                        {(streamingResult.sceneImages as string[]).map((url, i) => (
                            <div key={i} className="rounded-lg overflow-hidden bg-muted">
                                <img src={url} alt={`scene-${i}`} className="w-full h-auto" />
                            </div>
                        ))}
                    </div>
                ) : null}

                {(task.id === 'video_generation' || task.id === 'video_assembly') && Array.isArray(streamingResult.generatedVideos) && streamingResult.generatedVideos.length > 0 ? (
                    <div className="space-y-4 mt-4">
                        <h5 className="font-medium mb-2">🎥 Generated Video</h5>
                        <video controls className="w-full rounded-lg" src={streamingResult.generatedVideos[0]} />
                        <div className="text-xs text-muted-foreground">
                            Generated {streamingResult.generatedVideos.length} video clip{streamingResult.generatedVideos.length > 1 ? 's' : ''}
                        </div>
                    </div>
                ) : null}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/')}
                            className="hover:bg-accent"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-primary" />
                            <h1 className="text-xl font-bold">AI Video Generation</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {userPrompt && (
                            <Badge variant="secondary" className="bg-primary/20 text-primary max-w-64 truncate">
                                {userPrompt}
                            </Badge>
                        )}
                        {contentType && (
                            <Badge variant="outline" className="text-xs">
                                {contentType.replace('_', ' ')}
                            </Badge>
                        )}
                        {streamingState.isStreaming && (
                            <Badge variant="secondary" className="bg-primary/20 text-primary animate-pulse">
                                <Zap className="w-3 h-3 animate-pulse mr-1" />
                                Live Processing
                            </Badge>
                        )}
                        {streamingState.error && (
                            <Badge variant="destructive" className="text-xs">
                                Error: {streamingState.error}
                            </Badge>
                        )}

                        {/* Preset Selector */}
                        {!streamingState.isStreaming && (
                            <select
                                value={preset}
                                onChange={(e) => setPreset(e.target.value as 'FAST' | 'BALANCED' | 'QUALITY')}
                                className="text-xs bg-card border rounded px-2 py-1"
                            >
                                <option value="FAST">⚡ Fast</option>
                                <option value="BALANCED">⚖️ Balanced</option>
                                <option value="QUALITY">💎 Quality</option>
                            </select>
                        )}
                        <Badge variant="outline" className="text-xs">
                            {preset} Mode
                        </Badge>
                    </div>
                </div>
            </header>

            <div className="flex h-[calc(100vh-73px)]">
                <div className="w-80 border-r border-border bg-card/30 backdrop-blur-sm flex flex-col">
                    <div className="p-6 flex-1 overflow-hidden flex flex-col">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Brain className="w-5 h-5 text-primary" />
                            AI Agent Workflow
                        </h2>

                        {!hasStarted && !streamingState.isStreaming && (
                            <div className="space-y-4">
                                <div className="text-center p-6 border rounded-lg bg-card/50">
                                    <Brain className="w-12 h-12 mx-auto text-primary mb-3 animate-pulse" />
                                    <h3 className="font-medium mb-2">AI Agent Ready</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Preparing to analyze your request and create a custom workflow
                                    </p>
                                </div>
                            </div>
                        )}







                        {sidebarSteps.length > 0 ? (
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {sidebarSteps.map((stepId, index) => {
                                    const Icon = getIconForStep(stepId);
                                    const isActive = activeStep === stepId;
                                    const completed = streamingState.completedSteps.includes(stepId);
                                    return (
                                        <button
                                            key={stepId}
                                            onClick={() => setActiveStep(stepId)}
                                            className={`w-full text-left p-3 rounded-lg border transition ${isActive ? 'border-primary bg-primary/10' : 'border-border bg-card/50 hover:bg-card/70 hover:border-primary/50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="text-xs font-medium w-6 h-6 rounded-full bg-muted flex items-center justify-center">{index}</div>
                                                <div className={`p-2 rounded ${completed ? 'bg-green-500/20' : isActive ? 'bg-primary/20' : 'bg-muted/50'}`}>
                                                    <Icon className={`w-4 h-4 ${completed ? 'text-green-400' : isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm truncate">{getStepName(stepId)}</div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : tasks.length > 0 && (
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                {tasks.map((task, index) => {
                                    const IconComponent = task.icon || Sparkles;
                                    const isActive = activeTask === task.id;
                                    const isCurrentlyProcessing = task.status === 'generating';

                                    return (
                                        <button
                                            key={task.id}
                                            onClick={() => setActiveTask(task.id)}
                                            className={`w-full text-left p-4 rounded-lg border transition-all duration-300 ${isActive
                                                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                                                : 'border-border bg-card/50 hover:bg-card/70 hover:border-primary/50'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="text-xs font-medium w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                                        {index}
                                                    </div>
                                                    <div className={`p-2 rounded-lg ${task.status === 'completed'
                                                        ? 'bg-green-500/20'
                                                        : task.status === 'generating'
                                                            ? 'bg-primary/20'
                                                            : 'bg-muted/50'
                                                        }`}>
                                                        <IconComponent className={`w-4 h-4 ${task.status === 'completed'
                                                            ? 'text-green-400'
                                                            : task.status === 'generating'
                                                                ? 'text-primary'
                                                                : 'text-muted-foreground'
                                                            }`} />
                                                    </div>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h3 className="font-medium text-sm">{task.title}</h3>
                                                        {getStatusIcon(task.status)}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                                        {task.description}
                                                    </p>
                                                    {getStatusBadge(task.status)}

                                                    {/* 🔄 Real-time progress for streaming */}
                                                    {(isCurrentlyProcessing || streamingState.currentStep === task.id) && typeof task.progress === 'number' && (
                                                        <div className="mt-3">
                                                            <Progress value={task.progress} className="h-2" />
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {Math.round(task.progress)}% complete
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* 🧠 Show thinking state for active task */}
                                                    {streamingState.currentStep === task.id && streamingState.thinking && (
                                                        <div className="mt-2 text-xs text-blue-600 bg-blue-50 rounded p-2 border border-blue-200">
                                                            <div className="flex items-center gap-1 mb-1">
                                                                <Eye className="w-3 h-3" />
                                                                <span className="font-medium">Thinking:</span>
                                                            </div>
                                                            <p className="leading-relaxed">{streamingState.thinking}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* 📊 Overall Progress - now uses streaming progress */}
                        {(streamingState.isStreaming || streamingState.progress > 0) && (
                            <div className="mt-4 p-4 bg-card/50 rounded-lg border shrink-0">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Overall Progress</span>
                                    <span className="text-sm text-muted-foreground">
                                        {streamingState.progress}%
                                    </span>
                                </div>
                                <Progress value={streamingState.progress || 0} className="h-2" />
                                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    {streamingState.isStreaming ? 'Processing...' : 'Completed'}
                                </div>
                                {streamingState.isStreaming && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Steps completed: {streamingState.completedSteps.length}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto p-6">
                        {sidebarSteps.length > 0 ? (
                            <Card className="border-border bg-card/50 backdrop-blur-sm">
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        {activeStep ? (
                                            <>
                                                {React.createElement(getIconForStep(activeStep), { className: 'w-6 h-6 text-primary' })}
                                                <CardTitle className="text-2xl">{getStepName(activeStep)}</CardTitle>
                                            </>
                                        ) : (
                                            <CardTitle className="text-2xl">Waiting to start…</CardTitle>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {activeStep ? renderStreamedContent(activeStep) : null}
                                </CardContent>
                            </Card>
                        ) : activeTaskData ? (
                            <Card className="border-border bg-card/50 backdrop-blur-sm">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-lg ${activeTaskData.status === 'completed'
                                                ? 'bg-green-500/20'
                                                : activeTaskData.status === 'generating'
                                                    ? 'bg-primary/20'
                                                    : activeTaskData.status === 'error'
                                                        ? 'bg-red-500/20'
                                                        : 'bg-muted/50'
                                                }`}>
                                                {React.createElement(activeTaskData.icon || Sparkles, {
                                                    className: `w-6 h-6 ${activeTaskData.status === 'completed'
                                                        ? 'text-green-400'
                                                        : activeTaskData.status === 'generating'
                                                            ? 'text-primary'
                                                            : activeTaskData.status === 'error'
                                                                ? 'text-red-400'
                                                                : 'text-muted-foreground'
                                                        }`
                                                })}
                                            </div>
                                            <div>
                                                <CardTitle className="text-2xl">{activeTaskData.title}</CardTitle>
                                                <CardDescription>{activeTaskData.description}</CardDescription>
                                            </div>
                                        </div>
                                        {getStatusBadge(activeTaskData.status)}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* 🧠 Real-time Thinking Display for Active Task */}
                                    {streamingState.currentStep === activeTaskData.id && streamingState.thinking && (
                                        <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                                            <div className="flex items-start gap-3">
                                                <Eye className="w-6 h-6 text-blue-500 mt-0.5 animate-pulse" />
                                                <div className="flex-1">
                                                    <h4 className="text-base font-medium text-blue-700 mb-2">AI Agent Thinking</h4>
                                                    <p className="text-sm text-blue-600 leading-relaxed">
                                                        {streamingState.thinking}
                                                    </p>
                                                    {streamingState.progress > 0 && (
                                                        <div className="mt-3">
                                                            <Progress value={streamingState.progress || 0} className="h-2" />
                                                            <p className="text-xs text-blue-500 mt-1">
                                                                Progress: {streamingState.progress}%
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {renderTaskContent(activeTaskData)}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                    <Brain className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium mb-2">AI Agent Ready</h3>
                                    <p className="text-muted-foreground">
                                        Start the planning process to see the AI workflow
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => (
    <Suspense fallback={<div>Loading...</div>}>
        <DashboardContent />
    </Suspense>
);

export default Dashboard;