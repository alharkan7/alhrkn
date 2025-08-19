"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type ResearchIdea = {
    title: string;
    abstract: {
        background: string;
        literatureReview: string;
        method: string;
        analysisTechnique: string;
        impact: string;
    };
};

export default function IdeasGrid({ ideas }: { ideas: ResearchIdea[] }) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<ResearchIdea | null>(null);
    const router = useRouter();

    function navigateToExpanded(idea: ResearchIdea) {
        const id = crypto.randomUUID();
        try {
            localStorage.setItem(`outliner:${id}`, JSON.stringify(idea));
        } catch {
            // ignore storage errors
        }
        router.push(`/outliner/${id}`);
    }

    return (
        <>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ideas.map((idea, idx) => (
                    <Card
                        key={idx}
                        className="h-full cursor-pointer transition hover:shadow-lg"
                        onClick={() => {
                            setSelected(idea);
                            setOpen(true);
                        }}
                    >
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold line-clamp-2">
                                {idea.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="relative space-y-3 pb-10 overflow-hidden">
                            <div>
                                <div className="font-medium">Background</div>
                                <p className="text-sm opacity-90 line-clamp-3">{idea.abstract.background}</p>
                            </div>
                            <div>
                                <div className="font-medium">Literature Review</div>
                                <p className="text-sm opacity-90 line-clamp-3">{idea.abstract.literatureReview}</p>
                            </div>
                            <p className="text-sm opacity-80 line-clamp-1">
                                {idea.abstract.method}
                            </p>
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 md:h-32 bg-gradient-to-t from-main/95 via-main/60 to-transparent" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="w-[90vw] sm:w-[80vw] max-w-5xl max-h-[85vh] overflow-auto p-6">
                    {selected && (
                        <div className="space-y-4">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-semibold leading-tight">
                                    {selected.title}
                                </DialogTitle>
                            </DialogHeader>
                            <section className="space-y-1">
                                <h4 className="font-medium">Background</h4>
                                <p className="text-sm opacity-90 whitespace-pre-line">{selected.abstract.background}</p>
                            </section>
                            <section className="space-y-1">
                                <h4 className="font-medium">Literature Review</h4>
                                <p className="text-sm opacity-90 whitespace-pre-line">{selected.abstract.literatureReview}</p>
                            </section>
                            <section className="space-y-1">
                                <h4 className="font-medium">Method</h4>
                                <p className="text-sm opacity-90 whitespace-pre-line">{selected.abstract.method}</p>
                            </section>
                            <section className="space-y-1">
                                <h4 className="font-medium">Analysis Technique</h4>
                                <p className="text-sm opacity-90 whitespace-pre-line">{selected.abstract.analysisTechnique}</p>
                            </section>
                            <section className="space-y-1">
                                <h4 className="font-medium">Impact</h4>
                                <p className="text-sm opacity-90 whitespace-pre-line">{selected.abstract.impact}</p>
                            </section>
                            <DialogFooter>
                                <Button onClick={() => selected && navigateToExpanded(selected)}>
                                    Expand the Paper
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}


