'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Marker from '@editorjs/marker';
import InlineCode from '@editorjs/inline-code';
import Underline from '@editorjs/underline';
import '../styles/editor.css';

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

// Inline tool to expand selected text using the /api/outliner/expand-passage endpoint
class ExpandInlineTool {
    static isInline = true;
    static title = 'Expand';

    private api: any;
    private button: HTMLButtonElement;
    private config: {
        endpoint: string;
        getDocument: () => Promise<any>;
        notify?: (msg: string) => void;
    };
    private working: boolean = false;

    constructor({ api, config }: { api: any; config: any; }) {
        this.api = api;
        this.config = config || {};
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.innerText = 'Expand';
        this.button.className = 'ce-inline-tool';
    }

    render() {
        return this.button;
    }

    checkState() {
        return false;
    }

    async surround(range: Range) {
        if (this.working) return;
        try {
            this.working = true;
            this.button.disabled = true;
            const selection = range?.cloneRange?.() || range;
            const selectedText = selection?.toString?.().trim?.() || '';

            const doc = await this.config.getDocument();
            const blocks: Array<any> = Array.isArray(doc?.blocks) ? doc.blocks : [];

            // Find title (first H1 header block)
            let title = '';
            for (const b of blocks) {
                if (b?.type === 'header' && b?.data?.level === 1 && typeof b?.data?.text === 'string') {
                    title = b.data.text;
                    break;
                }
            }

            // Current block index and text
            const currentIndex = typeof this.api?.blocks?.getCurrentBlockIndex === 'function'
                ? this.api.blocks.getCurrentBlockIndex()
                : -1;
            const currentBlock = currentIndex >= 0 ? blocks[currentIndex] : null;
            const currentText = (currentBlock?.data?.text && typeof currentBlock.data.text === 'string') ? currentBlock.data.text : '';

            // Collect up to 3 previous paragraph texts
            const previousParas: string[] = [];
            if (currentIndex > 0) {
                for (let i = currentIndex - 1; i >= 0 && previousParas.length < 3; i--) {
                    const b = blocks[i];
                    if (b?.type === 'paragraph' && typeof b?.data?.text === 'string' && b.data.text.trim()) {
                        previousParas.unshift(b.data.text);
                    }
                }
            }

            const focusText = selectedText || currentText || '';
            if (!focusText) {
                this.config.notify?.('Select text or place cursor in a paragraph to expand.');
                return;
            }

            // Build context for API
            const contextParts: string[] = [];
            if (title) contextParts.push(`Title: ${title}`);
            if (previousParas.length) {
                contextParts.push(previousParas.join('\n\n'));
            }
            contextParts.push(focusText);
            const contextText = contextParts.join('\n\n');

            // Call API
            const res = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: contextText })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error || `Request failed with ${res.status}`);
            }
            const json = await res.json();
            const paragraphs: string[] = Array.isArray(json?.paragraphs) ? json.paragraphs : [];
            if (!paragraphs.length) {
                this.config.notify?.('No expanded content returned.');
                return;
            }

            // Replace current paragraph block with the expanded paragraphs as separate blocks
            // 1) Remove current block
            if (currentIndex >= 0) {
                try {
                    this.api.blocks.delete(currentIndex);
                } catch {}
            }

            // 2) Insert new paragraphs at the same index
            let insertionIndex = currentIndex >= 0 ? currentIndex : undefined as any;
            for (let i = 0; i < paragraphs.length; i++) {
                const p = String(paragraphs[i] || '').trim();
                if (!p) continue;
                // Replace newlines with <br> for EditorJS paragraph tool
                const html = p.replace(/\n/g, '<br>');
                try {
                    this.api.blocks.insert('paragraph', { text: html }, {}, insertionIndex, false);
                    if (typeof insertionIndex === 'number') insertionIndex++;
                } catch {}
            }

            // Focus the last inserted block
            try {
                const lastIndex = (typeof insertionIndex === 'number' ? insertionIndex : this.api.blocks.getBlocksCount()) - 1;
                if (lastIndex >= 0) this.api.caret?.setToBlock?.(lastIndex, 'end');
            } catch {}

            this.config.notify?.('Expanded passage inserted.');
        } catch (e: any) {
            this.config.notify?.(e?.message || 'Failed to expand passage');
        } finally {
            this.working = false;
            this.button.disabled = false;
        }
    }
}

function useDebouncedCallback<T extends any[]>(fn: (...args: T) => void, delayMs = 500) {
    const timeoutRef = useRef<number | null>(null);
    return useCallback((...args: T) => {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => fn(...args), delayMs);
    }, [fn, delayMs]);
}

function paragraphsToBlocks(text: string) {
    const paragraphs = (text || '').split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length === 0) return [] as any[];
    return paragraphs.map(p => ({ type: 'paragraph', data: { text: p.replace(/\n/g, '<br>') } }));
}

function buildInitialDocumentData(idea: ResearchIdea) {
    const blocks: any[] = [];
    // Title as H1
    blocks.push({ type: 'header', data: { text: idea.title || 'Research Paper', level: 1 } });
    // Sections as H2 + paragraphs
    const sections: Array<[string, string]> = [
        ['Background', idea.abstract.background],
        ['Literature Review', idea.abstract.literatureReview],
        ['Method', idea.abstract.method],
        ['Analysis Technique', idea.abstract.analysisTechnique],
        ['Impact', idea.abstract.impact],
    ];
    sections.forEach(([heading, body]) => {
        blocks.push({ type: 'header', data: { text: heading, level: 2 } });
        blocks.push(...paragraphsToBlocks(body));
    });
    return { blocks };
}

function FullDocumentEditor({ id, idea }: { id: string; idea: ResearchIdea; }) {
    const editorRef = useRef<EditorJS | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);
    const holderId = `outliner-editor-${id}`;

    const saveDoc = useCallback(async () => {
        if (!editorRef.current) return;
        try {
            const data = await editorRef.current.save();
            localStorage.setItem(`outliner:${id}:doc`, JSON.stringify(data));
            console.log('Saved document with', data.blocks?.length || 0, 'blocks');
        } catch (error) {
            console.error('Error saving document:', error);
        }
    }, [id]);

    const debouncedSave = useDebouncedCallback(saveDoc, 600);

    useEffect(() => {
        let isMounted = true;

        const initializeEditor = async () => {
            // Destroy any existing editor first
            if (editorRef.current) {
                try {
                    await editorRef.current.destroy();
                } catch (error) {
                    console.error('Error destroying editor:', error);
                }
                editorRef.current = null;
            }

            // Clear the container
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }

            if (!isMounted) return;

            // Get initial data
            const existing = localStorage.getItem(`outliner:${id}:doc`);
            let initialData;

            if (existing) {
                try {
                    const parsedData = JSON.parse(existing);
                    if (parsedData && Array.isArray(parsedData.blocks) && parsedData.blocks.length > 0) {
                        initialData = parsedData;
                        console.log('Loaded existing document with', parsedData.blocks.length, 'blocks');
                    } else {
                        initialData = buildInitialDocumentData(idea);
                        localStorage.removeItem(`outliner:${id}:doc`);
                        console.log('Rebuilt document from idea');
                    }
                } catch (error) {
                    console.error('Error parsing localStorage data:', error);
                    initialData = buildInitialDocumentData(idea);
                    localStorage.removeItem(`outliner:${id}:doc`);
                }
            } else {
                initialData = buildInitialDocumentData(idea);
                console.log('Created new document with', initialData.blocks.length, 'blocks');
            }

            // Create the editor
            try {
                const editor = new EditorJS({
                    holder: holderId,
                    placeholder: "Start writing… Use '/' for blocks",
                    inlineToolbar: true,
                    autofocus: true,
                    tools: {
                        // Ensure paragraph inline toolbar shows our custom tool
                        paragraph: {
                            inlineToolbar: ['link', 'bold', 'italic', 'underline', 'inlineCode', 'marker', 'expand']
                        } as any,
                        header: Header as any,
                        list: List as any,
                        marker: { class: Marker } as const,
                        inlineCode: { class: InlineCode } as const,
                        underline: { class: Underline } as const,
                        expand: {
                            class: ExpandInlineTool as any,
                            config: {
                                endpoint: '/api/outliner/expand-passage',
                                getDocument: async () => {
                                    try {
                                        if (editorRef.current) {
                                            return await editorRef.current.save();
                                        }
                                    } catch {}
                                    return { blocks: [] };
                                },
                                notify: (msg: string) => {
                                    try { console.log(msg); } catch {}
                                }
                            }
                        } as any,
                    },
                    data: initialData,
                    onChange: () => {
                        debouncedSave();
                    },
                    onReady: () => {
                        if (isMounted) {
                            console.log('EditorJS is ready');
                            setIsReady(true);
                        }
                    }
                });

                if (isMounted) {
                    editorRef.current = editor;
                }
            } catch (error) {
                console.error('Error initializing EditorJS:', error);
            }
        };

        // Initialize after a small delay to ensure DOM is ready
        const timeoutId = setTimeout(initializeEditor, 50);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            if (editorRef.current) {
                try {
                    editorRef.current.destroy();
                } catch (error) {
                    console.error('Error destroying editor:', error);
                }
                editorRef.current = null;
            }
            setIsReady(false);
        };
    }, [id, idea, holderId, debouncedSave]);

    return (
        <div className="prose prose-neutral max-w-none">
            {!isReady && (
                <div className="text-center py-8 text-gray-500">
                    Loading editor...
                </div>
            )}
            <div
                id={holderId}
                ref={containerRef}
                style={{
                    display: isReady ? 'block' : 'none',
                    minHeight: '200px',
                    position: 'relative'
                }}
                className="editor-container"
            />
        </div>
    );
}

export default function OutlinerDetailPage() {
    const params = useParams();
    const id = (params?.id as string) || '';
    const [idea, setIdea] = useState<ResearchIdea | null>(null);

    useEffect(() => {
        if (!id) return;
        try {
            const raw = localStorage.getItem(`outliner:${id}`);
            if (raw) {
                const parsedIdea = JSON.parse(raw);
                console.log('Loaded idea:', parsedIdea);
                setIdea(parsedIdea);
            }
        } catch (error) {
            console.error('Error loading idea from localStorage:', error);
            // Clear corrupted data
            localStorage.removeItem(`outliner:${id}`);
        }
    }, [id]);

    const persist = useCallback((next: ResearchIdea) => {
        setIdea(next);
        try {
            localStorage.setItem(`outliner:${id}`, JSON.stringify(next));
        } catch {
            // ignore
        }
    }, [id]);

    const clearStorageData = useCallback(() => {
        try {
            const docKey = `outliner:${id}:doc`;
            const ideaKey = `outliner:${id}`;

            console.log('Clearing storage for keys:', docKey, ideaKey);

            // Log what we're removing
            const docData = localStorage.getItem(docKey);
            const ideaData = localStorage.getItem(ideaKey);

            if (docData) {
                console.log('Removing doc data:', JSON.parse(docData));
            }
            if (ideaData) {
                console.log('Removing idea data:', JSON.parse(ideaData));
            }

            localStorage.removeItem(ideaKey);
            localStorage.removeItem(docKey);
            window.location.reload();
        } catch (error) {
            console.error('Error clearing storage:', error);
        }
    }, [id]);

    const debugStorageData = useCallback(() => {
        try {
            const docKey = `outliner:${id}:doc`;
            const ideaKey = `outliner:${id}`;

            const docData = localStorage.getItem(docKey);
            const ideaData = localStorage.getItem(ideaKey);

            console.log('=== STORAGE DEBUG ===');
            console.log('Idea data:', ideaData ? JSON.parse(ideaData) : 'None');
            console.log('Doc data:', docData ? JSON.parse(docData) : 'None');
            console.log('Current idea state:', idea);
            console.log('====================');
        } catch (error) {
            console.error('Error debugging storage:', error);
        }
    }, [id, idea]);

    return (
        <div className="min-h-[100vh] w-full max-w-3xl mx-auto px-4 py-10">
            {!idea ? (
                <div className="text-center">
                    <p className="opacity-70 mb-4">No content found for this paper. It may have expired from your browser storage.</p>
                    <button
                        onClick={() => window.history.back()}
                        className="text-blue-600 hover:text-blue-800 underline"
                    >
                        Go back to outliner
                    </button>
                </div>
            ) : (
                <FullDocumentEditor id={id} idea={idea} />
            )}
        </div>
    );
}


