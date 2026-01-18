'use client';

import { useState, useCallback, useRef } from 'react';
import { MindMapNode } from '../types';

interface StreamRealtimeMessage {
    type: 'init' | 'node' | 'complete' | 'error';
    node?: MindMapNode;
    mindmapId?: string;
    error?: string;
}

interface UseRealtimeStreamingProps {
    onInit?: (mindmapId: string) => void;
    onNodeReceived?: (node: MindMapNode) => void;
    onComplete?: (mindmapId: string) => void;
    onError?: (error: string) => void;
}

interface UseRealtimeStreamingReturn {
    isStreaming: boolean;
    streamingPhase: 'idle' | 'initializing' | 'streaming' | 'complete' | 'error';
    mindmapId: string | null;
    nodeCount: number;
    startRealtimeStreaming: (params: {
        blobUrl?: string;
        textInput?: string;
        sourceUrl?: string;
        originalFileName?: string;
    }) => Promise<{ mindmapId: string } | null>;
    cancelStreaming: () => void;
}

/**
 * Hook for handling true real-time streaming of mindmap nodes
 * Uses the NDJSON format where each node is streamed individually
 */
export function useRealtimeStreaming({
    onInit,
    onNodeReceived,
    onComplete,
    onError
}: UseRealtimeStreamingProps = {}): UseRealtimeStreamingReturn {
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingPhase, setStreamingPhase] = useState<'idle' | 'initializing' | 'streaming' | 'complete' | 'error'>('idle');
    const [mindmapId, setMindmapId] = useState<string | null>(null);
    const [nodeCount, setNodeCount] = useState(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    const startRealtimeStreaming = useCallback(async (params: {
        blobUrl?: string;
        textInput?: string;
        sourceUrl?: string;
        originalFileName?: string;
    }): Promise<{ mindmapId: string } | null> => {
        // Cancel any existing stream
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();

        setIsStreaming(true);
        setStreamingPhase('initializing');
        setMindmapId(null);
        setNodeCount(0);

        let finalMindmapId: string | null = null;

        try {
            const response = await fetch('/api/papermap/stream-realtime', {
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
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const message: StreamRealtimeMessage = JSON.parse(line.slice(6));

                            switch (message.type) {
                                case 'init':
                                    if (message.mindmapId) {
                                        finalMindmapId = message.mindmapId;
                                        setMindmapId(message.mindmapId);
                                        setStreamingPhase('streaming');
                                        onInit?.(message.mindmapId);
                                    }
                                    break;

                                case 'node':
                                    if (message.node) {
                                        setNodeCount(prev => prev + 1);
                                        onNodeReceived?.(message.node);
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

            return finalMindmapId ? { mindmapId: finalMindmapId } : null;
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                setStreamingPhase('idle');
            } else {
                console.error('Realtime streaming error:', error);
                setStreamingPhase('error');
                onError?.(error instanceof Error ? error.message : 'Unknown error');
            }
            setIsStreaming(false);
            return null;
        }
    }, [onInit, onNodeReceived, onComplete, onError]);

    const cancelStreaming = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsStreaming(false);
        setStreamingPhase('idle');
        setNodeCount(0);
    }, []);

    return {
        isStreaming,
        streamingPhase,
        mindmapId,
        nodeCount,
        startRealtimeStreaming,
        cancelStreaming
    };
}
