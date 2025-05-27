import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DIAGRAM_THEMES, DIAGRAM_TYPES } from './diagram-types';
import panzoom from 'panzoom';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toPng, toJpeg } from 'html-to-image';
import EmailForm from '../../papermap/components/EmailForm';

interface MermaidRendererProps {
    code: string;
    diagramType: string;
    diagramTheme: string;
    onThemeChange: (theme: string) => void;
    onNewDiagram: () => void;
    onCodeChange?: (code: string) => void;
    fileName?: string;
    description?: string;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code, diagramType, diagramTheme, onThemeChange, onNewDiagram, onCodeChange, fileName, description }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const panzoomRef = useRef<any>(null);
    const initialTransformRef = useRef<{ x: number, y: number, scale: number } | null>(null);
    const [renderError, setRenderError] = useState<string | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editableCode, setEditableCode] = useState(code);
    const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
    const downloadDropdownRef = useRef<HTMLDivElement>(null);
    const [autoCorrected, setAutoCorrected] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [pendingDownloadAction, setPendingDownloadAction] = useState<(() => void) | null>(null);
    const [pendingDownloadFormat, setPendingDownloadFormat] = useState<string>('');
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);

    // Pre-validation: ensure code starts with a valid diagram type and auto-correct '--' to '-->' for flowcharts
    function getRenderableCode(rawCode: string, diagramType: string) {
        const trimmed = rawCode.trim();
        let codeBody = trimmed;
        let corrected = false;
        // Auto-correct '--' to '-->' for flowcharts if code starts with 'graph TD' or 'graph LR'
        if (codeBody.startsWith('graph TD') || codeBody.startsWith('graph LR')) {
            const before = codeBody;
            codeBody = codeBody.replace(/--(?![->-])/g, '-->');
            if (before !== codeBody) corrected = true;
        }
        setAutoCorrected(corrected);
        return codeBody;
    }

    useEffect(() => {
        if (!code) return;
        setRenderError(null);
        mermaid.initialize({ startOnLoad: false, theme: diagramTheme as any });

        if (containerRef.current) {
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
            const graphDefinition = getRenderableCode(code, diagramType);
            containerRef.current.innerHTML = ""; // Clear previous

            // Use mermaid.render for async error handling
            mermaid.render(id, graphDefinition)
                .then(({ svg }) => {
                    if (containerRef.current) {
                        containerRef.current.innerHTML = svg;
                        // Panzoom logic after SVG is set
                        setTimeout(() => {
                            const svgElem = containerRef.current?.querySelector('svg');
                            if (svgElem) {
                                // @ts-ignore
                                if (containerRef.current.__panzoomInstance) {
                                    // @ts-ignore
                                    containerRef.current.__panzoomInstance.dispose();
                                }
                                const instance = panzoom(svgElem, {
                                    zoomDoubleClickSpeed: 1,
                                    maxZoom: 10,
                                    minZoom: 0.1,
                                    bounds: false,
                                });
                                // @ts-ignore
                                containerRef.current.__panzoomInstance = instance;
                                panzoomRef.current = instance;
                                // Store the initial transform
                                const transform = instance.getTransform();
                                initialTransformRef.current = { x: transform.x, y: transform.y, scale: transform.scale };
                            }
                        }, 0);
                    }
                })
                .catch((err) => {
                    let message = 'Unknown error';
                    if (err instanceof Error) message = err.message;
                    else if (typeof err === 'object') message = JSON.stringify(err);
                    setRenderError('Failed to render diagram: ' + message);
                    // eslint-disable-next-line no-console
                    console.error('Mermaid render error:', err);
                });
        }
        return () => {
            if (containerRef.current) {
                // @ts-ignore
                if (containerRef.current.__panzoomInstance) {
                    // @ts-ignore
                    containerRef.current.__panzoomInstance.dispose();
                    // @ts-ignore
                    containerRef.current.__panzoomInstance = null;
                }
            }
            panzoomRef.current = null;
            initialTransformRef.current = null;
        };
    }, [code, diagramType, diagramTheme]);

    useEffect(() => {
        setEditableCode(code);
    }, [code]);

    useEffect(() => {
        if (editableCode !== code) {
            if (typeof onCodeChange === 'function') {
                onCodeChange(editableCode);
            }
        }
    }, [editableCode]);

    const handleResetZoom = () => {
        if (panzoomRef.current && initialTransformRef.current) {
            const { x, y, scale } = initialTransformRef.current;
            panzoomRef.current.moveTo(x, y);
            panzoomRef.current.zoomAbs(0, 0, scale);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target as Node)) {
                setShowDownloadDropdown(false);
            }
        }
        if (showDownloadDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDownloadDropdown]);

    const initiateDownload = (format: string, downloadAction: () => void) => {
        setPendingDownloadFormat(format);
        setPendingDownloadAction(() => downloadAction);
        setShowEmailForm(true);
        setShowDownloadDropdown(false);
    };

    const handleEmailSubmit = async (email: string) => {
        setEmailLoading(true);
        setEmailError(null);
        try {
            // Send email, fileName, and description to backend
            fetch('/api/inztagram/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, downloadFormat: pendingDownloadFormat, fileName, description }),
            }).catch(() => {});
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

    // Download as PNG
    const handleDownloadPng = () => {
        handleResetZoom();
        setTimeout(() => {
            if (!containerRef.current) return;
            const svgElem = containerRef.current.querySelector('svg');
            if (!svgElem) return;
            toPng(svgElem as unknown as HTMLElement, { backgroundColor: 'transparent' })
                .then((dataUrl) => {
                    const a = document.createElement('a');
                    a.href = dataUrl;
                    a.download = 'diagram from raihankalla-id.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });
            setShowDownloadDropdown(false);
        }, 50);
    };

    // Download as JPEG
    const handleDownloadJpeg = () => {
        handleResetZoom();
        setTimeout(() => {
            if (!containerRef.current) return;
            const svgElem = containerRef.current.querySelector('svg');
            if (!svgElem) return;
            toJpeg(svgElem as unknown as HTMLElement, { backgroundColor: 'white' })
                .then((dataUrl) => {
                    const a = document.createElement('a');
                    a.href = dataUrl;
                    a.download = 'diagram (raihankalla-id).jpeg';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });
            setShowDownloadDropdown(false);
        }, 50);
    };

    // Download as SVG
    const handleDownloadSvg = () => {
        if (!containerRef.current) return;
        const svgElem = containerRef.current.querySelector('svg');
        if (!svgElem) return;
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgElem);
        // Add XML declaration
        if (!source.startsWith('<?xml')) {
            source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
        }
        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diagram (raihankalla-id).svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShowDownloadDropdown(false);
    };

    return (
        <div className="flex-1 flex flex-col justify-center items-center max-w-6xl mx-auto w-full px-1 md:px-4 mt-[80px] mb-[20px]">
            <Card className="w-full max-w-6xl shadow-lg">
                <div className="flex items-center justify-between p-2 border-b">
                    <div className="flex items-center gap-2">
                        <Select value={diagramTheme} onValueChange={onThemeChange}>
                            <SelectTrigger className="w-auto min-w-[100px] max-w-[160px] bg-primary-foreground">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-primary-foreground">
                                {DIAGRAM_THEMES.map((theme) => (
                                    <SelectItem key={theme.value} value={theme.value} className="bg-primary-foreground">{theme.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-1 ml-auto">
                        <Sheet open={editOpen} onOpenChange={setEditOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="neutral"
                                    aria-label="Edit Diagram Text"
                                >
                                    Edit
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[90vw] max-w-xl">
                                <SheetHeader>
                                    <SheetTitle>Edit Diagram Text</SheetTitle>
                                </SheetHeader>
                                <textarea
                                    value={editableCode}
                                    onChange={e => setEditableCode(e.target.value)}
                                    className="w-full h-[60vh] mt-4 p-2 border rounded bg-background text-foreground font-mono text-sm resize-vertical"
                                    style={{ minHeight: 200 }}
                                />
                            </SheetContent>
                        </Sheet>
                        <Button
                            variant="neutral"
                            size="icon"
                            aria-label="Reset zoom and pan"
                            onClick={handleResetZoom}
                            className="ml-1"
                        >
                            <Maximize className="size-5" />
                        </Button>
                        <div className="relative ml-1" ref={downloadDropdownRef}>
                            <Button
                                variant="neutral"
                                size="icon"
                                aria-label="Download diagram"
                                onClick={() => setShowDownloadDropdown((v) => !v)}
                            >
                                <Download className="size-5" />
                            </Button>
                            {showDownloadDropdown && (
                                <div className="absolute right-0 mt-2 w-auto bg-card rounded-md shadow-lg z-10 border border-border">
                                    <ul className="py-1">
                                        <li>
                                            <button
                                                className="block w-full text-left px-3 py-2 text-card-foreground hover:bg-muted"
                                                onClick={() => initiateDownload('jpeg', handleDownloadJpeg)}
                                            >
                                                JPEG
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className="block w-full text-left px-3 py-2 text-card-foreground hover:bg-muted"
                                                onClick={() => initiateDownload('png', handleDownloadPng)}
                                            >
                                                PNG
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className="block w-full text-left px-3 py-2 text-card-foreground hover:bg-muted"
                                                onClick={() => initiateDownload('svg', handleDownloadSvg)}
                                            >
                                                SVG
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <CardContent className="p-0">
                    {/* {autoCorrected && (
                        <div className="text-center text-yellow-600 text-xs py-2">
                            Auto-corrected '--' to {'-->'} for Mermaid flowchart syntax.
                        </div>
                    )} */}
                    {renderError ? (
                        <div className="text-center text-red-500 min-h-[300px] flex flex-col items-center justify-center">
                            <div className="mb-2 text-base font-semibold">Failed to Display Diagram; Try Again or Use Text Editor</div>
                            <div>
                                {renderError.length > 200 ? renderError.slice(0, 200) + '…' : renderError}
                            </div>
                        </div>
                    ) : (
                        <div
                            ref={containerRef}
                            className="w-full flex justify-center items-center min-h-[300px] overflow-hidden"
                            style={{ position: 'relative' }}
                        />
                    )}
                </CardContent>
            </Card>
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
}; 