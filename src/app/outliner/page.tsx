"use client";

import { useState, FormEvent, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
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

type Language = 'en' | 'id';

export default function OutlinerPage() {
    const router = useRouter();
    const [queryText, setQueryText] = useState<string>('');
    const [language, setLanguage] = useState<Language>('en');
    const [ideas, setIdeas] = useState<ResearchIdea[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [hasResponded, setHasResponded] = useState<boolean>(false);
    const controllerRef = useRef<AbortController | null>(null);
    // removed expectedCount-based skeleton logic

    // Function to handle language change
    const handleLanguageChange = (newLanguage: Language) => {
        console.log('Language changing from', language, 'to', newLanguage);
        setLanguage(newLanguage);
        localStorage.setItem('outliner-language', newLanguage);

        // Refetch ideas if we have a query and results, so they appear in the new language
        if (queryText.trim() && ideas && ideas.length > 0) {
            fetchIdeas(queryText.trim());
        }
    };

    // Function to toggle language
    const toggleLanguage = () => {
        const newLanguage = language === 'en' ? 'id' : 'en';
        handleLanguageChange(newLanguage);
    };

    // Initialize from URL parameter (?q=...) and localStorage for language
    useEffect(() => {
        try {
            // Load language preference from localStorage
            const savedLanguage = localStorage.getItem('outliner-language') as Language;
            if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'id')) {
                setLanguage(savedLanguage);
            }

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

    // Debug language changes
    useEffect(() => {
        console.log('Language state changed to:', language);
    }, [language]);

    const fetchIdeas = async (keywords: string) => {
        setIsLoading(true);
        setError(null);
        setIdeas([]);
        try {
            if (controllerRef.current) controllerRef.current.abort();
            controllerRef.current = new AbortController();

            // Debug logging
            console.log('Sending request with language:', language);

            const res = await fetch('/api/outliner/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords, numIdeas: 6, language }),
                signal: controllerRef.current.signal,
            });
            if (!res.ok || !res.body) {
                const data = await res.json().catch(() => ({} as any));
                throw new Error(data?.error || (language === 'en' ? 'Failed to get ideas' : 'Gagal mendapatkan ide'));
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
                setError(e?.message || (language === 'en' ? 'Something went wrong' : 'Terjadi kesalahan'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!queryText.trim() || queryText.trim().length < 10) return;
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
            console.log('Appending ideas with language:', language);
            const res = await fetch('/api/outliner/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords: queryText.trim(), numIdeas: 6, language })
            });
            if (!res.ok || !res.body) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || (language === 'en' ? 'Failed to get more ideas' : 'Gagal mendapatkan ide tambahan'));
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
            setError(e?.message || (language === 'en' ? 'Something went wrong' : 'Terjadi kesalahan'));
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
                            {language === 'en' ? 'What do you want to research?' : 'Apa yang ingin kamu riset?'}
                        </h1>
                    )}

                    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
                        <div className="w-full flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="relative w-full sm:flex-1">
                                <Input
                                    value={queryText}
                                    onChange={(e) => setQueryText(e.target.value)}
                                    placeholder={language === 'en' ? "Type your keywords or school major..." : "Input kata kunci atau jurusan studi..."}
                                    className="h-12 text-base rounded-full w-full pl-5 pr-20"
                                />
                                <div className="absolute right-3 top-[47%] transform -translate-y-1/2">
                                    <Button
                                        type="button"
                                        variant="neutral"
                                        size="sm"
                                        onClick={toggleLanguage}
                                        className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                                        title={language === 'en' ? 'Switch to Bahasa Indonesia' : 'Switch to English'}
                                    >
                                        <Globe className="h-4 w-4" />
                                    </Button>
                                </div>
                                {/* Debug: Show current language */}
                                {/* <div className="absolute right-16 top-[47%] transform -translate-y-1/2 text-xs text-gray-500">
                                    {language === 'en' ? 'EN' : 'ID'}
                                </div> */}
                            </div>
                            <Button
                                type="submit"
                                className="h-12 px-6 text-base rounded-full w-full sm:w-auto"
                                disabled={isLoading || !queryText.trim() || queryText.trim().length < 10}
                            >
                                {isLoading ? (language === 'en' ? 'Researching...' : 'Researching...') : (language === 'en' ? 'Outline' : 'Outline')}
                            </Button>
                        </div>
                    </form>
                </div>

                {error && (
                    <div className="mt-6 text-center text-red-500 text-sm">
                        {language === 'en' ? error : (error === 'Failed to get ideas' ? 'Gagal mendapatkan ide' : error === 'Failed to get more ideas' ? 'Gagal mendapatkan ide tambahan' : error)}
                    </div>
                )}

                {ideas && (
                    <IdeasGrid
                        ideas={ideas}
                        isLoading={isLoading}
                        isLoadingMore={isLoadingMore}
                        language={language}
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
                            {isLoadingMore ? (language === 'en' ? 'Loading more...' : 'Memuat lebih banyak...') : (language === 'en' ? 'Show More' : 'Tampilkan Lebih Banyak')}
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
