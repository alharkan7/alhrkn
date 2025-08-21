"use client";

import Header from '@editorjs/header';
import List from '@editorjs/list';
import Marker from '@editorjs/marker';
import InlineCode from '@editorjs/inline-code';
import Underline from '@editorjs/underline';
import { ExpandInlineTool } from '../tools/ExpandInlineTool';
import { CitationTool } from '../tools/CitationTool';
import { ParaphraseTool } from '../tools/ParaphraseTool';
import { ChatTool } from '../tools/ChatTool';
import type EditorJS from '@editorjs/editorjs';
import type { MutableRefObject } from 'react';

export function getToolsConfig(params: {
    language: 'en' | 'id';
    editorRef: MutableRefObject<EditorJS | null>;
    onOpenChat: (selectedText?: string) => void;
}) {
    const { language, editorRef, onOpenChat } = params;
    return {
        paragraph: {
            inlineToolbar: ['link', 'bold', 'italic', 'underline', 'inlineCode', 'marker', 'expand', 'paraphrase', 'cite', 'chat']
        } as any,
        header: {
            class: Header as any,
            inlineToolbar: ['link', 'bold', 'italic', 'underline', 'inlineCode', 'marker', 'expand', 'paraphrase', 'cite', 'chat']
        } as any,
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
                language,
                getDocument: async () => {
                    try { if (editorRef.current) { return await editorRef.current.save(); } } catch {}
                    return { blocks: [] };
                },
                notify: (msg: string) => { try { console.log(msg); } catch {} }
            }
        } as any,
        paraphrase: {
            class: ParaphraseTool as any,
            config: {
                endpoint: '/api/outliner/paraphrase',
                language,
                getDocument: async () => {
                    try { if (editorRef.current) { return await editorRef.current.save(); } } catch {}
                    return { blocks: [] };
                },
                notify: (msg: string) => { try { console.log(msg); } catch {} }
            }
        } as any,
        cite: {
            class: CitationTool as any,
            config: {
                endpoint: '/api/outliner/cite',
                language,
                getDocument: async () => {
                    try { if (editorRef.current) { return await editorRef.current.save(); } } catch {}
                    return { blocks: [] };
                },
                notify: (msg: string) => { try { console.log(msg); } catch {} }
            }
        } as any,
        chat: {
            class: ChatTool as any,
            config: {
                endpoint: '/api/outliner/chat',
                language,
                getDocument: async () => {
                    try { if (editorRef.current) { return await editorRef.current.save(); } } catch {}
                    return { blocks: [] };
                },
                notify: (msg: string) => { try { console.log(msg); } catch {} },
                onOpenChat
            }
        } as any,
    };
}


