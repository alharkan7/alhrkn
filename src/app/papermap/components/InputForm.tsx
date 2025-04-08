import { Send, Paperclip, Link2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { FilePreview } from '@/components/ui/FilePreview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form } from '@/components/ui/form'
import { useForm } from 'react-hook-form'

interface InputFormProps {
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

export function InputForm({
    input,
    setInput,
    isLoading,
    fileInputRef,
    onFileSelect,
    file,
    clearFile,
    sendMessage,
    onFocusChange
}: InputFormProps) {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const form = useForm();
    const [isFocused, setIsFocused] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        inputRef.current?.blur();

        if ((file && file.uploaded) || input.trim()) {
            const fileToSend = file;  // Store file reference before clearing
            setInput('');
            clearFile();  // Clear file immediately
            await sendMessage(input, fileToSend);  // Use stored file reference
        }
    };

    const handleFileClick = (type: 'file' | 'image') => {
        if (fileInputRef.current) {
            fileInputRef.current.accept = type === 'image' ? 'image/*' : '*/*';
            fileInputRef.current.click();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleFocus = () => {
        console.log('Focus event triggered');
        setIsFocused(true);
        onFocusChange?.(true);
    };

    const handleBlur = () => {
        console.log('Blur event triggered');
        setIsFocused(false);
        onFocusChange?.(false);
    };

    return (
        <>
            <div className="relative flex flex-col gap-2">
                {file && (
                    <div className="w-full flex justify-center">
                        <FilePreview
                            file={file}
                            isUploading={!file.uploaded}
                            onRemove={clearFile}
                        />
                    </div>
                )}
                <Form {...form}>
                    <form 
                        onSubmit={handleSubmit} 
                        data-focused={isFocused}
                        className={`relative flex flex-col gap-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-200 max-w-2xl mx-auto w-full ${
                            isFocused 
                            ? 'border-[3px] border-ring shadow-[3px_3px_0px_0px_var(--ring)]' 
                            : 'border-[2px] border-border shadow-[var(--shadow)]'
                        } bg-bw rounded-lg p-2`}
                    >
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={file ? "Add a message..." : "Send a message..."}
                            className="w-full bg-transparent border-0 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none disabled:opacity-50 p-0 resize-none min-h-[40px] max-h-[120px] overflow-y-auto px-1 pb-1"
                            onFocus={handleFocus}
                            onBlur={handleBlur}
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
                        />
                        <div className="flex justify-between items-center w-full">
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    onClick={() => handleFileClick('file')}
                                    className="shrink-0 p-2 transition-colors disabled:opacity-50"
                                    disabled={isLoading || !!file}
                                    aria-label="Attach file"
                                >
                                    <Paperclip className="size-5" />
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => handleFileClick('image')}
                                    className="shrink-0 p-2 transition-colors disabled:opacity-50"
                                    disabled={isLoading || !!file}
                                    aria-label="Attach image"
                                >
                                    <Link2 className="size-5" />
                                </Button>
                            </div>
                            <Button
                                type="submit"
                                className="shrink-0 p-2 transition-colors disabled:opacity-50"
                                disabled={isLoading || (!input.trim() && (!file || !file.uploaded))}
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