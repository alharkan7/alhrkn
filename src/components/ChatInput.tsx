import { Send, Paperclip } from 'lucide-react'
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
    const inputRef = useRef<HTMLInputElement>(null);
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
                    <form onSubmit={handleSubmit} className="relative flex items-center gap-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all max-w-2xl mx-auto w-full">
                        <Input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={onFileSelect}
                            accept="*/*"
                        />
                        <Button
                            type="button"
                            onClick={handleFileClick}
                            className="shrink-0 p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                            disabled={isLoading}
                            aria-label="Attach file"
                        >
                            <Paperclip className="size-5" />
                        </Button>
                        <Input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Send a message..."
                            className="flex-1 bg-transparent focus:outline-none disabled:opacity-50"
                            disabled={isLoading}
                            onFocus={() => onFocusChange?.(true)}
                            onBlur={() => onFocusChange?.(false)}
                        />
                        <Button
                            type="submit"
                            className="shrink-0 p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                            disabled={isLoading || (!input.trim() && !file)}
                            aria-label="Send message"
                        >
                            <Send className="size-5" />
                        </Button>
                    </form>
                </Form>
            </div>
        </>
    );
}