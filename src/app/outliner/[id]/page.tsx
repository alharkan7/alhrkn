'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

export default function OutlinerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = (params?.id as string) || '';
    const [idea, setIdea] = useState<ResearchIdea | null>(null);

    useEffect(() => {
        if (!id) return;
        try {
            const raw = localStorage.getItem(`outliner:${id}`);
            if (raw) {
                setIdea(JSON.parse(raw));
            }
        } catch {
            // ignore
        }
    }, [id]);

    return (
        <div className="min-h-[100vh] w-full max-w-4xl mx-auto px-4 py-10 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{idea?.title || 'Research Paper'}</h1>
                <Button variant="secondary" onClick={() => router.back()}>Back</Button>
            </div>

            {!idea ? (
                <p className="opacity-70">No content found for this paper. It may have expired from your browser storage.</p>
            ) : (
                <div className="space-y-6">
                    <section className="space-y-2">
                        <h2 className="text-xl font-semibold">Background</h2>
                        <p className="leading-relaxed whitespace-pre-line">{idea.abstract.background}</p>
                    </section>
                    <section className="space-y-2">
                        <h2 className="text-xl font-semibold">Literature Review</h2>
                        <p className="leading-relaxed whitespace-pre-line">{idea.abstract.literatureReview}</p>
                    </section>
                    <section className="space-y-2">
                        <h2 className="text-xl font-semibold">Method</h2>
                        <p className="leading-relaxed whitespace-pre-line">{idea.abstract.method}</p>
                    </section>
                    <section className="space-y-2">
                        <h2 className="text-xl font-semibold">Analysis Technique</h2>
                        <p className="leading-relaxed whitespace-pre-line">{idea.abstract.analysisTechnique}</p>
                    </section>
                    <section className="space-y-2">
                        <h2 className="text-xl font-semibold">Impact</h2>
                        <p className="leading-relaxed whitespace-pre-line">{idea.abstract.impact}</p>
                    </section>
                </div>
            )}
        </div>
    );
}


