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
import { Toolbar } from '../components/Toolbar';

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

    const handleDownload = useCallback(async (format: 'pdf' | 'markdown' | 'txt' | 'docx') => {
        if (!editorRef.current) return;
        
        try {
            const data = await editorRef.current.save();
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
    }, [idea.title]);

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
                                const redactor = document.querySelector(`#${holderId} .codex-editor__redactor`);
                                const editorRoot = document.getElementById(holderId) as HTMLElement | null;
                                if (editorRoot) {
                                    const mt = ensureMiniAIToolbar(editorRoot);
                                    miniToolbarRef.current = mt;
                                }
                                const onSelectionChange = () => {
                                    try {
                                        const mt = miniToolbarRef.current || (editorRoot ? ensureMiniAIToolbar(editorRoot) : null);
                                        if (!mt) return;
                                        const sel = window.getSelection();
                                        const hasSel = !!(sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed);
                                        // Show when caret is inside editor paragraph with no selection
                                        const shouldShow = isCaretInsideEditor(holderId) && !hasSel;
                                        mt.style.display = shouldShow ? 'flex' : 'none';
                                        if (shouldShow) positionMiniToolbar(editorRoot!, mt);
                                    } catch {}
                                };
                                document.addEventListener('selectionchange', onSelectionChange);
                                selectionHandlerRef.current = onSelectionChange;
                                // Hide on scroll to avoid drifting
                                const onScroll = () => { if (miniToolbarRef.current) miniToolbarRef.current.style.display = 'none'; };
                                window.addEventListener('scroll', onScroll, { passive: true });
                                scrollHandlerRef.current = onScroll;
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
                            const p = (range.startContainer as Node).parentElement?.closest('p');
                            if (p) {
                                const newRange = document.createRange();
                                newRange.selectNodeContents(p);
                                sel.removeAllRanges();
                                sel.addRange(newRange);
                            }
                        }
                    }
                } catch {}
                try { window.dispatchEvent(new CustomEvent(eventName)); } catch {}
            });
            return btn;
        };

        const expandBtn = makeBtn('Expand', 'expand', 'outliner-ai-expand-current');
        const citeBtn = makeBtn('Cite', 'cite', 'outliner-ai-cite-current');
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


