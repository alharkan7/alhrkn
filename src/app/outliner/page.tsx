"use client";

import { useState, FormEvent, useEffect } from 'react';
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
        setIdeas(null);
        try {
            const res = await fetch('/api/outliner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords, numIdeas: 6 })
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || 'Failed to get ideas');
            }
            const data = await res.json();
            setIdeas(data.ideas as ResearchIdea[]);
        } catch (e: any) {
            setError(e?.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
            setHasResponded(true);
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
            const res = await fetch('/api/outliner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords: queryText.trim(), numIdeas: 6 })
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || 'Failed to get more ideas');
            }
            const data = await res.json();
            const newIdeas = (data.ideas || []) as ResearchIdea[];
            setIdeas((prev) => {
                const existing = prev || [];
                const seen = new Set(existing.map((i) => i.title.toLowerCase().trim()));
                const filtered = newIdeas.filter((i) => {
                    const key = i.title.toLowerCase().trim();
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                return [...existing, ...filtered];
            });
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
            <div className={`w-full max-w-5xl ${hasResults ? 'pt-20' : 'pt-24'} pb-28 px-4`}>
                <div className={!hasResponded ? 'min-h-[calc(100vh-13rem)] flex flex-col justify-center' : ''}>
                    {!hasResponded && (
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

                {ideas && <IdeasGrid ideas={ideas} />}
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


