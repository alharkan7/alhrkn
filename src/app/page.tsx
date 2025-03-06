'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatTitle } from '@/components/chat/ChatTitle'
import { MessageList } from '@/components/chat/MessageList'
import { ChatInput } from '@/components/chat/ChatInput'
import { useChatMessages } from '@/hooks/useChatMessages'
import AppsFooter from '@/components/apps-footer'
import { AppsHeader } from '@/components/apps-header'
import { useFileUpload } from '@/hooks/useFileUpload';
import { apps } from '@/config/apps';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
    const { messages, isLoading, isStreaming, sendMessage, clearMessages } = useChatMessages();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [input, setInput] = useState('');
    const [hasUserSentMessage, setHasUserSentMessage] = useState(false);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const { file, handleFileSelect, clearFile } = useFileUpload();

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            if (isMobile) {
                requestAnimationFrame(() => {
                    messagesEndRef.current?.scrollIntoView({ block: 'end' });
                });
            } else {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    // Watch for new messages and content changes
    useEffect(() => {
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage.role === 'assistant' || lastMessage.role === 'user') {
                scrollToBottom();
            }
        }
    }, [messages, messages[messages.length - 1]?.content]);

    // Initial scroll
    useEffect(() => {
        scrollToBottom();
    }, []);

    // Update file selection handler
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            await handleFileSelect(selectedFile);
        }
    };

    const handleSendMessage = async (text: string) => {
        if (!hasUserSentMessage) {
            setHasUserSentMessage(true);
        }
        setInput(''); // Clear input immediately after sending

        // Only send if file is uploaded or there's text
        if (text.trim() || (file && file.uploaded)) {
            await sendMessage(text, file);
            clearFile();
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Update handleClearChat to use new clearFile
    const handleClearChat = () => {
        clearMessages();
        setHasUserSentMessage(false);
        setInput('');
        clearFile();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-background">
            {!hasUserSentMessage && (
                <>
                    <div className="flex-none max-w-6xl mx-auto w-full hidden sm:block">
                        <div className="flex justify-end pt-1 pr-2">
                            <Button
                                variant="neutral"
                                className="flex items-center justify-start text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => window.location.href = 'mailto:enaiblr@gmail.com'}
                            >
                                <Mail className='' />
                                Request Apps
                            </Button>
                        </div>
                    </div>
                    <div className="flex-none sm:hidden">
                        <AppsHeader />
                    </div>
                </>
            )}
            <div className={`flex-1 overflow-hidden flex flex-col justify-start max-w-4xl mx-auto w-full px-1 md:px-4 ${!hasUserSentMessage ? 'mt-[20vh]' : ''}`}>
                <div className="flex-none">
                    <ChatTitle
                        clearMessages={handleClearChat}
                        hasUserSentMessage={hasUserSentMessage}
                    />
                </div>
                {hasUserSentMessage && (
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-600/50 hover:scrollbar-thumb-zinc-600/70 overflow-x-hidden">
                        <MessageList
                            messages={messages}
                            messagesEndRef={messagesEndRef}
                            onUpdate={scrollToBottom}
                            isLoading={isLoading}
                            isStreaming={isStreaming}
                        />
                    </div>
                )}
                <div className="flex-none py-4 px-2">
                    <ChatInput
                        input={input}
                        setInput={setInput}
                        isLoading={isLoading || isStreaming}
                        fileInputRef={fileInputRef}
                        onFileSelect={handleFileChange}
                        file={file}
                        clearFile={clearFile}
                        sendMessage={handleSendMessage}
                        onFocusChange={setIsInputFocused}
                    />
                </div>
                {!hasUserSentMessage && (
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-600/50 hover:scrollbar-thumb-zinc-600/70 overflow-x-hidden mt-4 hidden sm:block">
                        <div className="max-w-[600px] mx-auto px-4">
                            <div className="apps-grid-content gap-3 grid grid-cols-2 sm:grid-cols-3 pb-2">
                                {apps.map((app) => {
                                    const Icon = app.icon;
                                    const currentPath = typeof window !== 'undefined' ? window.location.pathname.slice(1) : '';
                                    const router = useRouter();

                                    // Skip rendering if current path matches the app slug
                                    if (currentPath === app.slug) return null;

                                    return (
                                        <Button
                                            variant="default"
                                            key={app.slug}
                                            className="relative h-[70px] flex flex-col items-center justify-center"
                                            onClick={() => {
                                                if (app.slug === 'enaiblr') {
                                                    window.open('https://enaiblr.org/apps', '_blank');
                                                } else {
                                                    router.push(`/${app.slug}`);
                                                }
                                            }}
                                        >
                                            <Icon className="!size-5 text-foreground" />
                                            <div className="w-full h-8 flex items-start">
                                                <span className="text-xs font-medium line-clamp-2 text-center whitespace-normal break-words w-full px-2">{app.name}</span>
                                            </div>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {!hasUserSentMessage && (
                <div className="flex-none mb-1">
                    <AppsFooter />
                </div>
            )}
        </div>
    );
}