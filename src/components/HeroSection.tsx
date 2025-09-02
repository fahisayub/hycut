"use client";

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import Image from "next/image";
import { useRouter } from 'next/navigation';

const HeroSection = () => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!prompt.trim()) {
            toast({
                title: "Please enter your idea",
                description: "Describe the short film you want to create",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        // Simulate AI processing
        toast({
            title: "Creating your short film...",
            description: "Our AI is working on your idea: " + prompt,
        });

        // Reset after demo
        setTimeout(() => {
            setIsLoading(false);
            setPrompt('');
            toast({
                title: "Film concept generated!",
                description: "Your AI-generated short film treatment is ready.",
            });
        }, 3000);
    };

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Background Image with Overlay */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url('/hero-bg.jpg')` }}
            >
                <div className="absolute inset-0 bg-background/80 bg-gradient-hero" />
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
                <div className="mb-8">
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <Image
                            src="/hycutwnobg.png"
                            alt="hycut logo"
                            width={100}
                            height={100}
                            className="h-auto w-auto"
                            priority
                        />
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Create Short Films
                        <span className="block text-primary">with AI</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Transform your ideas into cinematic short films. Just describe your vision and watch hycut bring it to life.
                    </p>
                </div>

                {/* Input Form */}
                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
                    <div className="relative mb-6">
                        <Input
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe your short film idea..."
                            className="h-16 px-6 text-lg bg-card/50 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:bg-card/70 transition-all"
                            disabled={isLoading}
                        />
                    </div>

                    <Button
                        type="submit"
                        variant="hero"
                        size="lg"
                        className="h-14 px-8 text-lg"
                        disabled={isLoading || !prompt.trim()}
                        onClick={() => {
                            if (prompt.trim()) {
                                router.push(`/projects?prompt=${encodeURIComponent(prompt.trim())}`);
                            }
                        }}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                                Creating Film...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Generate Film
                            </>
                        )}
                    </Button>
                </form>

                {/* Example Prompts */}
                <div className="mt-12 opacity-70">
                    <p className="text-sm text-muted-foreground mb-4">Try these examples:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {[
                            "A detective solving a mystery in a cyberpunk city",
                            "Two robots discovering friendship in a post-apocalyptic world",
                            "A time traveler trying to fix a broken timeline"
                        ].map((example, index) => (
                            <button
                                key={index}
                                onClick={() => setPrompt(example)}
                                className="px-4 py-2 text-sm bg-secondary/50 hover:bg-secondary/70 rounded-full transition-colors"
                                disabled={isLoading}
                            >
                                {example}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HeroSection;