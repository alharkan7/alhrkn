"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import EditorJS from '@editorjs/editorjs';
import { ResearchIdea, buildInitialDocumentData, convertMarkdownToEditorJS, convertToMarkdown, convertToPlainText, renderPdfFromEditorData, buildBibliographyMarkdown, buildBibliographyPlain } from './utils';
import { SPARKLES_ICON_SVG } from '../components/svg-icons';

// Debounced callback
export function useDebouncedCallback<T extends any[]>(fn: (...args: T) => void, delayMs = 500) {
    const timeoutRef = useRef<number | null>(null);
    return useCallback((...args: T) => {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => fn(...args), delayMs);
    }, [fn, delayMs]);
}

// Streaming outline and minimal tail diff application
export function useStreamingOutline(params: {
    id: string;
    idea: ResearchIdea;
    language: 'en' | 'id';
    editorRef: MutableRefObject<EditorJS | null>;
}) {
    const { id, idea, language, editorRef } = params;
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingBlocks, setStreamingBlocks] = useState<any[]>([]);
    const streamingInitiatedRef = useRef(false);
    const markdownBufferRef = useRef<string>('');
    const streamingRenderTimerRef = useRef<number | null>(null);
    const lastAppliedBlocksRef = useRef<any[]>([]);

    const createSkeletonBlocks = useCallback(() => {
        const isIndonesian = language === 'id';
        return [
            { type: 'header', data: { text: idea.title || (isIndonesian ? 'Judul Penelitian' : 'Research Title'), level: 1 } },
            { type: 'header', data: { text: isIndonesian ? '1. Pendahuluan' : '1. Introduction', level: 2 } },
            { type: 'paragraph', data: { text: '<div class="loading-skeleton" style="height: 20px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>' } },
            { type: 'header', data: { text: isIndonesian ? '2. Metodologi' : '2. Methodology', level: 2 } },
            { type: 'paragraph', data: { text: '<div class="loading-skeleton" style="height: 20px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>' } },
            { type: 'header', data: { text: isIndonesian ? '3. Dampak yang Diharapkan' : '3. Expected Impact', level: 2 } },
            { type: 'paragraph', data: { text: '<div class="loading-skeleton" style="height: 20px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>' } },
        ];
    }, [idea.title, language]);

    const applyBlocksTailDiff = useCallback(async (nextBlocks: any[]) => {
        if (!editorRef.current) return;
        const prevBlocks = lastAppliedBlocksRef.current || [];
        const blocksEqual = (a: any, b: any) => {
            if (!a || !b) return false;
            if (a.type !== b.type) return false;
            try { return JSON.stringify(a.data) === JSON.stringify(b.data); } catch { return false; }
        };
        let divergeAt = 0;
        const minLen = Math.min(prevBlocks.length, nextBlocks.length);
        while (divergeAt < minLen && blocksEqual(prevBlocks[divergeAt], nextBlocks[divergeAt])) {
            divergeAt++;
        }
        if (divergeAt === prevBlocks.length && divergeAt === nextBlocks.length) return;
        const api = (editorRef.current as any).blocks;
        const currentCount = api.getBlocksCount();
        if (Math.abs(currentCount - prevBlocks.length) > 5 && nextBlocks.length < 300) {
            await editorRef.current.clear();
            await editorRef.current.render({ blocks: nextBlocks });
            lastAppliedBlocksRef.current = nextBlocks;
            return;
        }
        for (let idx = currentCount - 1; idx >= divergeAt; idx--) {
            try { api.delete(idx); } catch {}
        }
        for (let idx = divergeAt; idx < nextBlocks.length; idx++) {
            const b = nextBlocks[idx];
            try { await api.insert(b.type, b.data, undefined, idx); } catch {}
        }
        lastAppliedBlocksRef.current = nextBlocks;
    }, [editorRef]);

    const startStreaming = useCallback(async () => {
        if (streamingInitiatedRef.current || !idea) return;
        streamingInitiatedRef.current = true;
        setIsStreaming(true);
        const skeletonBlocks = createSkeletonBlocks();
        setStreamingBlocks(skeletonBlocks);
        try {
            const response = await fetch('/api/outliner/expand-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea, language }),
            });
            if (!response.ok) throw new Error('Failed to start streaming');
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error('No reader available');
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'chunk' && typeof data.text === 'string') {
                                markdownBufferRef.current += data.text;
                                const blocks = convertMarkdownToEditorJS(markdownBufferRef.current);
                                setStreamingBlocks(blocks);
                                if (editorRef.current) {
                                    if (streamingRenderTimerRef.current) {
                                        try { window.clearTimeout(streamingRenderTimerRef.current); } catch {}
                                    }
                                    streamingRenderTimerRef.current = window.setTimeout(async () => {
                                        try {
                                            await applyBlocksTailDiff(blocks);
                                            localStorage.setItem(`outliner:${id}:doc`, JSON.stringify({ blocks }));
                                        } catch (e) {
                                            console.error('Error applying streaming diff:', e);
                                        }
                                    }, 250);
                                }
                            } else if (data.type === 'completed') {
                                setIsStreaming(false);
                                const finalData = { blocks: convertMarkdownToEditorJS(markdownBufferRef.current) };
                                localStorage.setItem(`outliner:${id}:expanded`, JSON.stringify(finalData));
                                localStorage.setItem(`outliner:${id}:doc`, JSON.stringify(finalData));
                                lastAppliedBlocksRef.current = finalData.blocks;
                            } else if (data.type === 'error') {
                                throw new Error(data.error || 'Streaming error');
                            }
                        } catch (parseError) {
                            console.error('Error parsing streaming data:', parseError);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Streaming error:', error);
            setIsStreaming(false);
            const fallbackData = buildInitialDocumentData(idea);
            setStreamingBlocks(fallbackData.blocks);
            localStorage.setItem(`outliner:${id}:doc`, JSON.stringify(fallbackData));
            if (editorRef.current) {
                try {
                    await editorRef.current.clear();
                    await editorRef.current.render(fallbackData);
                } catch (e) {
                    console.error('Error rendering fallback data:', e);
                }
            }
        }
    }, [applyBlocksTailDiff, createSkeletonBlocks, editorRef, idea, id, language]);

    return { isStreaming, streamingBlocks, setStreamingBlocks, startStreaming, lastAppliedBlocksRef, applyBlocksTailDiff };
}

// Local storage and initialization helpers
export function useDocumentStorage(id: string, idea: ResearchIdea, language: 'en' | 'id') {
    const createSkeletonBlocks = useCallback(() => {
        const isIndonesian = language === 'id';
        return [
            { type: 'header', data: { text: idea.title || (isIndonesian ? 'Judul Penelitian' : 'Research Title'), level: 1 } },
            { type: 'header', data: { text: isIndonesian ? '1. Pendahuluan' : '1. Introduction', level: 2 } },
            { type: 'paragraph', data: { text: '<div class="loading-skeleton" style="height: 20px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>' } },
        ];
    }, [idea.title, language]);

    const loadInitial = useCallback(() => {
        const existing = localStorage.getItem(`outliner:${id}:doc`);
        const expandedOutline = localStorage.getItem(`outliner:${id}:expanded`);
        let initialData: any = undefined;
        let shouldStartStreaming = false;
        if (existing) {
            try {
                const parsedData = JSON.parse(existing);
                if (parsedData && Array.isArray(parsedData.blocks) && parsedData.blocks.length > 0) {
                    initialData = parsedData;
                } else {
                    initialData = { blocks: createSkeletonBlocks() };
                    shouldStartStreaming = true;
                }
            } catch {
                initialData = { blocks: createSkeletonBlocks() };
                shouldStartStreaming = true;
                localStorage.removeItem(`outliner:${id}:doc`);
            }
        } else if (expandedOutline) {
            try {
                const parsedExpanded = JSON.parse(expandedOutline);
                if (parsedExpanded && Array.isArray(parsedExpanded.blocks) && parsedExpanded.blocks.length > 0) {
                    initialData = parsedExpanded;
                } else {
                    initialData = { blocks: createSkeletonBlocks() };
                    shouldStartStreaming = true;
                    localStorage.removeItem(`outliner:${id}:expanded`);
                }
            } catch {
                initialData = { blocks: createSkeletonBlocks() };
                shouldStartStreaming = true;
                localStorage.removeItem(`outliner:${id}:expanded`);
            }
        } else {
            initialData = { blocks: createSkeletonBlocks() };
            shouldStartStreaming = true;
        }
        return { initialData, shouldStartStreaming };
    }, [createSkeletonBlocks, id]);

    const saveDoc = useCallback(async (editorRef: MutableRefObject<EditorJS | null>) => {
        if (!editorRef.current) return;
        try {
            const data = await editorRef.current.save();
            localStorage.setItem(`outliner:${id}:doc`, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving document:', error);
        }
    }, [id]);

    return { loadInitial, saveDoc };
}

// Mini AI toolbar management
export function useMiniToolbar(holderId: string) {
    const miniToolbarRef = useRef<HTMLDivElement | null>(null);
    const selectionHandlerRef = useRef<((this: Document, ev: Event) => any) | null>(null);
    const scrollHandlerRef = useRef<((this: Window, ev: Event) => any) | null>(null);
    const pointerUpHandlerRef = useRef<((this: HTMLElement, ev: Event) => any) | null>(null);
    const keyHandlerRef = useRef<((this: Document, ev: Event) => any) | null>(null);
    const inputHandlerRef = useRef<((this: Document, ev: Event) => any) | null>(null);
    const showDelayTimerRef = useRef<number | null>(null);
    const suppressUntilNextPointerRef = useRef<boolean>(false);
    const warmedToolsRef = useRef<boolean>(false);
    const lastScrollTsRef = useRef<number>(0);
    const rescheduleCountRef = useRef<number>(0);

    const hideMiniToolbar = useCallback(() => {
        try { if (miniToolbarRef.current) miniToolbarRef.current.style.display = 'none'; } catch {}
    }, []);

    const isCaretInsideEditor = useCallback((holder: string): boolean => {
        try {
            const root = document.getElementById(holder);
            const sel = window.getSelection();
            if (!root || !sel || sel.rangeCount === 0) return false;
            const node = sel.getRangeAt(0).startContainer;
            const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : (node.parentElement as Element | null);
            return !!(el && root.contains(el));
        } catch {
            return false;
        }
    }, []);

    const ensureMiniAIToolbar = useCallback((editorRoot: HTMLElement): HTMLDivElement => {
        const existing = editorRoot.querySelector('[data-mini-ai-toolbar="true"]') as HTMLDivElement | null;
        if (existing) return existing;
        const toolbar = document.createElement('div');
        toolbar.setAttribute('data-mini-ai-toolbar', 'true');
        toolbar.style.position = 'absolute';
        toolbar.style.zIndex = '50';
        toolbar.style.display = 'none';
        toolbar.style.gap = '6px';
        toolbar.style.padding = '6px';
        toolbar.style.borderRadius = '8px';
        toolbar.style.border = '1px solid rgba(0,0,0,0.12)';
        toolbar.style.background = 'var(--bw, #fff)';
        toolbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)';
        // Sparkles badge
        const badge = document.createElement('div');
        badge.setAttribute('data-mini-ai-badge', 'true');
        badge.style.display = 'inline-flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'center';
        badge.style.width = '22px';
        badge.style.height = '22px';
        badge.style.color = 'var(--main, #111)';
        badge.style.background = 'var(--bw, #fff)';
        badge.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
        badge.style.marginRight = '2px';
        badge.innerHTML = SPARKLES_ICON_SVG;
        const makeBtn = (label: string, dataset: string, eventName: string) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = label;
            btn.className = 'px-2 py-1 text-xs rounded-md border';
            btn.style.background = 'var(--bw, #fff)';
            btn.style.color = 'var(--text, #111)';
            btn.style.borderColor = 'rgba(0,0,0,0.12)';
            btn.style.cursor = 'pointer';
            btn.setAttribute('data-mini-ai-btn', dataset);
            btn.addEventListener('click', () => {
                try {
                    const sel = window.getSelection();
                    if (sel && sel.rangeCount > 0) {
                        const range = sel.getRangeAt(0);
                        if (range.collapsed) {
                            const startEl = range.startContainer.nodeType === Node.ELEMENT_NODE
                                ? (range.startContainer as Element)
                                : (range.startContainer.parentElement as Element | null);
                            let editable: HTMLElement | null = startEl ? (startEl.closest('[contenteditable="true"]') as HTMLElement | null) : null;
                            if (!editable) {
                                const block = startEl?.closest('.ce-block__content') as HTMLElement | null;
                                editable = block ? (block.querySelector('[contenteditable="true"]') as HTMLElement | null) : null;
                            }
                            if (editable) {
                                const newRange = document.createRange();
                                newRange.selectNodeContents(editable);
                                sel.removeAllRanges();
                                sel.addRange(newRange);
                            }
                        }
                    }
                } catch {}
                setTimeout(() => { try { window.dispatchEvent(new CustomEvent(eventName)); } catch {} }, 0);
            });
            return btn;
        };
        const expandBtn = makeBtn('Expand', 'expand', 'outliner-ai-expand-current');
        const paraphraseBtn = makeBtn('Paraphrase', 'paraphrase', 'outliner-ai-paraphrase-current');
        const citeBtn = makeBtn('Cite', 'cite', 'outliner-ai-cite-current');
        const chatBtn = makeBtn('Chat', 'chat', 'outliner-ai-chat-current');
        toolbar.appendChild(badge);
        toolbar.appendChild(expandBtn);
        toolbar.appendChild(paraphraseBtn);
        toolbar.appendChild(citeBtn);
        toolbar.appendChild(chatBtn);
        editorRoot.style.position = 'relative';
        editorRoot.appendChild(toolbar);
        return toolbar;
    }, []);

    const positionMiniToolbar = useCallback((editorRoot: HTMLElement, toolbar: HTMLDivElement) => {
        try {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const range = sel.getRangeAt(0);
            const rects = range.getClientRects();
            let rect = rects.length > 0 ? rects[0] : null as DOMRect | null;
            if (!rect || (rect.width === 0 && rect.height === 0)) {
                try {
                    const anchorNode = range.startContainer;
                    const anchorEl = anchorNode.nodeType === Node.ELEMENT_NODE
                        ? (anchorNode as Element)
                        : (anchorNode.parentElement as Element | null);
                    let editable: HTMLElement | null = anchorEl ? (anchorEl.closest('[contenteditable="true"]') as HTMLElement | null) : null;
                    if (!editable) {
                        const block = anchorEl?.closest('.ce-block__content') as HTMLElement | null;
                        editable = block ? (block.querySelector('[contenteditable="true"]') as HTMLElement | null) : null;
                    }
                    const altRect = (editable ? editable.getBoundingClientRect() : (anchorEl ? anchorEl.getBoundingClientRect() : null));
                    if (altRect) rect = altRect as DOMRect;
                } catch {}
            }
            if (!rect) return;
            const containerRect = editorRoot.getBoundingClientRect();
            toolbar.style.visibility = 'hidden';
            toolbar.style.display = 'flex';
            const toolbarRect = toolbar.getBoundingClientRect();
            const toolbarWidth = toolbarRect.width;
            const toolbarHeight = toolbarRect.height;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const cursorX = rect.left; const cursorY = rect.top;
            const spaceToRight = viewportWidth - cursorX; const spaceToLeft = cursorX;
            let leftPosition: number;
            if (spaceToRight >= toolbarWidth + 10) {
                leftPosition = cursorX - containerRect.left;
            } else if (spaceToLeft >= toolbarWidth + 10) {
                leftPosition = cursorX - containerRect.left - toolbarWidth;
            } else {
                leftPosition = (spaceToRight > spaceToLeft)
                    ? cursorX - containerRect.left
                    : cursorX - containerRect.left - toolbarWidth;
            }
            const maxLeft = Math.max(0, editorRoot.clientWidth - toolbarWidth - 10);
            const minLeft = 10;
            leftPosition = Math.max(minLeft, Math.min(maxLeft, leftPosition));
            let topPosition: number;
            const spaceAbove = cursorY; const spaceBelow = viewportHeight - cursorY;
            if (spaceAbove >= toolbarHeight + 10) {
                topPosition = cursorY - containerRect.top - toolbarHeight - 8;
            } else if (spaceBelow >= toolbarHeight + 10) {
                topPosition = cursorY - containerRect.top + 24;
            } else {
                topPosition = (spaceAbove > spaceBelow)
                    ? Math.max(10, cursorY - containerRect.top - toolbarHeight - 8)
                    : cursorY - containerRect.top + 24;
            }
            const maxTop = Math.max(0, editorRoot.clientHeight - toolbarHeight - 10);
            const minTop = 10;
            topPosition = Math.max(minTop, Math.min(maxTop, topPosition));
            toolbar.style.top = `${topPosition}px`;
            toolbar.style.left = `${leftPosition}px`;
            toolbar.style.visibility = 'visible';
        } catch {}
    }, []);

    const cancelScheduledMiniShow = useCallback(() => {
        if (showDelayTimerRef.current) {
            try { window.clearTimeout(showDelayTimerRef.current); } catch {}
            showDelayTimerRef.current = null;
        }
    }, []);

    const scheduleMiniToolbarShow = useCallback((editorRoot: HTMLElement) => {
        try {
            if (suppressUntilNextPointerRef.current) return;
            cancelScheduledMiniShow();
            showDelayTimerRef.current = window.setTimeout(() => {
                try {
                    const mt = miniToolbarRef.current || ensureMiniAIToolbar(editorRoot);
                    const sel = window.getSelection();
                    const hasSel = !!(sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed);
                    const shouldShow = isCaretInsideEditor(holderId) && !hasSel && !suppressUntilNextPointerRef.current;
                    const sinceScroll = Date.now() - lastScrollTsRef.current;
                    if (shouldShow && sinceScroll < 180 && rescheduleCountRef.current < 4) {
                        rescheduleCountRef.current += 1;
                        scheduleMiniToolbarShow(editorRoot);
                        return;
                    }
                    rescheduleCountRef.current = 0;
                    if (shouldShow) {
                        mt.style.display = 'flex';
                        positionMiniToolbar(editorRoot, mt);
                    }
                } catch {}
            }, 600);
        } catch {}
    }, [cancelScheduledMiniShow, ensureMiniAIToolbar, holderId, isCaretInsideEditor, positionMiniToolbar]);

    const warmInlineToolsOnce = useCallback((editorRoot: HTMLElement) => {
        try {
            const editable = editorRoot.querySelector('[contenteditable="true"]') as HTMLElement | null;
            if (!editable || !editable.firstChild) return;
            const targetNode = editable.firstChild as Node;
            const sel = window.getSelection();
            if (!sel) return;
            const prevRanges: Range[] = [];
            for (let i = 0; i < sel.rangeCount; i++) prevRanges.push(sel.getRangeAt(i).cloneRange());
            const tempRange = document.createRange();
            try { tempRange.setStart(targetNode, 0); tempRange.setEnd(targetNode, Math.min(1, (targetNode.textContent || '').length)); }
            catch { tempRange.selectNodeContents(editable); }
            sel.removeAllRanges(); sel.addRange(tempRange);
            setTimeout(() => { try { sel.removeAllRanges(); prevRanges.forEach(r => sel.addRange(r)); } catch {} }, 10);
        } catch {}
    }, []);

    useEffect(() => {
        const editorRoot = document.getElementById(holderId) as HTMLElement | null;
        if (!editorRoot) return;
        const onSelectionChange = () => {
            try {
                const mt = miniToolbarRef.current || (editorRoot ? ensureMiniAIToolbar(editorRoot) : null);
                if (!mt) return;
                const sel = window.getSelection();
                const hasSel = !!(sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed);
                if (hasSel) {
                    hideMiniToolbar();
                } else if (mt.style.display !== 'none') {
                    positionMiniToolbar(editorRoot!, mt);
                }
            } catch {}
        };
        document.addEventListener('selectionchange', onSelectionChange);
        selectionHandlerRef.current = onSelectionChange;
        const onScroll = () => { lastScrollTsRef.current = Date.now(); if (miniToolbarRef.current) miniToolbarRef.current.style.display = 'none'; };
        window.addEventListener('scroll', onScroll, { passive: true } as any);
        scrollHandlerRef.current = onScroll as any;
        const onPointerUp = () => { try { suppressUntilNextPointerRef.current = false; scheduleMiniToolbarShow(editorRoot!); } catch {} };
        editorRoot.addEventListener('pointerup', onPointerUp as any);
        pointerUpHandlerRef.current = onPointerUp as any;
        const onKeyOrInput = () => { suppressUntilNextPointerRef.current = true; cancelScheduledMiniShow(); hideMiniToolbar(); };
        document.addEventListener('keydown', onKeyOrInput);
        document.addEventListener('beforeinput', onKeyOrInput as any);
        keyHandlerRef.current = onKeyOrInput;
        inputHandlerRef.current = onKeyOrInput as any;
        if (!warmedToolsRef.current) { setTimeout(() => { try { warmInlineToolsOnce(editorRoot); warmedToolsRef.current = true; } catch {} }, 80); }
        return () => {
            try {
                if (selectionHandlerRef.current) document.removeEventListener('selectionchange', selectionHandlerRef.current);
                if (scrollHandlerRef.current) window.removeEventListener('scroll', scrollHandlerRef.current as any);
                if (editorRoot && pointerUpHandlerRef.current) editorRoot.removeEventListener('pointerup', pointerUpHandlerRef.current as any);
                if (keyHandlerRef.current) document.removeEventListener('keydown', keyHandlerRef.current);
                if (inputHandlerRef.current) document.removeEventListener('beforeinput', inputHandlerRef.current as any);
                if (showDelayTimerRef.current) { try { window.clearTimeout(showDelayTimerRef.current); } catch {} showDelayTimerRef.current = null; }
            } catch {}
        };
    }, [cancelScheduledMiniShow, ensureMiniAIToolbar, hideMiniToolbar, holderId, positionMiniToolbar, scheduleMiniToolbarShow, warmInlineToolsOnce]);

    return { miniToolbarRef };
}

// Downloads (pdf/markdown/txt/doc)
export function useDownloads(params: { idea: ResearchIdea; editorRef: MutableRefObject<EditorJS | null>; language: 'en' | 'id' }) {
    const { idea, editorRef } = params;
    const handleDownload = useCallback(async (format: 'pdf' | 'markdown' | 'txt' | 'docx') => {
        if (!editorRef.current) return;
        const data = await editorRef.current.save();
        if (format === 'pdf') {
            await renderPdfFromEditorData(idea.title || 'document', data);
            return;
        }
        let content = '';
        let filename = '';
        let mimeType = '';
        switch (format) {
            case 'markdown': {
                const main = convertToMarkdown(data);
                const bib = buildBibliographyMarkdown([]);
                content = `${main}${bib}`; filename = `${idea.title || 'document'}.md`; mimeType = 'text/markdown';
                break;
            }
            case 'txt': {
                const main = convertToPlainText(data);
                const bib = buildBibliographyPlain([]);
                content = `${main}${bib}`; filename = `${idea.title || 'document'}.txt`; mimeType = 'text/plain';
                break;
            }
            case 'docx': {
                const html = document.createElement('div');
                html.innerHTML = '';
                content = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><title>${idea.title || 'Document'}</title></head><body></body></html>`;
                filename = `${idea.title || 'document'}.doc`; mimeType = 'application/msword';
                break;
            }
        }
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    }, [editorRef, idea.title]);
    return { handleDownload };
}

// Chat panel and document context
export function useChatPanel(params: { idea: ResearchIdea; editorRef: MutableRefObject<EditorJS | null> }) {
    const { idea, editorRef } = params;
    const [showChat, setShowChat] = useState(false);
    const [documentContext, setDocumentContext] = useState<string>('');
    const [selectedText, setSelectedText] = useState<string>('');
    const getDocumentContext = useCallback(async (): Promise<string> => {
        if (!editorRef.current) return '';
        try {
            const data = await editorRef.current.save();
            const plainText = convertToPlainText(data);
            return `Document Title: ${idea.title}\n\nContent:\n${plainText}`;
        } catch {
            return `Document Title: ${idea.title}`;
        }
    }, [editorRef, idea.title]);
    const handleOpenChat = useCallback(async (maybeSelected?: string) => {
        const context = await getDocumentContext();
        if (maybeSelected) setSelectedText(maybeSelected);
        setDocumentContext(context);
        setShowChat(true);
    }, [getDocumentContext]);
    const handleCloseChat = useCallback(() => { setShowChat(false); setSelectedText(''); }, []);
    return { showChat, documentContext, selectedText, handleOpenChat, handleCloseChat };
}

// Email + download orchestration
export function useEmailDownload() {
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [pendingDownloadAction, setPendingDownloadAction] = useState<(() => void) | null>(null);
    const [pendingDownloadFormat, setPendingDownloadFormat] = useState<string>('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const initiateDownload = useCallback((format: string, downloadAction: () => void) => {
        setPendingDownloadFormat(format);
        setPendingDownloadAction(() => downloadAction);
        setShowEmailForm(true);
    }, []);
    const handleEmailSubmit = useCallback(async (email: string, fileName: string) => {
        setEmailLoading(true);
        setEmailError(null);
        try {
            fetch('/api/outliner/email', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, downloadFormat: pendingDownloadFormat, fileName })
            }).catch(() => {});
            if (pendingDownloadAction) pendingDownloadAction();
            setShowEmailForm(false); setPendingDownloadAction(null); setPendingDownloadFormat('');
        } catch {
            setEmailError('Failed to process your request. Please try again.');
        } finally {
            setEmailLoading(false);
        }
    }, [pendingDownloadAction, pendingDownloadFormat]);
    return { showEmailForm, pendingDownloadFormat, emailLoading, emailError, initiateDownload, handleEmailSubmit, setShowEmailForm, setPendingDownloadAction, setPendingDownloadFormat };
}


