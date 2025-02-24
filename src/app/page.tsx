'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatTitle } from '@/components/ChatTitle'
import { MessageList } from '@/components/MessageList'
import { ChatInput } from '@/components/ChatInput'
import { useChatMessages } from '@/hooks/useChatMessages'
import AppsFooter from '@/components/apps-footer'
import { AppsHeader } from '@/components/apps-header'
import { useFileUpload } from '@/hooks/useFileUpload';

export default function MinimalistChatbot() {
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
                <div className="flex-none">
                    <AppsHeader />
                </div>
            )}
            <div className="flex-1 overflow-hidden flex flex-col justify-center max-w-4xl mx-auto w-full px-1 md:px-4">
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
                        autoFocus={true}
                        file={file}
                        clearFile={clearFile}
                        sendMessage={handleSendMessage}
                        onFocusChange={setIsInputFocused}
                    />
                </div>
            </div>
            {!hasUserSentMessage && (
                <div className="flex-none">
                    <AppsFooter />
                </div>
            )}
        </div>
    );
}