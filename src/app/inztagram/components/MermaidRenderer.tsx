import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Maximize, LoaderCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DIAGRAM_THEMES } from './diagram-types';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import panzoom from 'panzoom';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface MermaidRendererProps {
    code: string;
    diagramType: string;
    diagramTheme: string;
    onThemeChange: (theme: string) => void;
    onNewDiagram: () => void;
    onCodeChange?: (code: string) => void;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code, diagramType, diagramTheme, onThemeChange, onNewDiagram, onCodeChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const panzoomRef = useRef<any>(null);
    const initialTransformRef = useRef<{ x: number, y: number, scale: number } | null>(null);
    const [renderError, setRenderError] = useState<string | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editableCode, setEditableCode] = useState(code);

    useEffect(() => {
        if (!code) return;
        setRenderError(null);
        mermaid.initialize({ startOnLoad: false, theme: diagramTheme as any });

        if (containerRef.current) {
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
            const graphDefinition = `${diagramType}\n${code}`;
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

    return (
        <div className="flex-1 flex flex-col justify-center items-center max-w-4xl mx-auto w-full px-1 md:px-4 mt-[80px] mb-[20px]">
            <Card className="w-full max-w-2xl shadow-lg">
                <div className="flex items-center justify-between px-4 py-2 border-b">
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
                    <div className="flex items-center gap-2 ml-auto">
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
                    </div>
                </div>
                <CardContent className="p-0">
                    {renderError ? (
                        <div className="text-center text-red-500 min-h-[300px] flex items-center justify-center">
                            {renderError}
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
        </div>
    );
}; 