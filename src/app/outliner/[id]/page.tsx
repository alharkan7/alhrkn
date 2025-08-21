'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Marker from '@editorjs/marker';
import InlineCode from '@editorjs/inline-code';
import Underline from '@editorjs/underline';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import '../styles/editor.css';
import { ExpandInlineTool } from '../tools/ExpandInlineTool';
import { CitationTool } from '../tools/CitationTool';
import { SPARKLES_ICON_SVG } from '../components/svg-icons';
import { Toolbar } from '../components/Toolbar';
import EmailForm from '../../papermap/components/EmailForm';

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

// Helper functions to convert EditorJS data to different formats
function convertToHTML(data: any): string {
    if (!data.blocks || !Array.isArray(data.blocks)) return '';
    
    return data.blocks.map((block: any) => {
        switch (block.type) {
            case 'header':
                const level = block.data.level || 1;
                return `<h${level}>${block.data.text}</h${level}>`;
            case 'paragraph':
                return `<p>${block.data.text}</p>`;
            case 'list':
                const listType = block.data.style === 'ordered' ? 'ol' : 'ul';
                const items = block.data.items.map((item: string) => `<li>${item}</li>`).join('');
                return `<${listType}>${items}</${listType}>`;
            case 'inlineCode':
                return `<code class="code">${block.data.text}</code>`;
            case 'marker':
                return `<mark>${block.data.text}</mark>`;
            case 'underline':
                return `<u>${block.data.text}</u>`;
            default:
                return `<p>${block.data.text || ''}</p>`;
        }
    }).join('\n');
}

function convertToMarkdown(data: any): string {
    if (!data.blocks || !Array.isArray(data.blocks)) return '';
    
    return data.blocks.map((block: any) => {
        switch (block.type) {
            case 'header':
                const level = block.data.level || 1;
                const hashes = '#'.repeat(level);
                return `${hashes} ${block.data.text}\n`;
            case 'paragraph':
                return `${block.data.text}\n\n`;
            case 'list':
                const listType = block.data.style === 'ordered' ? '1.' : '-';
                const items = block.data.items.map((item: string) => `  ${listType} ${item}`).join('\n');
                return `${items}\n\n`;
            case 'inlineCode':
                return `\`${block.data.text}\``;
            case 'marker':
                return `==${block.data.text}==`;
            case 'underline':
                return `<u>${block.data.text}</u>`;
            default:
                return `${block.data.text || ''}\n\n`;
        }
    }).join('');
}

function convertToPlainText(data: any): string {
    if (!data.blocks || !Array.isArray(data.blocks)) return '';
    
    return data.blocks.map((block: any) => {
        switch (block.type) {
            case 'header':
                return `${block.data.text}\n`;
            case 'paragraph':
                return `${block.data.text}\n\n`;
            case 'list':
                const items = block.data.items.map((item: string) => `  • ${item}`).join('\n');
                return `${items}\n\n`;
            case 'inlineCode':
                return block.data.text;
            case 'marker':
                return block.data.text;
            case 'underline':
                return block.data.text;
            default:
                return `${block.data.text || ''}\n\n`;
        }
    }).join('');
}

// Bibliography extraction and formatting helpers
function getBibliographyEntries(): Array<{ html: string; text: string }> {
    try {
        const container = document.getElementById('bibliography-container');
        if (!container) return [];
        const entries = Array.from(container.querySelectorAll('.reference-entry')) as HTMLElement[];
        return entries.map((entry) => {
            const p = entry.querySelector('p');
            const html = (p?.innerHTML || entry.innerHTML || '').trim();
            const text = (p?.textContent || entry.textContent || '').trim();
            return { html, text };
        }).filter(e => e.text.length > 0);
    } catch {
        return [];
    }
}

function buildBibliographyHTML(entries: Array<{ html: string; text: string }>): string {
    if (!entries || entries.length === 0) return '';
    const items = entries.map(e => `<div class="reference-item"><p>${e.html}</p></div>`).join('');
    return `
        <section>
            <h2>References</h2>
            ${items}
        </section>
    `;
}

function buildBibliographyMarkdown(entries: Array<{ html: string; text: string }>): string {
    if (!entries || entries.length === 0) return '';
    const lines = entries.map(e => `- ${e.text}`).join('\n');
    return `\n## References\n${lines}\n\n`;
}

function buildBibliographyPlain(entries: Array<{ html: string; text: string }>): string {
    if (!entries || entries.length === 0) return '';
    const lines = entries.map(e => `${e.text}`).join('\n');
    return `\nReferences\n${lines}\n`;
}

function FullDocumentEditor({ id, idea }: { id: string; idea: ResearchIdea; }) {
    const editorRef = useRef<EditorJS | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);
    const holderId = `outliner-editor-${id}`;
    const miniToolbarRef = useRef<HTMLDivElement | null>(null);
    const selectionHandlerRef = useRef<((this: Document, ev: Event) => any) | null>(null);
    const scrollHandlerRef = useRef<((this: Window, ev: Event) => any) | null>(null);
    const pointerUpHandlerRef = useRef<((this: HTMLElement, ev: Event) => any) | null>(null);
    const keyHandlerRef = useRef<((this: Document, ev: Event) => any) | null>(null);
    const inputHandlerRef = useRef<((this: Document, ev: Event) => any) | null>(null);
    const showDelayTimerRef = useRef<number | null>(null);
    const suppressUntilNextPointerRef = useRef<boolean>(false);
    const warmedToolsRef = useRef<boolean>(false);
    
    // Email form state
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [pendingDownloadAction, setPendingDownloadAction] = useState<(() => void) | null>(null);
    const [pendingDownloadFormat, setPendingDownloadFormat] = useState<string>('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);

    const initiateDownload = (format: string, downloadAction: () => void) => {
        setPendingDownloadFormat(format);
        setPendingDownloadAction(() => downloadAction);
        setShowEmailForm(true);
    };

    const handleEmailSubmit = async (email: string) => {
        setEmailLoading(true);
        setEmailError(null);
        try {
            // Send email and download format to backend
            fetch('/api/outliner/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email, 
                    downloadFormat: pendingDownloadFormat, 
                    fileName: idea.title || 'document'
                }),
            }).catch(() => { });
            
            // Trigger the download immediately
            if (pendingDownloadAction) pendingDownloadAction();
            setShowEmailForm(false);
            setPendingDownloadAction(null);
            setPendingDownloadFormat('');
        } catch (err) {
            setEmailError('Failed to process your request. Please try again.');
        } finally {
            setEmailLoading(false);
        }
    };

    const handleDownload = useCallback(async (format: 'pdf' | 'markdown' | 'txt' | 'docx') => {
        if (!editorRef.current) return;
        
        // Instead of downloading immediately, initiate the email form process
        const downloadAction = async () => {
            try {
                const data = await editorRef.current!.save();
                console.log(`Downloading as ${format}...`, data);
                
                let content: string;
                let filename: string;
                let mimeType: string;
                
                switch (format) {
                    case 'pdf':
                        // High-quality, multi-page PDF using html2canvas + jsPDF with pagination
                        {
                            const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
                            const pageWidth = pdf.internal.pageSize.getWidth();
                            const pageHeight = pdf.internal.pageSize.getHeight();
                            const margin = 40; // pt
                            const contentWidthPt = pageWidth - margin * 2;
                            const pxPerPt = 96 / 72; // px per pt
                            const contentWidthPx = Math.floor(contentWidthPt * pxPerPt);

                            const htmlMain = convertToHTML(data);
                            const htmlBib = buildBibliographyHTML(getBibliographyEntries());
                            const html = `${htmlMain}${htmlBib}`;
                            const hiddenContainer = document.createElement('div');
                            hiddenContainer.setAttribute('data-outliner-pdf-container', 'true');
                            hiddenContainer.style.position = 'fixed';
                            hiddenContainer.style.left = '-10000px';
                            hiddenContainer.style.top = '0';
                            hiddenContainer.style.width = `${contentWidthPx}px`;
                            hiddenContainer.style.padding = '0';
                            hiddenContainer.style.boxSizing = 'border-box';
                            hiddenContainer.style.background = '#ffffff';
                            hiddenContainer.style.color = '#111827';
                            hiddenContainer.style.fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, Noto Sans, sans-serif';
                            hiddenContainer.style.lineHeight = '1.7';
                            hiddenContainer.innerHTML = `
                                <style>
                                    h1 { font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #111827; }
                                    h2 { font-size: 22px; font-weight: 600; color: #1f2937; margin: 24px 0 8px; }
                                    p { font-size: 14px; margin: 0 0 12px; color: #111827; overflow-wrap: anywhere; word-break: break-word; }
                                    a { overflow-wrap: anywhere; word-break: break-word; }
                                    ul, ol { margin: 0 0 12px 22px; }
                                    code.code { background: #f3f4f6; padding: 6px 8px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; display: block; }
                                    mark { background: #fde68a; }
                                    u { text-decoration: underline; }
                                </style>
                                ${html}
                            `;
                            document.body.appendChild(hiddenContainer);

                            const canvas = await html2canvas(hiddenContainer, {
                                scale: 2,
                                backgroundColor: '#ffffff',
                                useCORS: true,
                                windowWidth: hiddenContainer.scrollWidth,
                            });

                            const imgData = canvas.toDataURL('image/png');
                            const imgWidthPt = contentWidthPt;
                            const imgHeightPt = (canvas.height * imgWidthPt) / canvas.width;

                            const usablePageHeight = pageHeight - margin * 2;
                            let heightLeft = imgHeightPt;
                            let positionY = margin;

                            // First page
                            pdf.addImage(imgData, 'PNG', margin, positionY, imgWidthPt, imgHeightPt);
                            heightLeft -= usablePageHeight;

                            // Additional pages
                            while (heightLeft > 0) {
                                pdf.addPage();
                                positionY = margin - (imgHeightPt - heightLeft);
                                pdf.addImage(imgData, 'PNG', margin, positionY, imgWidthPt, imgHeightPt);
                                heightLeft -= usablePageHeight;
                            }

                            pdf.save(`${idea.title || 'document'}.pdf`);
                            document.body.removeChild(hiddenContainer);
                        }
                        return;
                        
                    case 'markdown':
                        {
                            const main = convertToMarkdown(data);
                            const bib = buildBibliographyMarkdown(getBibliographyEntries());
                            content = `${main}${bib}`;
                        }
                        filename = `${idea.title || 'document'}.md`;
                        mimeType = 'text/markdown';
                        break;
                        
                    case 'txt':
                        {
                            const main = convertToPlainText(data);
                            const bib = buildBibliographyPlain(getBibliographyEntries());
                            content = `${main}${bib}`;
                        }
                        filename = `${idea.title || 'document'}.txt`;
                        mimeType = 'text/plain';
                        break;
                        
                    case 'docx':
                        // Save as Word-compatible HTML with .doc extension, including references
                        {
                            const htmlMain = convertToHTML(data);
                            const htmlBib = buildBibliographyHTML(getBibliographyEntries());
                            content = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><title>${idea.title || 'Document'}</title></head><body>${htmlMain}${htmlBib}</body></html>`;
                        }
                        filename = `${idea.title || 'document'}.doc`;
                        mimeType = 'application/msword';
                        break;
                }
                
                // Create and download the file
                const blob = new Blob([content], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
            } catch (error) {
                console.error('Error preparing download:', error);
            }
        };

        // Initiate email form process
        initiateDownload(format, downloadAction);
    }, [idea.title, id]);

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
                        // Try to load expanded outline first, fallback to basic outline
                        const expandedOutline = localStorage.getItem(`outliner:${id}:expanded`);
                        if (expandedOutline) {
                            try {
                                const parsedExpanded = JSON.parse(expandedOutline);
                                if (parsedExpanded && Array.isArray(parsedExpanded.blocks) && parsedExpanded.blocks.length > 0) {
                                    initialData = parsedExpanded;
                                    console.log('Loaded expanded outline with', parsedExpanded.blocks.length, 'blocks');
                                } else {
                                    initialData = buildInitialDocumentData(idea);
                                    localStorage.removeItem(`outliner:${id}:expanded`);
                                    console.log('Rebuilt document from idea (expanded outline was invalid)');
                                }
                            } catch (error) {
                                console.error('Error parsing expanded outline:', error);
                                initialData = buildInitialDocumentData(idea);
                                localStorage.removeItem(`outliner:${id}:expanded`);
                                console.log('Rebuilt document from idea (expanded outline parse error)');
                            }
                        } else {
                            initialData = buildInitialDocumentData(idea);
                            console.log('Rebuilt document from idea (no expanded outline found)');
                        }
                        localStorage.removeItem(`outliner:${id}:doc`);
                    }
                } catch (error) {
                    console.error('Error parsing localStorage data:', error);
                    // Try to load expanded outline first, fallback to basic outline
                    const expandedOutline = localStorage.getItem(`outliner:${id}:expanded`);
                    if (expandedOutline) {
                        try {
                            const parsedExpanded = JSON.parse(expandedOutline);
                            if (parsedExpanded && Array.isArray(parsedExpanded.blocks) && parsedExpanded.blocks.length > 0) {
                                initialData = parsedExpanded;
                                console.log('Loaded expanded outline with', parsedExpanded.blocks.length, 'blocks');
                            } else {
                                initialData = buildInitialDocumentData(idea);
                                localStorage.removeItem(`outliner:${id}:expanded`);
                                console.log('Rebuilt document from idea (expanded outline was invalid)');
                            }
                        } catch (error) {
                            console.error('Error parsing expanded outline:', error);
                            initialData = buildInitialDocumentData(idea);
                            localStorage.removeItem(`outliner:${id}:expanded`);
                            console.log('Rebuilt document from idea (expanded outline parse error)');
                        }
                    } else {
                        initialData = buildInitialDocumentData(idea);
                        console.log('Rebuilt document from idea (no expanded outline found)');
                    }
                    localStorage.removeItem(`outliner:${id}:doc`);
                }
            } else {
                // Try to load expanded outline first, fallback to basic outline
                const expandedOutline = localStorage.getItem(`outliner:${id}:expanded`);
                if (expandedOutline) {
                    try {
                        const parsedExpanded = JSON.parse(expandedOutline);
                        if (parsedExpanded && Array.isArray(parsedExpanded.blocks) && parsedExpanded.blocks.length > 0) {
                            initialData = parsedExpanded;
                            console.log('Created new document with expanded outline:', parsedExpanded.blocks.length, 'blocks');
                        } else {
                            initialData = buildInitialDocumentData(idea);
                            localStorage.removeItem(`outliner:${id}:expanded`);
                            console.log('Created new document from idea (expanded outline was invalid)');
                        }
                    } catch (error) {
                        console.error('Error parsing expanded outline:', error);
                        initialData = buildInitialDocumentData(idea);
                        localStorage.removeItem(`outliner:${id}:expanded`);
                        console.log('Created new document from idea (expanded outline parse error)');
                    }
                } else {
                    initialData = buildInitialDocumentData(idea);
                    console.log('Created new document from idea (no expanded outline found)');
                }
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
                            inlineToolbar: ['link', 'bold', 'italic', 'underline', 'inlineCode', 'marker', 'expand', 'cite']
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
                                    } catch { }
                                    return { blocks: [] };
                                },
                                notify: (msg: string) => {
                                    try { console.log(msg); } catch { }
                                }
                            }
                        } as any,
                        cite: {
                            class: CitationTool as any,
                            config: {
                                endpoint: '/api/outliner/cite',
                                getDocument: async () => {
                                    try {
                                        if (editorRef.current) {
                                            return await editorRef.current.save();
                                        }
                                    } catch { }
                                    return { blocks: [] };
                                },
                                notify: (msg: string) => {
                                    try { console.log(msg); } catch { }
                                }
                            }
                        } as any,
                    },
                    data: initialData,
                    onChange: () => {
                        debouncedSave();
                        // Update bibliography display when document changes
                        setTimeout(() => {
                            const container = document.getElementById('bibliography-container');
                            if (container) {
                                // Trigger a custom event that the citation tool can listen to
                                window.dispatchEvent(new CustomEvent('outliner-document-changed'));
                            }
                        }, 100);
                    },
                    onReady: () => {
                        if (isMounted) {
                            console.log('EditorJS is ready');
                            setIsReady(true);
                            // Install caret listener to toggle mini AI toolbar
                            try {
                                const editorRoot = document.getElementById(holderId) as HTMLElement | null;
                                if (editorRoot) {
                                    const mt = ensureMiniAIToolbar(editorRoot);
                                    miniToolbarRef.current = mt;
                                    // Warm once to ensure inline tool constructors (incl. Cite) are instantiated
                                    if (!warmedToolsRef.current) {
                                        setTimeout(() => { try { warmInlineToolsOnce(editorRoot); warmedToolsRef.current = true; } catch {} }, 80);
                                    }
                                }
                                const onSelectionChange = () => {
                                    try {
                                        const mt = miniToolbarRef.current || (editorRoot ? ensureMiniAIToolbar(editorRoot) : null);
                                        if (!mt) return;
                                        const sel = window.getSelection();
                                        const hasSel = !!(sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed);
                                        if (hasSel) {
                                            hideMiniToolbar();
                                        } else if (mt.style.display !== 'none') {
                                            // Reposition if already visible
                                            positionMiniToolbar(editorRoot!, mt);
                                        }
                                    } catch {}
                                };
                                document.addEventListener('selectionchange', onSelectionChange);
                                selectionHandlerRef.current = onSelectionChange;
                                // Hide on scroll to avoid drifting
                                const onScroll = () => { if (miniToolbarRef.current) miniToolbarRef.current.style.display = 'none'; };
                                window.addEventListener('scroll', onScroll, { passive: true });
                                scrollHandlerRef.current = onScroll;

                                // Pointer-up inside editor schedules delayed show
                                const onPointerUp = () => {
                                    try {
                                        suppressUntilNextPointerRef.current = false; // allow
                                        scheduleMiniToolbarShow(editorRoot!);
                                    } catch {}
                                };
                                if (editorRoot) {
                                    editorRoot.addEventListener('pointerup', onPointerUp as any);
                                    pointerUpHandlerRef.current = onPointerUp as any;
                                }

                                // Any typing hides and suppresses until next pointer interaction
                                const onKeyOrInput = () => {
                                    suppressUntilNextPointerRef.current = true;
                                    cancelScheduledMiniShow();
                                    hideMiniToolbar();
                                };
                                document.addEventListener('keydown', onKeyOrInput);
                                document.addEventListener('beforeinput', onKeyOrInput as any);
                                keyHandlerRef.current = onKeyOrInput;
                                inputHandlerRef.current = onKeyOrInput as any;
                            } catch {}
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
            // Remove global listeners
            try {
                if (selectionHandlerRef.current) document.removeEventListener('selectionchange', selectionHandlerRef.current);
                if (scrollHandlerRef.current) window.removeEventListener('scroll', scrollHandlerRef.current as any);
                const editorRoot = document.getElementById(holderId) as HTMLElement | null;
                if (editorRoot && pointerUpHandlerRef.current) editorRoot.removeEventListener('pointerup', pointerUpHandlerRef.current as any);
                if (keyHandlerRef.current) document.removeEventListener('keydown', keyHandlerRef.current);
                if (inputHandlerRef.current) document.removeEventListener('beforeinput', inputHandlerRef.current as any);
                cancelScheduledMiniShow();
            } catch {}
            setIsReady(false);
        };
    }, [id, idea, holderId, debouncedSave]);

    // Helpers for mini AI toolbar
    function isCaretInsideEditor(holder: string): boolean {
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
    }

    function ensureMiniAIToolbar(editorRoot: HTMLElement): HTMLDivElement {
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

        // Sparkles AI badge/icon on the left
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
                    // Synthesize selection over current paragraph if none
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
                // Dispatch on next tick to ensure selection state is applied
                setTimeout(() => { try { window.dispatchEvent(new CustomEvent(eventName)); } catch {} }, 0);
            });
            return btn;
        };

        const expandBtn = makeBtn('Expand', 'expand', 'outliner-ai-expand-current');
        const citeBtn = makeBtn('Cite', 'cite', 'outliner-ai-cite-current');
        toolbar.appendChild(badge);
        toolbar.appendChild(expandBtn);
        toolbar.appendChild(citeBtn);

        editorRoot.style.position = 'relative';
        editorRoot.appendChild(toolbar);
        return toolbar;
    }

    function positionMiniToolbar(editorRoot: HTMLElement, toolbar: HTMLDivElement) {
        try {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const range = sel.getRangeAt(0);
            const rects = range.getClientRects();
            const rect = rects.length > 0 ? rects[0] : null;
            if (!rect) return;
            const containerRect = editorRoot.getBoundingClientRect();
            toolbar.style.top = `${rect.top - containerRect.top - 36 + editorRoot.scrollTop}px`;
            toolbar.style.left = `${rect.left - containerRect.left}px`;
        } catch {}
    }

    function scheduleMiniToolbarShow(editorRoot: HTMLElement) {
        try {
            if (suppressUntilNextPointerRef.current) return;
            cancelScheduledMiniShow();
            showDelayTimerRef.current = window.setTimeout(() => {
                try {
                    const mt = miniToolbarRef.current || ensureMiniAIToolbar(editorRoot);
                    const sel = window.getSelection();
                    const hasSel = !!(sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed);
                    const shouldShow = isCaretInsideEditor(holderId) && !hasSel && !suppressUntilNextPointerRef.current;
                    if (shouldShow) {
                        mt.style.display = 'flex';
                        positionMiniToolbar(editorRoot, mt);
                    }
                } catch {}
            }, 600); // delay to avoid immediate popup
        } catch {}
    }

    function cancelScheduledMiniShow() {
        if (showDelayTimerRef.current) {
            try { window.clearTimeout(showDelayTimerRef.current); } catch {}
            showDelayTimerRef.current = null;
        }
    }

    function hideMiniToolbar() {
        try { if (miniToolbarRef.current) miniToolbarRef.current.style.display = 'none'; } catch {}
    }

    // Warm-up to make sure inline tools register any global listeners (once)
    function warmInlineToolsOnce(editorRoot: HTMLElement) {
        try {
            const editable = editorRoot.querySelector('[contenteditable="true"]') as HTMLElement | null;
            if (!editable || !editable.firstChild) return;
            const targetNode = editable.firstChild as Node;
            const sel = window.getSelection();
            if (!sel) return;
            const prevRanges: Range[] = [];
            for (let i = 0; i < sel.rangeCount; i++) prevRanges.push(sel.getRangeAt(i).cloneRange());
            const tempRange = document.createRange();
            try {
                tempRange.setStart(targetNode, 0);
                tempRange.setEnd(targetNode, Math.min(1, (targetNode.textContent || '').length));
            } catch {
                tempRange.selectNodeContents(editable);
            }
            sel.removeAllRanges();
            sel.addRange(tempRange);
            setTimeout(() => {
                try {
                    sel.removeAllRanges();
                    prevRanges.forEach(r => sel.addRange(r));
                } catch {}
            }, 10);
        } catch {}
    }

    return (
        <div className="prose prose-neutral max-w-none">
            <Toolbar onDownload={handleDownload} />
            
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
            
            {/* Bibliography Section */}
            <div className="border-t">
                <h2 className="text-2xl font-bold mb-6 text-gray-800">References</h2>
                <div id="bibliography-container" className="space-y-4 break-words">
                    <p data-bibliography-placeholder="true" className="text-gray-500 italic">
                        Citations will appear here as you add them to your document using the citation tool.
                    </p>
                </div>
            </div>

            {showEmailForm && (
                <EmailForm
                    onSubmit={handleEmailSubmit}
                    onCancel={() => {
                        setShowEmailForm(false);
                        setPendingDownloadAction(null);
                        setPendingDownloadFormat('');
                    }}
                    loading={emailLoading}
                    error={emailError}
                    downloadFormat={pendingDownloadFormat}
                />
            )}
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

    return (
        <div className="min-h-[100vh] w-full max-w-3xl mx-auto px-4 py-2">
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


