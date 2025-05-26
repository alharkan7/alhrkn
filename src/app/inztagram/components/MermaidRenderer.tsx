import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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

interface MermaidRendererProps {
    code: string;
    diagramType: string;
    diagramTheme: string;
    onThemeChange: (theme: string) => void;
    onNewDiagram: () => void;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code, diagramType, diagramTheme, onThemeChange, onNewDiagram }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!code) return;
        mermaid.initialize({ startOnLoad: false, theme: diagramTheme as any });
        if (containerRef.current) {
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
            containerRef.current.innerHTML = `<div class='mermaid' id='${id}'>${diagramType}\n${code}</div>`;
            mermaid.init(undefined, `#${id}`);

            // Wait for the SVG to be rendered, then apply panzoom
            setTimeout(() => {
                const svg = containerRef.current?.querySelector('svg');
                if (svg) {
                    // @ts-ignore
                    if (containerRef.current.__panzoomInstance) {
                        // @ts-ignore
                        containerRef.current.__panzoomInstance.dispose();
                    }
                    // @ts-ignore
                    containerRef.current.__panzoomInstance = panzoom(svg, {
                        zoomDoubleClickSpeed: 1, // disables zoom on double click
                        maxZoom: 10,
                        minZoom: 0.1,
                        bounds: false,
                        // You can tweak more options here
                    });
                }
            }, 0);
        }
        // Cleanup panzoom instance on unmount or re-render
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
        };
    }, [code, diagramType, diagramTheme]);

    return (
        <div className="flex-1 flex flex-col justify-center items-center max-w-4xl mx-auto w-full px-1 md:px-4 mt-[80px] mb-[20px]">
            <Card className="w-full max-w-2xl shadow-lg">
                <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="neutral" aria-label="Create new diagram">
                                <Plus className="size-5" /> New
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Create New Diagram?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Make sure you have saved your current diagram. It will be erased.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={onNewDiagram}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <div className="flex-1" />
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
                <CardContent className="p-4">
                    <div
                        ref={containerRef}
                        className="w-full flex justify-center items-center min-h-[300px] overflow-hidden"
                        style={{ position: 'relative' }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}; 