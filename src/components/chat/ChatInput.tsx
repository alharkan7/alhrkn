import { Send, Paperclip, Image } from 'lucide-react'
import { useRef } from 'react'
import { FilePreview } from './FilePreview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form } from '@/components/ui/form'
import { useForm } from 'react-hook-form'

interface ChatInputProps {
    input: string;
    setInput: (input: string) => void;
    isLoading: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    clearFile: () => void;
    sendMessage: (text: string, file: { name: string; type: string; url: string } | null) => Promise<void>;
    onFocusChange?: (focused: boolean) => void;
    file: { name: string; type: string; url: string; uploaded?: boolean } | null;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function ChatInput({
    input,
    setInput,
    isLoading,
    fileInputRef,
    onFileSelect,
    file,
    clearFile,
    sendMessage,
    onFocusChange
}: ChatInputProps) {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const form = useForm();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        inputRef.current?.blur();

        // Only proceed if we have input text or an uploaded file
        if (input.trim() || (file && file.uploaded)) {
            await sendMessage(input, file);
            setInput('');
            clearFile();
        }
    };

    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const imageInputRef = useRef<HTMLInputElement>(null);

    const handleImageClick = () => {
        imageInputRef.current?.click();
    };

    return (
        <>
            <div className="relative flex flex-col gap-2">
                {file && !isLoading && (
                    <div className="w-full flex justify-center">
                        <FilePreview
                            file={file}
                            isUploading={true}
                            onRemove={clearFile}
                        />
                    </div>
                )}
                <Form {...form}>
                    <form onSubmit={handleSubmit} className="relative flex flex-col gap-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all max-w-2xl mx-auto w-full border-2 border-border bg-bw rounded-lg p-2 shadow-[var(--shadow)]">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Send a message..."
                            className="w-full bg-transparent border-0 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none disabled:opacity-50 p-0 resize-none min-h-[40px] max-h-[120px] overflow-y-auto px-1 pb-1"
                            disabled={isLoading}
                            onFocus={() => onFocusChange?.(true)}
                            onBlur={() => onFocusChange?.(false)}
                            rows={1}
                            style={{ height: 'auto' }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${target.scrollHeight}px`;
                            }}
                        />
                        <Input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={onFileSelect}
                            accept="*/*"
                        />
                        <Input
                            type="file"
                            ref={imageInputRef}
                            className="hidden"
                            onChange={onFileSelect}
                            accept="image/*"
                        />
                        <div className="flex justify-between items-center w-full">
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    onClick={handleFileClick}
                                    className="shrink-0 p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                    disabled={isLoading}
                                    aria-label="Attach file"
                                >
                                    <Paperclip className="size-5" />
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleImageClick}
                                    className="shrink-0 p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                    disabled={isLoading}
                                    aria-label="Attach image"
                                >
                                    <Image className="size-5" />
                                </Button>
                            </div>
                            <Button
                                type="submit"
                                className="shrink-0 p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                                disabled={isLoading || (!input.trim() && !file)}
                                aria-label="Send message"
                            >
                                <Send className="size-5" />
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </>
    );
}