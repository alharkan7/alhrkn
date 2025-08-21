"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import EditorJS from '@editorjs/editorjs';
import '../styles/editor.css';
import { Toolbar } from '../components/Toolbar';
import { ChatInterface } from '../components/ChatInterface';
import EmailForm from '../../papermap/components/EmailForm';
import { ResearchIdea, convertToMarkdown, convertToPlainText } from './utils';
import { useChatPanel, useDebouncedCallback, useDocumentStorage, useDownloads, useEmailDownload, useMiniToolbar, useStreamingOutline } from './hooks';
import { getToolsConfig } from './toolsConfig';

export function OutlinerEditor({ id, idea, language }: { id: string; idea: ResearchIdea; language: 'en' | 'id' }) {
    const editorRef = useRef<EditorJS | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isReady, setIsReady] = useState(false);
    const holderId = `outliner-editor-${id}`;

    const { loadInitial, saveDoc } = useDocumentStorage(id, idea, language);
    const debouncedSave = useDebouncedCallback((ref: typeof editorRef) => saveDoc(ref), 600);
    const { isStreaming, startStreaming, lastAppliedBlocksRef } = useStreamingOutline({ id, idea, language, editorRef });
    useMiniToolbar(holderId);
    const { handleDownload } = useDownloads({ idea, editorRef, language });
    const { showEmailForm, pendingDownloadFormat, emailLoading, emailError, initiateDownload, handleEmailSubmit, setShowEmailForm, setPendingDownloadAction, setPendingDownloadFormat } = useEmailDownload();
    const { showChat, documentContext, selectedText, handleOpenChat, handleCloseChat } = useChatPanel({ idea, editorRef });

    const handleDownloadWithEmail = useCallback(async (format: 'pdf' | 'markdown' | 'txt' | 'docx') => {
        if (!editorRef.current) return;
        const action = async () => { await handleDownload(format); };
        initiateDownload(format, action);
    }, [handleDownload, initiateDownload]);

    useEffect(() => {
        let isMounted = true;
        const initializeEditor = async () => {
            if (editorRef.current) {
                try { await editorRef.current.destroy(); } catch {}
                editorRef.current = null;
            }
            if (containerRef.current) { containerRef.current.innerHTML = ''; }
            if (!isMounted) return;

            const { initialData, shouldStartStreaming } = loadInitial();
            try {
                const editor = new EditorJS({
                    holder: holderId,
                    placeholder: "Start writing… Use '/' for blocks",
                    inlineToolbar: true,
                    autofocus: true,
                    tools: getToolsConfig({ language, editorRef, onOpenChat: handleOpenChat }),
                    data: initialData,
                    onChange: () => {
                        debouncedSave(editorRef);
                        setTimeout(() => {
                            const container = document.getElementById('bibliography-container');
                            if (container) {
                                window.dispatchEvent(new CustomEvent('outliner-document-changed'));
                            }
                        }, 100);
                    },
                    onReady: () => {
                        if (isMounted) {
                            setIsReady(true);
                            try { lastAppliedBlocksRef.current = Array.isArray(initialData?.blocks) ? initialData.blocks : []; } catch {}
                            if (shouldStartStreaming) { setTimeout(() => { startStreaming(); }, 100); }
                        }
                    }
                });
                if (isMounted) { editorRef.current = editor; }
            } catch (error) {
                console.error('Error initializing EditorJS:', error);
            }
        };
        const timeoutId = setTimeout(initializeEditor, 50);
        return () => {
            isMounted = false; clearTimeout(timeoutId);
            if (editorRef.current) { try { editorRef.current.destroy(); } catch {} editorRef.current = null; }
            try { /* listeners are cleaned up in hook */ } catch {}
            setIsReady(false);
        };
    }, [holderId, language, startStreaming, loadInitial, debouncedSave, handleOpenChat]);

    return (
        <div className="prose prose-neutral dark:prose-invert max-w-none">
            <Toolbar onDownload={handleDownloadWithEmail} onOpenChat={handleOpenChat} />
            {!isReady && (
                <div className="text-center py-8 text-gray-500">
                    {language === 'en' ? 'Loading editor...' : 'Memuat editor...'}
                </div>
            )}
            <div id={holderId} ref={containerRef} style={{ display: isReady ? 'block' : 'none', minHeight: '200px', position: 'relative' }} className="editor-container text-foreground" />
            <div className="border-t">
                <h2 className="text-2xl font-bold mb-6 text-foreground">References</h2>
                <div id="bibliography-container" className="space-y-4 break-words">
                    <p data-bibliography-placeholder="true" className="text-muted-foreground italic">
                        Citations will appear here as you add them to your document using the citation tool.
                    </p>
                </div>
            </div>
            {showEmailForm && (
                <EmailForm
                    onSubmit={(email) => handleEmailSubmit(email, idea.title || 'document')}
                    onCancel={() => { setShowEmailForm(false); setPendingDownloadAction(null); setPendingDownloadFormat(''); }}
                    loading={emailLoading}
                    error={emailError}
                    downloadFormat={pendingDownloadFormat}
                />
            )}
            <ChatInterface isOpen={showChat} onClose={handleCloseChat} documentContext={documentContext} selectedText={selectedText} />
        </div>
    );
}


