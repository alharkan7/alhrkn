import { useState } from 'react';
import { Message } from '../types/types';

export function useChatMessages() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    
    const clearMessages = () => {
        setMessages([]);
        setIsLoading(false);
        setIsStreaming(false);
    };

    const toTogetherMessage = (msg: Message): any => ({
        role: msg.role,
        content: msg.content
    });

    const sendMessage = async (input: string, file: { name: string; type: string; url: string } | null) => {
        if ((!input.trim() && !file) || isLoading) return;

        // Clean up previous messages first
        const cleanedMessages = messages.map(msg => ({
            ...msg,
            content: Array.isArray(msg.content) 
                ? msg.content.map(part => {
                    if (part.type === 'image_url') {
                        // Skip cleaning URLs for the most recent message
                        return part;
                    } else if (part.type === 'file_url') {
                        // Skip cleaning URLs for the most recent message
                        return part;
                    }
                    return part;
                })
                : msg.content
        })) as Message[];

        const userMessage: Message = {
            role: 'user',
            content: file ? [
                file.type.startsWith('image/') 
                    ? {
                        type: 'image_url' as const,
                        image_url: { url: file.url }
                    }
                    : {
                        type: 'file_url' as const,
                        file_url: { url: file.url, name: file.name, type: file.type }
                    },
                { type: 'text' as const, text: input.trim() || `Analyzing ${file.name}...` }
            ] : [{ type: 'text' as const, text: input.trim() }]
        };

        setMessages([...cleanedMessages, userMessage]);
        setIsLoading(true);
        setIsStreaming(false);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [...messages.map(toTogetherMessage), toTogetherMessage(userMessage)],
                    file
                })
            });

            if (!response.ok) throw new Error('Failed to send message');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader available');

            let assistantMessage = '';
            const userMessages = [...messages, userMessage];
            let firstChunkReceived = false;

            const textDecoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                if (!firstChunkReceived) {
                    setIsLoading(false);
                    setIsStreaming(true);
                    firstChunkReceived = true;
                }

                const chunk = textDecoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const { content } = JSON.parse(line.slice(6));
                            if (content) {
                                assistantMessage += content;
                                setMessages([
                                    ...userMessages,
                                    {
                                        role: 'assistant',
                                        content: [{ type: 'text', text: assistantMessage }]
                                    }
                                ]);
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            setIsLoading(false);
        } finally {
            setIsStreaming(false);
        }
    };

    return { messages, isLoading, isStreaming, sendMessage, clearMessages };
}