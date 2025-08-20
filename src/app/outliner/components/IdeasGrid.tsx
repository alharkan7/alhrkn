"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

export default function IdeasGrid({ ideas, isLoading, isLoadingMore }: { ideas: ResearchIdea[], isLoading: boolean, isLoadingMore: boolean }) {
    const [open, setOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const router = useRouter();

    const selected: ResearchIdea | null = useMemo(() => {
        if (selectedIndex === null) return null;
        return ideas?.[selectedIndex] ?? null;
    }, [ideas, selectedIndex]);

    // Show a single skeleton while loading
    const showSkeleton = isLoading || isLoadingMore;
    
    // Debug logging
    console.log('IdeasGrid render:', { 
        ideasCount: ideas.length, 
        isLoading, 
        isLoadingMore, 
        showSkeleton 
    });

    function navigateToExpanded(idea: ResearchIdea) {
        const id = crypto.randomUUID();
        try {
            localStorage.setItem(`outliner:${id}`, JSON.stringify(idea));
        } catch {
            // ignore storage errors
        }
        router.push(`/outliner/${id}`);
    }

    function goPrev() {
        setSelectedIndex((idx) => {
            if (idx === null) return idx;
            const prev = idx - 1;
            return prev >= 0 ? prev : idx;
        });
    }

    function goNext() {
        setSelectedIndex((idx) => {
            if (idx === null) return idx;
            const next = idx + 1;
            return next < ideas.length ? next : idx;
        });
    }

    const renderSkeletonCard = () => (
        <Card className="h-full">
            <CardHeader>
                <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-3 pb-10">
                <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-5/6 mb-1" />
                    <Skeleton className="h-4 w-4/6" />
                </div>
                <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-4/5 mb-1" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-4 w-3/5" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 md:h-32 bg-gradient-to-t from-main/95 via-main/60 to-transparent" />
            </CardContent>
        </Card>
    );

    return (
        <>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ideas.map((idea, idx) => (
                    <Card
                        key={idx}
                        className="h-full cursor-pointer transition hover:shadow-lg"
                        onClick={() => {
                            setSelectedIndex(idx);
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
                
                {/* Show skeleton for next expected card */}
                {showSkeleton && renderSkeletonCard()}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="w-[90vw] sm:w-[90vw] max-w-5xl max-h-[90vh] overflow-auto p-6">
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
                            <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                <Button className="order-1 sm:order-2" onClick={() => selected && navigateToExpanded(selected)}>
                                     Open Editor
                                </Button>
                                <div className="flex items-center gap-2 order-2 sm:order-1 justify-center sm:justify-start w-full sm:w-auto">
                                    <Button size="icon" variant="neutral" aria-label="Previous"
                                        onClick={goPrev}
                                        disabled={selectedIndex === null || selectedIndex <= 0}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="neutral" aria-label="Next"
                                        onClick={goNext}
                                        disabled={selectedIndex === null || selectedIndex >= ideas.length - 1}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}


