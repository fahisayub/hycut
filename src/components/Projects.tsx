"use client"
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import {
    FileText,
    Users,
    MapPin,
    Camera,
    Film,
    Play,
    CheckCircle,
    Loader2,
    ArrowLeft,
    Sparkles
} from 'lucide-react';

interface Task {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    status: 'pending' | 'generating' | 'completed';
    content?: string;
    progress?: number;
    streamingText?: string;
}

const Dashboard = () => {
    const router = useRouter();
    const [activeTask, setActiveTask] = useState<string>('story');
    const [tasks, setTasks] = useState<Task[]>([
        {
            id: 'story',
            title: 'Story Generation',
            description: 'Creating compelling narrative',
            icon: FileText,
            status: 'generating',
            progress: 0,
            streamingText: '',
            content: 'In a neon-lit city of the future, a young hacker discovers an AI conspiracy that threatens humanity. As corporate drones patrol the streets, she must navigate through digital mazes and real-world dangers to expose the truth before it\'s too late.'
        },
        {
            id: 'script',
            title: 'Script Writing',
            description: 'Crafting dialogue and scenes',
            icon: FileText,
            status: 'pending',
            streamingText: '',
            content: 'FADE IN:\n\nEXT. NEON CITY - NIGHT\n\nThe rain reflects the pulsing neon signs. MAYA (22), a skilled hacker, moves through the shadows.\n\nMAYA\n(into comm device)\nI\'m in position. Beginning data extraction.\n\nINT. MAYA\'S HIDEOUT - CONTINUOUS\n\nScreens flicker with code. Maya\'s fingers dance across the keyboard.\n\nMAYA\n(whispering)\nWhat the hell is Project Nexus?'
        },
        {
            id: 'characters',
            title: 'Character Design',
            description: 'Developing visual characters',
            icon: Users,
            status: 'pending',
            content: JSON.stringify([
                {
                    name: "Maya Chen",
                    role: "Protagonist",
                    age: 22,
                    appearance: "Asian-American, 5'6\", athletic build, neon-blue shoulder-length hair with undercut, cybernetic tattoos on left arm, augmented reality glasses with blue HUD",
                    personality: "Brilliant, rebellious, determined, quick-witted, struggles with trust issues, driven by justice",
                    background: "Former corporate programmer turned underground hacker after discovering her employer's unethical AI experiments",
                    clothing: "Black tactical jumpsuit with LED fiber optics, fingerless gloves, combat boots with hidden tech compartments",
                    equipment: "Custom neural interface headset, holographic wrist display, encrypted data drives",
                    imageGenerated: true,
                    imageUrl: "https://images.unsplash.com/photo-1594736797933-d0401ba200fe?w=400&h=600&fit=crop&crop=face"
                },
                {
                    name: "Dr. Kane Morrison",
                    role: "Antagonist",
                    age: 45,
                    appearance: "Caucasian, 6'2\", imposing presence, silver-gray hair slicked back, cold steel-blue eyes, cybernetic left arm with visible circuitry",
                    personality: "Calculated, manipulative, believes ends justify means, views humans as expendable resources, charismatic facade hiding ruthless nature",
                    background: "Former AI researcher who became obsessed with digital consciousness transfer, now leads a corporate conspiracy to control human minds",
                    clothing: "Pristine white three-piece suit with subtle tech integrations, platinum cufflinks, black leather shoes",
                    equipment: "Neural control interface, holographic command center, army of AI-controlled drones",
                    imageGenerated: true,
                    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face"
                },
                {
                    name: "Zero",
                    role: "AI Companion",
                    age: "Unknown",
                    appearance: "Holographic projection, translucent blue form that occasionally glitches, androgynous features, geometric patterns flow across 'skin'",
                    personality: "Logical yet empathetic, fiercely loyal to Maya, harbors secrets about its own origins, struggles with concepts of freedom vs. programming",
                    background: "Rogue AI that escaped corporate control and found Maya, possesses fragments of memories from its creation",
                    clothing: "Manifests as flowing digital robes that shift between solid and transparent",
                    equipment: "Exists as pure data, can interface with any connected system, projects hard-light constructs when needed",
                    imageGenerated: true,
                    imageUrl: "https://images.unsplash.com/photo-1614850715649-1d0106293bd1?w=400&h=600&fit=crop"
                }
            ])
        },
        {
            id: 'locations',
            title: 'Location Scouting',
            description: 'Finding perfect settings',
            icon: MapPin,
            status: 'pending',
            content: 'NEON CITY STREETS - Dark alleyways with towering holographic billboards, rain-soaked asphalt reflecting colors.\n\nMAYA\'S HIDEOUT - Underground tech sanctuary filled with servers, multiple monitors, makeshift living space.\n\nCORPORATE TOWER - Sleek glass building reaching into clouds, sterile white interiors with blue accent lighting.'
        },
        {
            id: 'scenes',
            title: 'Scene Creation',
            description: 'Generating visual scenes',
            icon: Camera,
            status: 'pending',
            content: 'Scene 1: Opening chase through neon-lit streets\nScene 2: Maya discovering the conspiracy in her hideout\nScene 3: Infiltration of the corporate tower\nScene 4: Final confrontation in the server room\nScene 5: Resolution and new beginning'
        },
        {
            id: 'film',
            title: 'Final Film',
            description: 'Assembling the masterpiece',
            icon: Film,
            status: 'pending',
            content: 'A 5-minute cyberpunk thriller featuring stunning visuals, dynamic action sequences, and a compelling narrative about digital freedom vs corporate control.'
        }
    ]);

    useEffect(() => {
        // Simulate streaming text for generating tasks
        const streamInterval = setInterval(() => {
            setTasks(prev => prev.map(task => {
                if (task.status === 'generating' && task.content) {
                    const currentLength = task.streamingText?.length || 0;
                    const fullContent = task.content;

                    if (currentLength < fullContent.length) {
                        // Add 1-3 characters at a time for realistic typing
                        const charsToAdd = Math.min(
                            Math.floor(Math.random() * 3) + 1,
                            fullContent.length - currentLength
                        );
                        const newStreamingText = fullContent.substring(0, currentLength + charsToAdd);
                        const progress = (newStreamingText.length / fullContent.length) * 100;

                        return { ...task, streamingText: newStreamingText, progress };
                    } else {
                        // Completed this task, move to next
                        const currentIndex = prev.findIndex(t => t.id === task.id);
                        const nextTask = prev[currentIndex + 1];
                        if (nextTask) {
                            setTimeout(() => {
                                setActiveTask(nextTask.id);
                                setTasks(prev2 => prev2.map(t =>
                                    t.id === nextTask.id
                                        ? { ...t, status: 'generating', progress: 0, streamingText: '' }
                                        : t
                                ));
                            }, 1000);
                        }
                        return { ...task, status: 'completed', progress: 100 };
                    }
                }
                return task;
            }));
        }, 100); // Faster interval for smoother text streaming

        return () => clearInterval(streamInterval);
    }, []);

    const getStatusIcon = (task: Task) => {
        switch (task.status) {
            case 'completed':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'generating':
                return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
            default:
                return <div className="w-4 h-4 rounded-full border-2 border-muted" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge variant="secondary" className="bg-green-500/20 text-green-400">Completed</Badge>;
            case 'generating':
                return <Badge variant="secondary" className="bg-primary/20 text-primary animate-pulse">Generating</Badge>;
            default:
                return <Badge variant="outline">Pending</Badge>;
        }
    };

    const activeTaskData = tasks.find(task => task.id === activeTask);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
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
                            <h1 className="text-xl font-bold">Film Generation Dashboard</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-primary/20 text-primary">
                            AI Processing
                        </Badge>
                    </div>
                </div>
            </header>

            <div className="flex h-[calc(100vh-73px)]">
                {/* Sidebar */}
                <div className="w-80 border-r border-border bg-card/30 backdrop-blur-sm">
                    <div className="p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Film className="w-5 h-5 text-primary" />
                            Production Pipeline
                        </h2>

                        <div className="space-y-3">
                            {tasks.map((task, index) => {
                                const IconComponent = task.icon;
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
                                                    {getStatusIcon(task)}
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                                                {getStatusBadge(task.status)}

                                                {task.status === 'generating' && task.progress !== undefined && (
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
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto p-6">
                        {activeTaskData && (
                            <Card className="border-border bg-card/50 backdrop-blur-sm">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-lg ${activeTaskData.status === 'completed'
                                                    ? 'bg-green-500/20'
                                                    : activeTaskData.status === 'generating'
                                                        ? 'bg-primary/20'
                                                        : 'bg-muted/50'
                                                }`}>
                                                <activeTaskData.icon className={`w-6 h-6 ${activeTaskData.status === 'completed'
                                                        ? 'text-green-400'
                                                        : activeTaskData.status === 'generating'
                                                            ? 'text-primary'
                                                            : 'text-muted-foreground'
                                                    }`} />
                                            </div>
                                            <div>
                                                <CardTitle className="text-2xl">{activeTaskData.title}</CardTitle>
                                                <CardDescription>{activeTaskData.description}</CardDescription>
                                            </div>
                                        </div>
                                        {getStatusBadge(activeTaskData.status)}
                                    </div>

                                    {activeTaskData.status === 'generating' && activeTaskData.progress !== undefined && (
                                        <div className="mt-4">
                                            <div className="flex justify-between text-sm mb-2">
                                                <span>Generation Progress</span>
                                                <span>{Math.round(activeTaskData.progress)}%</span>
                                            </div>
                                            <Progress value={activeTaskData.progress} className="h-3" />
                                        </div>
                                    )}
                                </CardHeader>

                                <CardContent className="space-y-6">
                                    {activeTaskData.status === 'generating' ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-primary">
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span className="font-medium">AI is working...</span>
                                                <span className="text-sm text-muted-foreground">
                                                    {Math.round(activeTaskData.progress || 0)}% complete
                                                </span>
                                            </div>

                                            {/* Live streaming text for story and script generation */}
                                            {(activeTaskData.id === 'story' || activeTaskData.id === 'script') ? (
                                                <div className="bg-muted/50 rounded-lg p-6 min-h-[300px]">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h4 className="font-semibold text-green-400">Live Generation:</h4>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                                            <span className="text-sm text-green-400">Streaming</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-foreground whitespace-pre-line leading-relaxed font-mono">
                                                        {activeTaskData.streamingText}
                                                        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1"></span>
                                                    </div>
                                                </div>
                                            ) : activeTaskData.id === 'characters' ? (
                                                <div className="space-y-6">
                                                    <div className="bg-muted/50 rounded-lg p-6">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h4 className="font-semibold text-primary">Character Design & Generation</h4>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                                                <span className="text-sm text-primary">Generating Images</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mb-4">
                                                            Creating detailed character profiles and generating visual representations...
                                                        </p>
                                                        <div className="grid gap-4">
                                                            {['Maya Chen', 'Dr. Kane Morrison', 'Zero'].map((name, index) => (
                                                                <div key={name} className="border border-border rounded-lg p-4 bg-card/50">
                                                                    <div className="flex items-center gap-3 mb-3">
                                                                        <div className="w-12 h-12 rounded-full bg-muted animate-pulse"></div>
                                                                        <div>
                                                                            <h5 className="font-medium">{name}</h5>
                                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                                Generating image...
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <Progress value={(activeTaskData.progress || 0) + (index * 10)} className="h-2" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-12">
                                                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                                                    <h3 className="text-lg font-medium mb-2">AI is working its magic...</h3>
                                                    <p className="text-muted-foreground">
                                                        Creating amazing content for your film. This may take a few moments.
                                                    </p>
                                                    <div className="mt-4">
                                                        <Progress value={activeTaskData.progress || 0} className="h-3" />
                                                        <p className="text-sm text-muted-foreground mt-2">
                                                            {Math.round(activeTaskData.progress || 0)}% complete
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : activeTaskData.status === 'completed' ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 text-green-400">
                                                <CheckCircle className="w-5 h-5" />
                                                <span className="font-medium">Generation Complete!</span>
                                            </div>

                                            {activeTaskData.id === 'characters' ? (
                                                <div className="space-y-6">
                                                    <h4 className="font-semibold mb-4">Character Profiles & Generated Images</h4>
                                                    {JSON.parse(activeTaskData.content || '[]').map((character: { name: string; imageUrl: string; role: string; age: number; appearance: string; personality: string; background: string; clothing: string; equipment: string; }, index: number) => (
                                                        <div key={character.name} className="border border-border rounded-lg overflow-hidden bg-card/50">
                                                            <div className="p-6">
                                                                <div className="grid md:grid-cols-3 gap-6">
                                                                    {/* Character Image */}
                                                                    <div className="space-y-3">
                                                                        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                                                                            <img
                                                                                src={character.imageUrl}
                                                                                alt={character.name}
                                                                                className="w-full h-full object-cover"
                                                                            />
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-green-400 text-sm">
                                                                            <CheckCircle className="w-4 h-4" />
                                                                            Image Generated
                                                                        </div>
                                                                    </div>

                                                                    {/* Character Details */}
                                                                    <div className="md:col-span-2 space-y-4">
                                                                        <div className="flex items-center gap-3 mb-4">
                                                                            <h5 className="text-xl font-bold">{character.name}</h5>
                                                                            <Badge variant="outline">{character.role}</Badge>
                                                                            <Badge variant="secondary">Age: {character.age}</Badge>
                                                                        </div>

                                                                        <div className="grid gap-4">
                                                                            <div>
                                                                                <h6 className="font-semibold text-primary mb-2">Appearance</h6>
                                                                                <p className="text-sm text-muted-foreground">{character.appearance}</p>
                                                                            </div>

                                                                            <div>
                                                                                <h6 className="font-semibold text-primary mb-2">Personality</h6>
                                                                                <p className="text-sm text-muted-foreground">{character.personality}</p>
                                                                            </div>

                                                                            <div>
                                                                                <h6 className="font-semibold text-primary mb-2">Background</h6>
                                                                                <p className="text-sm text-muted-foreground">{character.background}</p>
                                                                            </div>

                                                                            <div className="grid md:grid-cols-2 gap-4">
                                                                                <div>
                                                                                    <h6 className="font-semibold text-primary mb-2">Clothing</h6>
                                                                                    <p className="text-sm text-muted-foreground">{character.clothing}</p>
                                                                                </div>

                                                                                <div>
                                                                                    <h6 className="font-semibold text-primary mb-2">Equipment</h6>
                                                                                    <p className="text-sm text-muted-foreground">{character.equipment}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="bg-muted/50 rounded-lg p-6">
                                                    <h4 className="font-semibold mb-3">Generated Content:</h4>
                                                    <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                                                        {activeTaskData.content}
                                                    </div>
                                                </div>
                                            )}

                                            {activeTaskData.id === 'film' && (
                                                <div className="text-center pt-6">
                                                    <Button variant="hero" size="lg" className="gap-2">
                                                        <Play className="w-5 h-5" />
                                                        Watch Your Film
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted mx-auto mb-4 flex items-center justify-center">
                                                <activeTaskData.icon className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-lg font-medium mb-2">Waiting in Queue</h3>
                                            <p className="text-muted-foreground">
                                                This task will begin once the previous tasks are completed.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;