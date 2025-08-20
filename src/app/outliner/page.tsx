"use client";

import { useState, FormEvent, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AppsFooter from '@/components/apps-footer'
import { AppsHeader } from '@/components/apps-header'
import IdeasGrid from './components/IdeasGrid'
import { useRouter } from 'next/navigation';

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

export default function OutlinerPage() {
    const router = useRouter();
    const [queryText, setQueryText] = useState<string>('');
    const [ideas, setIdeas] = useState<ResearchIdea[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [hasResponded, setHasResponded] = useState<boolean>(false);
    const controllerRef = useRef<AbortController | null>(null);
    // removed expectedCount-based skeleton logic

    // Initialize from URL parameter (?q=...)
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const q = params.get('q');
            if (q && q.trim()) {
                setQueryText(q);
                setHasResponded(false);
                fetchIdeas(q.trim());
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchIdeas = async (keywords: string) => {
        setIsLoading(true);
        setError(null);
        setIdeas([]);
        try {
            if (controllerRef.current) controllerRef.current.abort();
            controllerRef.current = new AbortController();

            const res = await fetch('/api/outliner/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords, numIdeas: 6 }),
                signal: controllerRef.current.signal,
            });
            if (!res.ok || !res.body) {
                const data = await res.json().catch(() => ({} as any));
                throw new Error(data?.error || 'Failed to get ideas');
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            setHasResponded(true);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let idx: number;
                while ((idx = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, idx);
                    buffer = buffer.slice(idx + 1);
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    try {
                        const idea = JSON.parse(trimmed) as ResearchIdea;
                        console.log('Processing idea from stream:', { title: idea.title, currentCount: ideas?.length || 0 });
                        setIdeas((prev) => {
                            const existing = Array.isArray(prev) ? prev : [];
                            const seen = new Set(existing.map((i) => i.title.toLowerCase().trim()));
                            const key = String(idea?.title || '').toLowerCase().trim();
                            if (!key || seen.has(key)) {
                                console.log('Filtered out duplicate idea:', { title: idea?.title, existingCount: existing.length });
                                return existing;
                            }
                            console.log('Adding new idea:', { title: idea?.title, newCount: existing.length + 1 });
                            return [...existing, idea];
                        });
                    } catch {}
                }
            }

            const last = buffer.trim();
            if (last) {
                try {
                    const idea = JSON.parse(last) as ResearchIdea;
                    setIdeas((prev) => {
                        const existing = Array.isArray(prev) ? prev : [];
                        const seen = new Set(existing.map((i) => i.title.toLowerCase().trim()));
                        const key = String(idea?.title || '').toLowerCase().trim();
                        if (!key || seen.has(key)) return existing;
                        return [...existing, idea];
                    });
                } catch {}
            }
        } catch (e: any) {
            if (e?.name !== 'AbortError') {
                setError(e?.message || 'Something went wrong');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!queryText.trim()) return;
        setHasResponded(false);
        // Sync query to URL (?q=...)
        try {
            const params = new URLSearchParams(window.location.search);
            params.set('q', queryText.trim());
            router.replace(`?${params.toString()}`);
        } catch {}
        fetchIdeas(queryText.trim());
    };

    const hasResults = Array.isArray(ideas) && ideas.length > 0;

    const appendIdeas = async () => {
        if (!queryText.trim()) return;
        setIsLoadingMore(true);
        setError(null);
        try {
            // rely on isLoadingMore to control skeleton visibility
            const res = await fetch('/api/outliner/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords: queryText.trim(), numIdeas: 6 })
            });
            if (!res.ok || !res.body) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || 'Failed to get more ideas');
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                let idx: number;
                while ((idx = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, idx);
                    buffer = buffer.slice(idx + 1);
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    try {
                        const idea = JSON.parse(trimmed) as ResearchIdea;
                        console.log('Processing idea from appendIdeas:', { title: idea.title, currentCount: ideas?.length || 0 });
                        setIdeas((prev) => {
                            const existing = Array.isArray(prev) ? prev : [];
                            const seen = new Set(existing.map((i) => i.title.toLowerCase().trim()));
                            const key = String(idea?.title || '').toLowerCase().trim();
                            if (!key || seen.has(key)) {
                                console.log('Filtered out duplicate idea (append):', { title: idea?.title, existingCount: existing.length });
                                return existing;
                            }
                            console.log('Adding new idea (append):', { title: idea?.title, newCount: existing.length + 1 });
                            return [...existing, idea];
                        });
                    } catch {}
                }
            }
            const last = buffer.trim();
            if (last) {
                try {
                    const idea = JSON.parse(last) as ResearchIdea;
                    setIdeas((prev) => {
                        const existing = Array.isArray(prev) ? prev : [];
                        const seen = new Set(existing.map((i) => i.title.toLowerCase().trim()));
                        const key = String(idea?.title || '').toLowerCase().trim();
                        if (!key || seen.has(key)) return existing;
                        return [...existing, idea];
                    });
                } catch {}
            }
        } catch (e: any) {
            setError(e?.message || 'Something went wrong');
        } finally {
            setIsLoadingMore(false);
        }
    };

    return (
        <div className="min-h-[100vh] flex flex-col items-center">
            <div className="fixed top-0 left-0 right-0 z-50">
                <AppsHeader />
            </div>
            <div className={`w-full max-w-5xl ${(hasResults || isLoading) ? 'pt-20' : 'pt-24'} pb-28 px-4`}>
                <div className={!isLoading && !hasResponded ? 'min-h-[calc(100vh-13rem)] flex flex-col justify-center' : ''}>
                    {!isLoading && !hasResponded && (
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-6 text-center">
                            What do you want to research?
                        </h1>
                    )}

                    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
                        <div className="w-full flex items-center gap-2">
                            <Input
                                value={queryText}
                                onChange={(e) => setQueryText(e.target.value)}
                                placeholder="Type your keywords or school major..."
                                className="h-12 text-base rounded-full flex-1 pl-5"
                            />
                            <Button
                                type="submit"
                                className="h-12 px-6 text-base rounded-full"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Researching...' : 'Outline'}
                            </Button>
                        </div>
                    </form>
                </div>

                {error && (
                    <div className="mt-6 text-center text-red-500 text-sm">{error}</div>
                )}

                {ideas && (
                    <IdeasGrid
                        ideas={ideas}
                        isLoading={isLoading}
                        isLoadingMore={isLoadingMore}
                    />
                )}
                {/* Debug info */}
                {/* {ideas && (
                    <div className="mt-4 text-center text-sm text-gray-500">
                        Debug: {ideas.length} ideas, Loading: {isLoading ? 'Yes' : 'No'}, LoadingMore: {isLoadingMore ? 'Yes' : 'No'}
                    </div>
                )} */}
                {hasResults && (
                    <div className="mt-6 flex justify-center">
                        <Button
                            onClick={appendIdeas}
                            className="h-11 px-6 text-base rounded-full"
                            disabled={isLoading || isLoadingMore}
                        >
                            {isLoadingMore ? 'Loading more...' : 'Show More'}
                        </Button>
                    </div>
                )}
            </div>
            <div className="fixed bottom-0 left-0 right-0 py-1 px-0 text-center bg-background">
                <div className="flex-none">
                    <AppsFooter />
                </div>
            </div>
        </div>
    );
}


