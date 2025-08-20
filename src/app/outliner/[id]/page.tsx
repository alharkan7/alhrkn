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

function FullDocumentEditor({ id, idea }: { id: string; idea: ResearchIdea; }) {
    const editorRef = useRef<EditorJS | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);
    const holderId = `outliner-editor-${id}`;

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
                    // For PDF, we'll create a simple HTML representation and use browser's print to PDF
                    content = convertToHTML(data);
                    filename = `${idea.title || 'document'}.html`;
                    mimeType = 'text/html';
                    // Open in new tab for PDF conversion
                    const newWindow = window.open('', '_blank');
                    if (newWindow) {
                        newWindow.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>${idea.title || 'Document'}</title>
                                <style>
                                    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                                    h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
                                    h2 { color: #555; margin-top: 30px; }
                                    p { margin-bottom: 15px; }
                                    .code { background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; }
                                </style>
                            </head>
                            <body>
                                ${content}
                            </body>
                            </html>
                        `);
                        newWindow.document.close();
                        newWindow.focus();
                        // User can now use browser's print to PDF functionality
                        setTimeout(() => {
                            newWindow.print();
                        }, 500);
                    }
                    return;
                    
                case 'markdown':
                    content = convertToMarkdown(data);
                    filename = `${idea.title || 'document'}.md`;
                    mimeType = 'text/markdown';
                    break;
                    
                case 'txt':
                    content = convertToPlainText(data);
                    filename = `${idea.title || 'document'}.txt`;
                    mimeType = 'text/plain';
                    break;
                    
                case 'docx':
                    // For DOCX, we'll create a simple HTML that can be opened in Word
                    content = convertToHTML(data);
                    filename = `${idea.title || 'document'}.html`;
                    mimeType = 'text/html';
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
                <div id="bibliography-container" className="space-y-4">
                    <p className="text-gray-500 italic">
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


