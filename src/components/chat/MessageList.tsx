import { useEffect, useRef } from 'react';
import { Message } from '@/types/types';
import { FilePreview } from '@/components/chat/FilePreview';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { Copy } from 'lucide-react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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

    const handleCopy = async (content: Message['content']) => {
        const text = typeof content === 'string'
            ? content
            : content.map(item => item.type === 'text' ? item.text : '').join('\n');

        await navigator.clipboard.writeText(text);
        toast.success("Content copied to clipboard", {
            className: "max-w-[256px]",
            position: "top-center",
            duration: 1500,
            style: {
                left: '50%',
                transform: 'translateX(-50%)'
            }
        });
    };

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
            // Convert line breaks to markdown line breaks before rendering
            const textWithBreaks = content.replace(/\n/g, '  \n');
            return <ReactMarkdown>{textWithBreaks}</ReactMarkdown>;
        }
    
        return content.map((item, idx) => {
            switch (item.type) {
                case 'text':
                    const textWithBreaks = item.text.replace(/\n/g, '  \n');
                    return <ReactMarkdown key={idx}>{textWithBreaks}</ReactMarkdown>;
                case 'image_url':
                    // Ensure the image URL is properly formatted
                    const imageUrl = item.image_url.url.startsWith('data:') 
                        ? item.image_url.url 
                        : `data:image/jpeg;base64,${item.image_url.url}`;
                    return (
                        <FilePreview
                            key={idx}
                            file={{
                                name: 'image.jpg',
                                type: 'image/jpeg',
                                url: imageUrl
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
                            duration: 0.2,
                            ease: "easeOut"
                        }}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`flex flex-col gap-2 ${message.role === 'user' ? 'items-end w-full' : ''}`}>
                            <motion.div
                                className={`rounded-2xl px-4 py-2 max-w-[85%] border-2 border-border shadow-shadow 
                                ${message.role === 'user'
                                        ? 'bg-bw text-text rounded-br-none ml-auto'
                                        : 'bg-main text-mtext rounded-bl-none'
                                    }`}
                                style={{ pointerEvents: 'auto' }}
                            >
                                <div className={`prose prose-sm max-w-none [&_*]:text-current [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mt-2 [&_ol]:mt-2 [&_li]:text-current [&_li]:my-1 [&_ol]:pl-6 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_code]:break-words [&_pre_code]:whitespace-pre-wrap [&_h1]:font-bold [&_h1]:text-lg [&_h1]:mt-4 [&_h1]:mb-2 [&_pre]:mb-4 [&_pre+p]:mt-4 ${message.role === 'user'
                                    ? '[&_p]:text-mtext [&_a]:text-mtext [&_li]:text-mtext [&_ul]:text-mtext [&_ol]:text-mtext [&_code]:text-mtext [&_h1]:text-mtext text-left'
                                    : '[&_p]:text-text [&_a]:text-text [&_li]:text-text [&_ul]:text-text [&_ol]:text-text [&_code]:text-text [&_h1]:text-text'
                                    }`}
                                    style={{ pointerEvents: 'auto' }}
                                >
                                    {renderMessageContent(message.content)}
                                </div>
                            </motion.div>
                            {message.role === 'assistant' && (
                                <Button
                                    variant="default"
                                    size="icon"
                                    className="self-start mr-2 h-6 w-6"
                                    onClick={() => handleCopy(message.content)}
                                >
                                    <Copy className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            )}
                        </div>
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