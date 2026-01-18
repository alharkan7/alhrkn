'use client';

import { useState, useCallback, useRef } from 'react';
import { MindMapData, MindMapNode } from '../types';

interface StreamMessage {
    type: 'overview' | 'expansion' | 'complete' | 'error';
    nodes?: MindMapNode[];
    mindmapId?: string;
    parentNodeId?: string;
    error?: string;
}

interface UseStreamingMindMapProps {
    onOverviewReady?: (nodes: MindMapNode[], mindmapId: string) => void;
    onNodesAdded?: (nodes: MindMapNode[], parentNodeId?: string) => void;
    onComplete?: (mindmapId: string) => void;
    onError?: (error: string) => void;
}

interface UseStreamingMindMapReturn {
    isStreaming: boolean;
    streamingPhase: 'idle' | 'overview' | 'expanding' | 'complete' | 'error';
    mindmapId: string | null;
    startStreaming: (params: {
        blobUrl?: string;
        textInput?: string;
        sourceUrl?: string;
        originalFileName?: string;
    }) => Promise<void>;
    cancelStreaming: () => void;
}

export function useStreamingMindMap({
    onOverviewReady,
    onNodesAdded,
    onComplete,
    onError
}: UseStreamingMindMapProps = {}): UseStreamingMindMapReturn {
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingPhase, setStreamingPhase] = useState<'idle' | 'overview' | 'expanding' | 'complete' | 'error'>('idle');
    const [mindmapId, setMindmapId] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const startStreaming = useCallback(async (params: {
        blobUrl?: string;
        textInput?: string;
        sourceUrl?: string;
        originalFileName?: string;
    }) => {
        // Cancel any existing stream
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        setIsStreaming(true);
        setStreamingPhase('overview');
        setMindmapId(null);

        try {
            const response = await fetch('/api/papermap/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('No response body');
            }

            // Read the SSE stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process complete SSE messages
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const message: StreamMessage = JSON.parse(line.slice(6));

                            switch (message.type) {
                                case 'overview':
                                    if (message.nodes && message.mindmapId) {
                                        setMindmapId(message.mindmapId);
                                        setStreamingPhase('expanding');
                                        onOverviewReady?.(message.nodes, message.mindmapId);
                                    }
                                    break;

                                case 'expansion':
                                    if (message.nodes) {
                                        onNodesAdded?.(message.nodes, message.parentNodeId);
                                    }
                                    break;

                                case 'complete':
                                    setStreamingPhase('complete');
                                    setIsStreaming(false);
                                    if (message.mindmapId) {
                                        onComplete?.(message.mindmapId);
                                    }
                                    break;

                                case 'error':
                                    setStreamingPhase('error');
                                    setIsStreaming(false);
                                    onError?.(message.error || 'Unknown error');
                                    break;
                            }
                        } catch (parseError) {
                            console.error('Failed to parse SSE message:', line, parseError);
                        }
                    }
                }
            }
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                // Stream was cancelled, don't treat as error
                setStreamingPhase('idle');
            } else {
                console.error('Streaming error:', error);
                setStreamingPhase('error');
                onError?.(error instanceof Error ? error.message : 'Unknown error');
            }
            setIsStreaming(false);
        }
    }, [onOverviewReady, onNodesAdded, onComplete, onError]);

    const cancelStreaming = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsStreaming(false);
        setStreamingPhase('idle');
    }, []);

    return {
        isStreaming,
        streamingPhase,
        mindmapId,
        startStreaming,
        cancelStreaming
    };
}
