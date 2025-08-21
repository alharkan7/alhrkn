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
import { ParaphraseTool } from '../tools/ParaphraseTool';
import { ChatTool } from '../tools/ChatTool';
import { SPARKLES_ICON_SVG } from '../components/svg-icons';
import { Toolbar } from '../components/Toolbar';
import { ChatInterface } from '../components/ChatInterface';
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

// Minimal Markdown -> EditorJS converter (headings, paragraphs, ordered/unordered lists, simple inline)
function convertMarkdownToEditorJS(markdown: string) {
    const lines = (markdown || '').replace(/\r\n?/g, '\n').split('\n');
    const blocks: any[] = [];
    let paragraphBuffer: string[] = [];
    let listBuffer: { style: 'ordered' | 'unordered'; items: string[] } | null = null;

    const flushParagraph = () => {
        const text = paragraphBuffer.join(' ').trim();
        if (text) {
            blocks.push({ type: 'paragraph', data: { text } });
        }
        paragraphBuffer = [];
    };

    const flushList = () => {
        if (listBuffer && listBuffer.items.length > 0) {
            blocks.push({ type: 'list', data: { style: listBuffer.style, items: [...listBuffer.items] } });
        }
        listBuffer = null;
    };

    const pushHeading = (level: number, text: string) => {
        flushParagraph();
        flushList();
        const safeLevel = Math.max(1, Math.min(level, 6));
        blocks.push({ type: 'header', data: { text: text.trim(), level: safeLevel } });
    };

    const addInlineFormatting = (text: string) => {
        // Very small subset of inline formatting
        let t = text;
        // Bold **text**
        t = t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
        // Italic *text*
        t = t.replace(/(^|\s)\*(?!\s)([^*]+?)\*(?=\s|$)/g, '$1<i>$2</i>');
        // Inline code `code`
        t = t.replace(/`([^`]+?)`/g, '<code class="code">$1</code>');
        return t;
    };

    for (const raw of lines) {
        const line = raw.trimEnd();
        if (line.trim() === '') {
            flushParagraph();
            flushList();
            continue;
        }

        // Headings
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const text = addInlineFormatting(headingMatch[2]);
            pushHeading(level, text);
            continue;
        }

        // Ordered list (1., 2., ...)
        const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);
        if (orderedMatch) {
            const item = addInlineFormatting(orderedMatch[1]);
            if (!listBuffer || listBuffer.style !== 'ordered') {
                flushParagraph();
                flushList();
                listBuffer = { style: 'ordered', items: [] };
            }
            listBuffer.items.push(item);
            continue;
        }

        // Unordered list (-, *)
        const unorderedMatch = line.match(/^\s*[-*]\s+(.+)$/);
        if (unorderedMatch) {
            const item = addInlineFormatting(unorderedMatch[1]);
            if (!listBuffer || listBuffer.style !== 'unordered') {
                flushParagraph();
                flushList();
                listBuffer = { style: 'unordered', items: [] };
            }
            listBuffer.items.push(item);
            continue;
        }

        // Normal paragraph line
        paragraphBuffer.push(addInlineFormatting(line.trim()))
    }

    // Flush remainders
    flushParagraph();
    flushList();

    // Ensure at least a title if present at the very top using the first non-empty line
    if (blocks.length === 0) {
        const firstNonEmpty = lines.find(l => l.trim().length > 0) || '';
        if (firstNonEmpty) {
            blocks.push({ type: 'header', data: { text: firstNonEmpty.trim(), level: 1 } });
        }
    }
    return blocks;
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

// Helper function to extract text from list items
function extractListItemText(item: any): string {
    if (typeof item === 'string') {
        return item.trim();
    } else if (item && typeof item === 'object') {
        // Handle different possible item structures
        if (item.content) {
            return String(item.content).trim();
        } else if (item.text) {
            return String(item.text).trim();
        } else if (item.value) {
            return String(item.value).trim();
        } else if (item.label) {
            return String(item.label).trim();
        } else if (item.name) {
            return String(item.name).trim();
        } else if (item.title) {
            return String(item.title).trim();
        } else if (item.html) {
            // Handle HTML content by stripping tags
            return String(item.html).replace(/<[^>]*>/g, '').trim();
        } else if (item.markdown) {
            return String(item.markdown).trim();
        } else {
            // Try to find any string property
            for (const key in item) {
                if (typeof item[key] === 'string' && item[key].trim()) {
                    return item[key].trim();
                }
            }
            // If no string property found, try to convert the whole object
            try {
                const jsonStr = JSON.stringify(item);
                if (jsonStr !== '{}' && jsonStr !== '[]') {
                    return jsonStr;
                }
            } catch {}
            return String(item);
        }
    } else if (item === null || item === undefined) {
        return '';
    } else {
        return String(item).trim();
    }
}

// Helper functions to convert EditorJS data to different formats
function convertToHTML(data: any): string {
    if (!data.blocks || !Array.isArray(data.blocks)) return '';
    
    return data.blocks.map((block: any) => {
        try {
            switch (block.type) {
                case 'header':
                    const level = block.data?.level || 1;
                    const headerText = block.data?.text || '';
                    return `<h${level}>${headerText}</h${level}>`;
                case 'paragraph':
                    const paraText = block.data?.text || '';
                    return `<p>${paraText}</p>`;
                case 'list':
                    if (!block.data || !Array.isArray(block.data.items)) {
                        return '<ul><li>List content unavailable</li></ul>';
                    }
                    const listType = block.data.style === 'ordered' ? 'ol' : 'ul';
                    const items = block.data.items.map((item: any) => {
                        const itemText = extractListItemText(item);
                        return `<li>${itemText}</li>`;
                    }).join('');
                    return `<${listType}>${items}</${listType}>`;
                case 'inlineCode':
                    const codeText = block.data?.text || '';
                    return `<code class="code">${codeText}</code>`;
                case 'marker':
                    const markerText = block.data?.text || '';
                    return `<mark>${markerText}</mark>`;
                case 'underline':
                    const underlineText = block.data?.text || '';
                    return `<u>${underlineText}</u>`;
                default:
                    const defaultText = block.data?.text || '';
                    return `<p>${defaultText}</p>`;
            }
        } catch (error) {
            console.error('Error converting block to HTML:', error, block);
            return `<p>Error converting block: ${block.type || 'unknown'}</p>`;
        }
    }).join('\n');
}

function convertToMarkdown(data: any): string {
    if (!data.blocks || !Array.isArray(data.blocks)) return '';
    
    return data.blocks.map((block: any) => {
        try {
            switch (block.type) {
                case 'header':
                    const level = block.data?.level || 1;
                    const hashes = '#'.repeat(level);
                    const headerText = block.data?.text || '';
                    return `${hashes} ${headerText}\n`;
                case 'paragraph':
                    const paraText = block.data?.text || '';
                    return `${paraText}\n\n`;
                case 'list':
                    if (!block.data || !Array.isArray(block.data.items)) {
                        return '• List content unavailable\n\n';
                    }
                    const listType = block.data.style === 'ordered' ? '1.' : '-';
                    const items = block.data.items.map((item: any) => {
                        const itemText = extractListItemText(item);
                        return `  ${listType} ${itemText}`;
                    }).join('\n');
                    return `${items}\n\n`;
                case 'inlineCode':
                    const codeText = block.data?.text || '';
                    return `\`${codeText}\``;
                case 'marker':
                    const markerText = block.data?.text || '';
                    return `==${markerText}==`;
                case 'underline':
                    const underlineText = block.data?.text || '';
                    return `<u>${underlineText}</u>`;
                default:
                    const defaultText = block.data?.text || '';
                    return `${defaultText}\n\n`;
            }
        } catch (error) {
            console.error('Error converting block to Markdown:', error, block);
            return `Error converting block: ${block.type || 'unknown'}\n\n`;
        }
    }).join('');
}

function convertToPlainText(data: any): string {
    if (!data.blocks || !Array.isArray(data.blocks)) return '';
    
    return data.blocks.map((block: any) => {
        try {
            switch (block.type) {
                case 'header':
                    const headerText = block.data?.text || '';
                    return `${headerText}\n`;
                case 'paragraph':
                    const paraText = block.data?.text || '';
                    return `${paraText}\n\n`;
                case 'list':
                    if (!block.data || !Array.isArray(block.data.items)) {
                        return '• List content unavailable\n\n';
                    }
                    const items = block.data.items.map((item: any) => {
                        const itemText = extractListItemText(item);
                        return `  • ${itemText}`;
                    }).join('\n');
                    return `${items}\n\n`;
                case 'inlineCode':
                    const codeText = block.data?.text || '';
                    return codeText;
                case 'marker':
                    const markerText = block.data?.text || '';
                    return markerText;
                case 'underline':
                    const underlineText = block.data?.text || '';
                    return underlineText;
                default:
                    const defaultText = block.data?.text || '';
                    return `${defaultText}\n\n`;
            }
        } catch (error) {
            console.error('Error converting block to plain text:', error, block);
            return `Error converting block: ${block.type || 'unknown'}\n\n`;
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

function FullDocumentEditor({ id, idea, language }: { id: string; idea: ResearchIdea; language: 'en' | 'id'; }) {
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
    const lastScrollTsRef = useRef<number>(0);
    const rescheduleCountRef = useRef<number>(0);
    
    // Streaming state
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingBlocks, setStreamingBlocks] = useState<any[]>([]);
    const streamingInitiatedRef = useRef(false);
    const eventSourceRef = useRef<EventSource | null>(null);
    const markdownBufferRef = useRef<string>('');
    const streamingRenderTimerRef = useRef<number | null>(null);
    const lastAppliedBlocksRef = useRef<any[]>([]);
    
    // Email form state
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [pendingDownloadAction, setPendingDownloadAction] = useState<(() => void) | null>(null);
    const [pendingDownloadFormat, setPendingDownloadFormat] = useState<string>('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);

    // Chat state
    const [showChat, setShowChat] = useState(false);
    const [documentContext, setDocumentContext] = useState<string>('');
    const [selectedText, setSelectedText] = useState<string>('');

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
                
                // Debug: Log list blocks to understand their structure
                if (data.blocks) {
                    console.log('All blocks:', data.blocks.map((b: any) => ({ type: b.type, hasData: !!b.data, dataKeys: b.data ? Object.keys(b.data) : [] })));
                    data.blocks.forEach((block: any, index: number) => {
                        if (block.type === 'list') {
                            console.log(`List block ${index}:`, block);
                            console.log(`List items:`, block.data.items);
                            if (block.data && Array.isArray(block.data.items)) {
                                block.data.items.forEach((item: any, itemIndex: number) => {
                                    console.log(`  Item ${itemIndex}:`, item, 'Type:', typeof item);
                                    if (typeof item === 'object') {
                                        console.log(`    Keys:`, Object.keys(item));
                                        console.log(`    Values:`, Object.values(item));
                                    }
                                });
                            }
                        }
                    });
                }
                
                let content: string;
                let filename: string;
                let mimeType: string;
                
                // Debug: Show what the conversion functions produce
                console.log('HTML conversion result:', convertToHTML(data));
                console.log('Markdown conversion result:', convertToMarkdown(data));
                console.log('Plain text conversion result:', convertToPlainText(data));
                
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
    }, [idea.title, id, language]);

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

    // Get document context for chat
    const getDocumentContext = useCallback(async (): Promise<string> => {
        if (!editorRef.current) return '';
        try {
            const data = await editorRef.current.save();
            const plainText = convertToPlainText(data);
            return `Document Title: ${idea.title}\n\nContent:\n${plainText}`;
        } catch (error) {
            console.error('Error getting document context:', error);
            return `Document Title: ${idea.title}`;
        }
    }, [idea.title]);

    // Chat handlers
    const handleOpenChat = async (selectedText?: string) => {
        // Get document context before opening chat
        const context = await getDocumentContext();

        // Store the selected text separately for the UI cue
        if (selectedText) {
            setSelectedText(selectedText);
        }

        setDocumentContext(context);
        setShowChat(true);
    };

    const handleCloseChat = () => {
        setShowChat(false);
        setSelectedText(''); // Clear selected text when closing
    };

    // Function to create skeleton blocks for streaming
    const createSkeletonBlocks = () => {
        const isIndonesian = language === 'id';
        return [
            {
                type: 'header',
                data: {
                    text: idea.title || (isIndonesian ? 'Judul Penelitian' : 'Research Title'),
                    level: 1
                }
            },
            {
                type: 'header',
                data: {
                    text: isIndonesian ? '1. Pendahuluan' : '1. Introduction',
                    level: 2
                }
            },
            {
                type: 'paragraph',
                data: {
                    text: '<div class="loading-skeleton" style="height: 20px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>'
                }
            },
            {
                type: 'header',
                data: {
                    text: isIndonesian ? '2. Metodologi' : '2. Methodology',
                    level: 2
                }
            },
            {
                type: 'paragraph',
                data: {
                    text: '<div class="loading-skeleton" style="height: 20px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>'
                }
            },
            {
                type: 'header',
                data: {
                    text: isIndonesian ? '3. Dampak yang Diharapkan' : '3. Expected Impact',
                    level: 2
                }
            },
            {
                type: 'paragraph',
                data: {
                    text: '<div class="loading-skeleton" style="height: 20px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>'
                }
            }
        ];
    };

    // Function to start streaming the expanded outline
    const startStreaming = useCallback(async () => {
        if (streamingInitiatedRef.current || !idea) return;
        
        console.log('Starting outline expansion stream...');
        streamingInitiatedRef.current = true;
        setIsStreaming(true);
        
        // Initialize with skeleton blocks
        const skeletonBlocks = createSkeletonBlocks();
        setStreamingBlocks(skeletonBlocks);
        
        try {
            // Use fetch with POST and stream the body
            const response = await fetch('/api/outliner/expand-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea, language }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to start streaming');
            }
            
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            
            if (!reader) {
                throw new Error('No reader available');
            }
            
            let buffer = '';
            const newBlocks: any[] = [];
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    console.log('Streaming completed');
                    break;
                }
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            console.log('Received streaming data:', data);

                            if (data.type === 'chunk' && typeof data.text === 'string') {
                                // Accumulate markdown and convert to blocks with throttled rendering
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
                                console.log('Streaming completed successfully');
                                setIsStreaming(false);
                                
                                // Save the completed expanded outline
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
            
            // Fallback to basic outline
            const fallbackData = buildInitialDocumentData(idea);
            setStreamingBlocks(fallbackData.blocks);
            localStorage.setItem(`outliner:${id}:doc`, JSON.stringify(fallbackData));
            
            if (editorRef.current) {
                try {
                    await editorRef.current.clear();
                    await editorRef.current.render(fallbackData);
                } catch (error) {
                    console.error('Error rendering fallback data:', error);
                }
            }
        }
    }, [idea, language, id]);

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
            const expandedOutline = localStorage.getItem(`outliner:${id}:expanded`);
            let initialData;
            let shouldStartStreaming = false;

            if (existing) {
                try {
                    const parsedData = JSON.parse(existing);
                    if (parsedData && Array.isArray(parsedData.blocks) && parsedData.blocks.length > 0) {
                        initialData = parsedData;
                        console.log('Loaded existing document with', parsedData.blocks.length, 'blocks');
                    } else {
                        // Use skeleton blocks and start streaming
                        initialData = { blocks: createSkeletonBlocks() };
                        shouldStartStreaming = true;
                        console.log('Document exists but empty, starting streaming');
                    }
                } catch (error) {
                    console.error('Error parsing localStorage data:', error);
                    // Use skeleton blocks and start streaming
                    initialData = { blocks: createSkeletonBlocks() };
                    shouldStartStreaming = true;
                    console.log('Document parse error, starting streaming');
                    localStorage.removeItem(`outliner:${id}:doc`);
                }
            } else if (expandedOutline) {
                try {
                    const parsedExpanded = JSON.parse(expandedOutline);
                    if (parsedExpanded && Array.isArray(parsedExpanded.blocks) && parsedExpanded.blocks.length > 0) {
                        initialData = parsedExpanded;
                        console.log('Loaded existing expanded outline with', parsedExpanded.blocks.length, 'blocks');
                    } else {
                        // Use skeleton blocks and start streaming
                        initialData = { blocks: createSkeletonBlocks() };
                        shouldStartStreaming = true;
                        localStorage.removeItem(`outliner:${id}:expanded`);
                        console.log('Expanded outline invalid, starting streaming');
                    }
                } catch (error) {
                    console.error('Error parsing expanded outline:', error);
                    // Use skeleton blocks and start streaming
                    initialData = { blocks: createSkeletonBlocks() };
                    shouldStartStreaming = true;
                    localStorage.removeItem(`outliner:${id}:expanded`);
                    console.log('Expanded outline parse error, starting streaming');
                }
            } else {
                // New document - start with skeleton blocks and begin streaming
                initialData = { blocks: createSkeletonBlocks() };
                shouldStartStreaming = true;
                console.log('New document, starting streaming');
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
                            inlineToolbar: ['link', 'bold', 'italic', 'underline', 'inlineCode', 'marker', 'expand', 'paraphrase', 'cite', 'chat']
                        } as any,
                        // Enable inline AI tools for headers as well
                        header: {
                            class: Header as any,
                            inlineToolbar: ['link', 'bold', 'italic', 'underline', 'inlineCode', 'marker', 'expand', 'paraphrase', 'cite', 'chat']
                        } as any,
                        // Enable inline AI tools for list items
                        list: {
                            class: List as any,
                            inlineToolbar: ['bold', 'italic', 'underline', 'inlineCode', 'marker', 'expand', 'paraphrase', 'cite', 'chat']
                        } as any,
                        marker: { class: Marker } as const,
                        inlineCode: { class: InlineCode } as const,
                        underline: { class: Underline } as const,
                        expand: {
                            class: ExpandInlineTool as any,
                            config: {
                                endpoint: '/api/outliner/expand-passage',
                                language: language,
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
                        paraphrase: {
                            class: ParaphraseTool as any,
                            config: {
                                endpoint: '/api/outliner/paraphrase',
                                language: language,
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
                                language: language,
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
                        chat: {
                            class: ChatTool as any,
                            config: {
                                endpoint: '/api/outliner/chat',
                                language: language,
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
                                },
                                onOpenChat: handleOpenChat
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
                            try { lastAppliedBlocksRef.current = Array.isArray(initialData?.blocks) ? initialData.blocks : []; } catch {}
                            
                            // Start streaming if needed
                            if (shouldStartStreaming) {
                                console.log('Starting streaming after editor ready');
                                setTimeout(() => {
                                    startStreaming();
                                }, 100);
                            }
                            
                            // Install caret listener to toggle mini AI toolbar
                            try {
                                const editorRoot = document.getElementById(holderId) as HTMLElement | null;
                                if (editorRoot) {
                                    const mt = ensureMiniAIToolbar(editorRoot);
                                    miniToolbarRef.current = mt;
                                    // Warm once to ensure inline tool constructors (incl. Cite and Paraphrase) are instantiated
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
                                const onScroll = () => { lastScrollTsRef.current = Date.now(); if (miniToolbarRef.current) miniToolbarRef.current.style.display = 'none'; };
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
            // Remove global listeners and cleanup streaming
            try {
                if (selectionHandlerRef.current) document.removeEventListener('selectionchange', selectionHandlerRef.current);
                if (scrollHandlerRef.current) window.removeEventListener('scroll', scrollHandlerRef.current as any);
                const editorRoot = document.getElementById(holderId) as HTMLElement | null;
                if (editorRoot && pointerUpHandlerRef.current) editorRoot.removeEventListener('pointerup', pointerUpHandlerRef.current as any);
                if (keyHandlerRef.current) document.removeEventListener('keydown', keyHandlerRef.current);
                if (inputHandlerRef.current) document.removeEventListener('beforeinput', inputHandlerRef.current as any);
                cancelScheduledMiniShow();
                
                // Cleanup streaming
                if (eventSourceRef.current) {
                    eventSourceRef.current.close();
                    eventSourceRef.current = null;
                }
                setIsStreaming(false);
                streamingInitiatedRef.current = false;
            } catch {}
            setIsReady(false);
        };
            }, [id, idea, holderId, debouncedSave, language, startStreaming]);

    // Apply minimal tail diff to reduce flicker: replace all blocks from first divergence index
    const applyBlocksTailDiff = async (nextBlocks: any[]) => {
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

        // If identical, skip
        if (divergeAt === prevBlocks.length && divergeAt === nextBlocks.length) return;

        const api = (editorRef.current as any).blocks;
        const currentCount = api.getBlocksCount();

        // Safety: if editor count mismatches our prev snapshot a lot, fallback to full render once
        if (Math.abs(currentCount - prevBlocks.length) > 5 && nextBlocks.length < 300) {
            await editorRef.current.clear();
            await editorRef.current.render({ blocks: nextBlocks });
            lastAppliedBlocksRef.current = nextBlocks;
            return;
        }

        // Delete from end down to divergence
        for (let idx = currentCount - 1; idx >= divergeAt; idx--) {
            try { api.delete(idx); } catch {}
        }

        // Insert new/changed tail starting at divergence index
        for (let idx = divergeAt; idx < nextBlocks.length; idx++) {
            const b = nextBlocks[idx];
            try { await api.insert(b.type, b.data, undefined, idx); } catch {}
        }

        lastAppliedBlocksRef.current = nextBlocks;
    };

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
    }

    function positionMiniToolbar(editorRoot: HTMLElement, toolbar: HTMLDivElement) {
        try {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const range = sel.getRangeAt(0);
            const rects = range.getClientRects();
            let rect = rects.length > 0 ? rects[0] : null as DOMRect | null;
            // Fallback for cases (e.g., list items) where a collapsed range has no rects
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

            // Calculate toolbar dimensions (ensure it's rendered to get accurate measurements)
            toolbar.style.visibility = 'hidden';
            toolbar.style.display = 'flex';
            const toolbarRect = toolbar.getBoundingClientRect();
            const toolbarWidth = toolbarRect.width;
            const toolbarHeight = toolbarRect.height;

            // Get viewport dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Calculate available space
            const cursorX = rect.left;
            const cursorY = rect.top;

            // Check if there's enough space to the right of the cursor
            const spaceToRight = viewportWidth - cursorX;
            const spaceToLeft = cursorX;

            let leftPosition: number;

            // Default: position to the right of cursor
            if (spaceToRight >= toolbarWidth + 10) {
                // Enough space to the right
                leftPosition = cursorX - containerRect.left;
            } else if (spaceToLeft >= toolbarWidth + 10) {
                // Enough space to the left
                leftPosition = cursorX - containerRect.left - toolbarWidth;
            } else {
                // Not enough space on either side, position as close as possible
                if (spaceToRight > spaceToLeft) {
                    // More space to the right
                    leftPosition = cursorX - containerRect.left;
                } else {
                    // More space to the left
                    leftPosition = cursorX - containerRect.left - toolbarWidth;
                }
            }

            // Ensure toolbar doesn't go off the editor horizontally
            const maxLeft = Math.max(0, editorRoot.clientWidth - toolbarWidth - 10);
            const minLeft = 10;
            
            leftPosition = Math.max(minLeft, Math.min(maxLeft, leftPosition));

            // Position vertically - prefer above the cursor, but below if not enough space
            let topPosition: number;
            const spaceAbove = cursorY;
            const spaceBelow = viewportHeight - cursorY;

            if (spaceAbove >= toolbarHeight + 10) {
                // Enough space above
                topPosition = cursorY - containerRect.top - toolbarHeight - 8;
            } else if (spaceBelow >= toolbarHeight + 10) {
                // Enough space below
                topPosition = cursorY - containerRect.top + 24;
            } else {
                // Not enough space above or below, position as close as possible
                if (spaceAbove > spaceBelow) {
                    // More space above
                    topPosition = Math.max(10, cursorY - containerRect.top - toolbarHeight - 8);
                } else {
                    // More space below
                    topPosition = cursorY - containerRect.top + 24;
                }
            }

            // Ensure toolbar doesn't go off the editor vertically
            const maxTop = Math.max(0, editorRoot.clientHeight - toolbarHeight - 10);
            const minTop = 10;

            topPosition = Math.max(minTop, Math.min(maxTop, topPosition));

            toolbar.style.top = `${topPosition}px`;
            toolbar.style.left = `${leftPosition}px`;
            toolbar.style.visibility = 'visible';

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
                    const sinceScroll = Date.now() - lastScrollTsRef.current;
                    if (shouldShow && sinceScroll < 180 && rescheduleCountRef.current < 4) {
                        // Wait for scrolling to settle, then reschedule quickly
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
            <Toolbar onDownload={handleDownload} onOpenChat={handleOpenChat} />
            
            {/* Streaming indicator */}
            {/* {isStreaming && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-4 flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="text-blue-700 text-sm">
                        {language === 'en' ? 'Generating expanded outline...' : 'Proses mengembangkan outline...'}
                    </span>
                </div>
            )} */}
            
            {!isReady && (
                <div className="text-center py-8 text-gray-500">
                    {language === 'en' ? 'Loading editor...' : 'Memuat editor...'}
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

            {/* Chat Interface */}
            <ChatInterface
                isOpen={showChat}
                onClose={handleCloseChat}
                documentContext={documentContext}
                selectedText={selectedText}
            />
        </div>
    );
}

export default function OutlinerDetailPage() {
    const params = useParams();
    const id = (params?.id as string) || '';
    const [idea, setIdea] = useState<ResearchIdea | null>(null);
    const [language, setLanguage] = useState<'en' | 'id'>('en');

    useEffect(() => {
        if (!id) return;
        try {
            const raw = localStorage.getItem(`outliner:${id}`);
            const languagePref = localStorage.getItem(`outliner:${id}:language`) as 'en' | 'id';
            
            if (raw) {
                const parsedIdea = JSON.parse(raw);
                console.log('Loaded idea:', parsedIdea);
                setIdea(parsedIdea);
            }
            
            if (languagePref && (languagePref === 'en' || languagePref === 'id')) {
                setLanguage(languagePref);
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
                <FullDocumentEditor id={id} idea={idea} language={language} />
            )}
        </div>
    );
}

