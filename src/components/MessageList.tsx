import { useEffect, useRef } from 'react';
import { Message } from '@/types/types';
import { FilePreview } from '@/components/FilePreview';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { TypingIndicator } from '@/components/TypingIndicator';

interface MessageListProps {
    messages: Message[];
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onUpdate: () => void;
    isLoading: boolean;
    isStreaming: boolean;
}

export function MessageList({ messages, messagesEndRef, isLoading, isStreaming }: MessageListProps) {
    const messageListRef = useRef<HTMLDivElement>(null);
    const prevMessagesLengthRef = useRef(messages.length);

    const scrollToBottom = () => {
        if (messageListRef.current && messagesEndRef.current) {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            requestAnimationFrame(() => {
                if (isMobile) {
                    messagesEndRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
                } else {
                    messageListRef.current!.scrollTop = messageListRef.current!.scrollHeight;
                }
            });
        }
    };

    useEffect(() => {
        if (messages.length !== prevMessagesLengthRef.current) {
            scrollToBottom();
            prevMessagesLengthRef.current = messages.length;
        }
    }, [messages.length]);

    const renderMessageContent = (content: Message['content']) => {
        if (typeof content === 'string') {
            return <ReactMarkdown>{content}</ReactMarkdown>;
        }

        return content.map((item, idx) => {
            switch (item.type) {
                case 'text':
                    return <ReactMarkdown key={idx}>{item.text}</ReactMarkdown>;
                case 'image_url':
                    return (
                        <FilePreview
                            key={idx}
                            file={{
                                name: 'image.jpg',
                                type: 'image/jpeg', 
                                url: item.image_url.url
                            }}
                            isUploading={false}
                            onRemove={() => { }}
                            isSent={true}
                            inMessage={true}
                        />
                    );
                case 'file_url':
                    return (
                        <FilePreview
                            key={idx}
                            file={{
                                name: item.file_url.name,
                                type: item.file_url.type,
                                url: item.file_url.url
                            }}
                            isUploading={false}
                            onRemove={() => { }}
                            isSent={true}
                            inMessage={true}
                        />
                    );
                default:
                    return null;
            }
        });
    };

    return (
        <div ref={messageListRef} className="h-full px-4 pb-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted/20 hover:scrollbar-thumb-muted/40">
            <div className="max-w-4xl mx-auto space-y-4 mt-4">
                {messages.map((message, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                            duration: 0.4,
                            delay: index * 0.1,
                            ease: "easeOut"
                        }}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <motion.div
                            className={`rounded-2xl px-4 py-2 max-w-[85%] ${message.role === 'user'
                                ? 'bg-primary/50 text-primary-foreground rounded-br-none'
                                : 'bg-accent text-accent-foreground rounded-bl-none'
                                }`}
                            style={{ pointerEvents: 'auto' }}
                        >
                            <div 
                                className={`prose prose-sm max-w-none [&_*]:text-current [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mt-2 [&_ol]:mt-2 [&_li]:text-current [&_li]:my-1 [&_ol]:pl-6 ${message.role === 'user'
                                    ? '[&_p]:text-primary-foreground [&_a]:text-primary-foreground [&_li]:text-primary-foreground [&_ul]:text-primary-foreground [&_ol]:text-primary-foreground'
                                    : '[&_p]:text-accent-foreground [&_a]:text-accent-foreground [&_li]:text-accent-foreground [&_ul]:text-accent-foreground [&_ol]:text-accent-foreground'
                                    }`}
                                style={{ pointerEvents: 'auto' }}
                            >
                                {renderMessageContent(message.content)}
                            </div>
                        </motion.div>
                    </motion.div>
                ))}
                <AnimatePresence>
                    {(isLoading || isStreaming) && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="flex justify-start"
                        >
                            <TypingIndicator />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div ref={messagesEndRef} />
        </div>
    );
}