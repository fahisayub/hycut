"use client"
import { useState, useEffect, useRef, Suspense } from 'react';
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
    Sparkles
} from 'lucide-react';
import { useStore } from '@/store/store';

interface Task {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    status: 'pending' | 'generating' | 'completed' | 'error';
    content?: string;
    progress?: number;
}

interface GenerationResult {
    story: string;
    script: string;
    characters: string;
    characterImages?: { [key: string]: string };
    locations: string;
    scenes: string;
    sceneImages?: string[];
    generatedVideos?: string[];
    finalVideo: string;
    currentStep: string;
}

const hasResultValue = (res: GenerationResult, key: keyof GenerationResult): boolean => {
    switch (key) {
        case 'story': return !!res.story;
        case 'script': return !!res.script;
        case 'characters': return !!res.characters;
        case 'characterImages': return !!res.characterImages && Object.keys(res.characterImages).length > 0;
        case 'locations': return !!res.locations;
        case 'scenes': return !!res.scenes;
        case 'sceneImages': return Array.isArray(res.sceneImages) && res.sceneImages.length > 0;
        case 'generatedVideos': return Array.isArray(res.generatedVideos) && res.generatedVideos.length > 0;
        case 'finalVideo': return !!res.finalVideo;
        case 'currentStep': return !!res.currentStep;
        default: return false;
    }
};

const DashboardContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const userPrompt = searchParams.get('prompt') || '';

    const { tasks, setTasks, updateTask, result, setResultPart, loadCachedResult, saveCachedResult } = useStore();

    const [activeTask, setActiveTask] = useState<string>('story');
    const [isGenerating, setIsGenerating] = useState(false);
    const bootstrappedRef = useRef<string | null>(null);
    const filmIndexRef = useRef<number>(0);

    // Initialize tasks
    useEffect(() => {
        const ui: Task[] = [
            { id: 'story', title: 'Story Generation', description: 'Creating compelling narrative', icon: FileText, status: 'pending', progress: 0 },
            { id: 'script', title: 'Script Writing', description: 'Crafting dialogue and scenes', icon: FileText, status: 'pending', progress: 0 },
            { id: 'voices', title: 'Voice Generation', description: 'Generating character voices', icon: Film, status: 'pending', progress: 0 },
            { id: 'characters', title: 'Character Design', description: 'Developing visual characters', icon: Users, status: 'pending', progress: 0 },
            { id: 'character_images', title: 'Character Images', description: 'Generating character portraits', icon: Users, status: 'pending', progress: 0 },
            { id: 'locations', title: 'Location Scouting', description: 'Finding perfect settings', icon: MapPin, status: 'pending', progress: 0 },
            { id: 'scenes', title: 'Scene Creation', description: 'Generating visual scenes', icon: Camera, status: 'pending', progress: 0 },
            { id: 'scene_images', title: 'Scene Images', description: 'Creating scene visuals', icon: Camera, status: 'pending', progress: 0 },
            { id: 'videos', title: 'Video Generation', description: 'Creating video scenes', icon: Film, status: 'pending', progress: 0 },
            { id: 'film', title: 'Final Film', description: 'Assembling the masterpiece', icon: Film, status: 'pending', progress: 0 },
        ];
        setTasks(ui.map(t => ({ id: t.id, title: t.title, status: 'pending', progress: 0 })));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Apply cache once per prompt
    useEffect(() => {
        if (!userPrompt) return;
        if (bootstrappedRef.current === userPrompt) return;
        const cached = loadCachedResult('video_gen', userPrompt);
        if (cached) {
            setResultPart(cached);
            const completed: Record<string, boolean> = {
                story: !!cached.story,
                script: !!cached.script,
                characters: !!cached.characters,
                character_images: !!cached.characterImages && Object.keys(cached.characterImages).length > 0,
                locations: !!cached.locations,
                scenes: !!cached.scenes,
                scene_images: !!cached.sceneImages && cached.sceneImages.length > 0,
                videos: !!cached.generatedVideos && cached.generatedVideos.length > 0,
                film: !!cached.finalVideo || (!!cached.generatedVideos && cached.generatedVideos.length > 0),
            };
            const next = tasks.map(t => ({ ...t, status: completed[t.id] ? 'completed' : t.status, progress: completed[t.id] ? 100 : t.progress }));
            setTasks(next);
        }
        bootstrappedRef.current = userPrompt;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userPrompt]);

    const startGeneration = async () => {
        if (!userPrompt) return;
        setIsGenerating(true);
        // Set only the first pending task to generating 5%
        const firstPending = tasks.find(t => t.status !== 'completed' && t.status !== 'error');
        if (firstPending) updateTask(firstPending.id, { status: 'generating', progress: 5 });

        try {
            const response = await fetch('/api/video-generation', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userInput: userPrompt }),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Generation failed');
            const r: GenerationResult = data.result;
            setResultPart(r);
            const mapping: Array<[keyof GenerationResult | 'voices', string]> = [
                ['story', 'story'], ['script', 'script'], ['voices', 'voices'], ['characters', 'characters'], ['characterImages', 'character_images'],
                ['locations', 'locations'], ['scenes', 'scenes'], ['sceneImages', 'scene_images'], ['generatedVideos', 'videos'], ['finalVideo', 'film'],
            ];
            mapping.forEach(([k, id]) => {
                const has = k === 'voices'
                    ? Boolean((data.result.voices && data.result.voices.length > 0))
                    : hasResultValue(r, k as keyof GenerationResult);
                if (has) updateTask(id, { status: 'completed', progress: 100 });
            });
            saveCachedResult('video_gen', userPrompt, r);
        } catch (e) {
            const cur = firstPending?.id || activeTask;
            updateTask(cur, { status: 'error', progress: 0 });
        } finally {
            setIsGenerating(false);
        }
    };

    // Auto-start if not complete
    useEffect(() => {
        if (!userPrompt) return;
        const cached = loadCachedResult('video_gen', userPrompt);
        const done = !!cached?.finalVideo || (!!cached?.generatedVideos && cached.generatedVideos.length > 0);
        if (!done) startGeneration();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userPrompt]);

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
            case 'generating': return <Badge variant="secondary" className="bg-primary/20 text-primary animate-pulse">Generating</Badge>;
            case 'error': return <Badge variant="secondary" className="bg-red-500/20 text-red-400">Error</Badge>;
            default: return <Badge variant="outline">Pending</Badge>;
        }
    };

    const activeTaskData = tasks.find(t => t.id === activeTask);

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
                            <Badge variant="secondary" className="bg-primary/20 text-primary">
                                {userPrompt.substring(0, 30)}...
                            </Badge>
                        )}
                        {isGenerating && (
                            <Badge variant="secondary" className="bg-primary/20 text-primary animate-pulse">
                                AI Processing
                            </Badge>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex h-[calc(100vh-73px)]">
                <div className="w-80 border-r border-border bg-card/30 backdrop-blur-sm">
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Film className="w-5 h-5 text-primary" />
                            Production Pipeline
                        </h2>

                        <div className="space-y-3">
                            {tasks.map((task) => {
                                const IconComponent = (task.id === 'story' || task.id === 'script') ? FileText
                                    : task.id.includes('character') ? Users
                                        : task.id.includes('location') ? MapPin
                                            : task.id.includes('scene') ? Camera
                                                : Film;
                                const isActive = activeTask === task.id;
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

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h3 className="font-medium text-sm">{task.title}</h3>
                                                    {getStatusIcon(task.status)}
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-2">{/* desc omitted for brevity */}</p>
                                                {getStatusBadge(task.status)}

                                                {task.status === 'generating' && typeof task.progress === 'number' && (
                                                    <div className="mt-3">
                                                        <Progress value={task.progress} className="h-2" />
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {Math.round(task.progress)}% complete
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-4">
                            <Button onClick={startGeneration} disabled={isGenerating || !userPrompt} className="w-full">
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Generate / Resume
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto p-6">
                        {activeTaskData && (
                            <Card className="border-border bg-card/50 backdrop-blur-sm">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-lg ${activeTaskData.status === 'completed' ? 'bg-green-500/20' : activeTaskData.status === 'generating' ? 'bg-primary/20' : activeTaskData.status === 'error' ? 'bg-red-500/20' : 'bg-muted/50'}`}>
                                                <Film className={`w-6 h-6 ${activeTaskData.status === 'completed' ? 'text-green-400' : activeTaskData.status === 'generating' ? 'text-primary' : activeTaskData.status === 'error' ? 'text-red-400' : 'text-muted-foreground'}`} />
                                            </div>
                                            <div>
                                                <CardTitle className="text-2xl">{activeTaskData.title}</CardTitle>
                                                <CardDescription>Details for {activeTaskData.id}</CardDescription>
                                            </div>
                                        </div>
                                        {getStatusBadge(activeTaskData.status)}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="bg-muted/50 rounded-lg p-6">
                                        <h4 className="font-semibold mb-3">Generated Content:</h4>
                                        <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed break-words">
                                            {activeTaskData.id === 'story' && result.story}
                                            {activeTaskData.id === 'script' && result.script}
                                            {activeTaskData.id === 'characters' && result.characters}
                                            {activeTaskData.id === 'locations' && result.locations}
                                            {activeTaskData.id === 'scenes' && result.scenes}
                                        </div>

                                        {activeTaskData.id === 'voices' && (result as unknown as { voices?: { character: string; text: string; voice: string; audioDataUrl: string }[] }).voices && (
                                            <div className="space-y-3 mt-4">
                                                {(result as unknown as { voices: { character: string; text: string; voice: string; audioDataUrl: string }[] }).voices.map((v, i) => (
                                                    <div key={i} className="flex items-center gap-3">
                                                        <div className="text-xs w-24 truncate">{v.character}</div>
                                                        <audio controls src={v.audioDataUrl} className="flex-1" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {activeTaskData.id === 'character_images' && result.characterImages && (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                                {Object.entries(result.characterImages).map(([name, url]) => (
                                                    <div key={name} className="rounded-lg overflow-hidden bg-muted">
                                                        <img src={url} alt={name} className="w-full h-auto" />
                                                        <div className="text-xs p-2 text-center">{name}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {activeTaskData.id === 'scene_images' && result.sceneImages && (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                                                {result.sceneImages.map((url, i) => (
                                                    <div key={i} className="rounded-lg overflow-hidden bg-muted">
                                                        <img src={url} alt={`scene-${i}`} className="w-full h-auto" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {(activeTaskData.id === 'videos' || activeTaskData.id === 'film') && result.generatedVideos && result.generatedVideos.length > 0 && (
                                            <div className="space-y-4 mt-4">
                                                <video key={filmIndexRef.current} controls className="w-full rounded-lg" onEnded={() => {
                                                    filmIndexRef.current = Math.min(filmIndexRef.current + 1, (result.generatedVideos?.length || 1) - 1);
                                                    setActiveTask('film');
                                                }} src={result.generatedVideos[filmIndexRef.current]} />
                                                <div className="text-xs text-muted-foreground">Playing clip {filmIndexRef.current + 1} of {result.generatedVideos.length}</div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
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