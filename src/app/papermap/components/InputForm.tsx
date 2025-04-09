import React, { useState, useRef } from 'react';
import { LoaderCircle, AlertTriangle, Waypoints, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { upload } from '@vercel/blob/client';
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define file size limit constant - increased with Vercel Blob
const MAX_FILE_SIZE_MB = 25; // Maximum file size for PDF uploads
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type InputMode = 'file' | 'url' | 'text';

interface InputFormProps {
    onFileUpload: (file: File | { text: string, isTextInput?: boolean }, blobUrl?: string) => void;
    loading: boolean;
    error: string | null;
    onExampleClick?: () => void;
}

const InputForm: React.FC<InputFormProps> = ({
    onFileUpload,
    loading,
    error,
    onExampleClick
}) => {
    const [url, setUrl] = useState<string>('');
    const [text, setText] = useState<string>('');
    const [urlError, setUrlError] = useState<string | null>(null);
    const [urlLoading, setUrlLoading] = useState<boolean>(false);
    const [file, setFile] = useState<File | null>(null);
    const [fileSizeError, setFileSizeError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [isFocused, setIsFocused] = useState(false);
    const [inputMode, setInputMode] = useState<InputMode>('file');
    const [isDragging, setIsDragging] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const form = useForm();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleInputModeChange = (value: string) => {
        setInputMode(value as InputMode);
        setUrlError(null);
        setFileSizeError(null);
        // Clear other inputs when switching modes
        if (value === 'file') {
            setUrl('');
            setText('');
        } else if (value === 'url') {
            setFile(null);
            setText('');
        } else if (value === 'text') {
            setFile(null);
            setUrl('');
        }
    };

    // Add auto-resize function
    const autoResize = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        }
    };

    const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(event.target.value);
        setUrlError(null);
        setFileSizeError(null);
        autoResize();
    };

    // Check if file size is within limits
    const checkFileSize = (file: File): boolean => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setFileSizeError(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
            return false;
        }
        setFileSizeError(null);
        return true;
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        // Clear both error states when file selection dialog is opened
        setUrlError(null);
        if (selectedFile) {
            if (checkFileSize(selectedFile)) {
                setFile(selectedFile);
                setUrl('');
                setFileSizeError(null);
            } else {
                setFile(null);
                // Keep the file selected in the input for better UX
                event.target.value = '';
            }
        }
    };

    const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);

        if (event.dataTransfer.files?.length) {
            const droppedFile = event.dataTransfer.files[0];
            if (droppedFile.type === 'application/pdf') {
                if (checkFileSize(droppedFile)) {
                    setFile(droppedFile);
                    setUrl('');
                }
            }
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    };

    const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(event.target.value);
        setUrlError(null);
        setFileSizeError(null);
        if (event.target.value) {
            setFile(null);
        }
    };

    const handleFileClick = (e: React.MouseEvent) => {
        // Only prevent default to stop form submission
        e.preventDefault();
        if (fileInputRef.current) {
            fileInputRef.current.accept = 'application/pdf';
            fileInputRef.current.click();
            // Clear any URL errors when opening the file dialog
            setUrlError(null);
        }
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    // Upload file to Vercel Blob storage using direct client upload
    const uploadFileToBlob = async (fileToUpload: File): Promise<string | null> => {
        try {
            setIsUploading(true);
            setUploadProgress(10); // Start progress

            // Set progress to mimic upload progress
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 500);

            try {
                // Use the client direct upload method
                const blob = await upload(fileToUpload.name, fileToUpload, {
                    access: 'public',
                    handleUploadUrl: '/api/papermap/blob',
                });

                // Clear interval and complete progress
                clearInterval(progressInterval);
                setUploadProgress(100);

                // Return the blob URL
                return blob.url;
            } catch (error) {
                // Clear interval
                clearInterval(progressInterval);

                // Check for specific error types
                if (error instanceof Error) {
                    // Check for size-related error messages
                    if (error.message.includes('too large') ||
                        error.message.includes('size exceeds') ||
                        error.message.includes('413') ||
                        error.message.includes('Request Entity Too Large')) {
                        throw new Error(`File is too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
                    }
                    throw error;
                }
                throw new Error('Failed to upload file');
            }
        } catch (error) {
            console.error('Error uploading to Blob storage:', error);
            setUrlError(error instanceof Error ? error.message : 'Failed to upload file');
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    // Upload URL content to Vercel Blob storage
    const uploadUrlToBlob = async (pdfUrl: string): Promise<string | null> => {
        try {
            setIsUploading(true);
            setUploadProgress(10); // Start progress

            // Set progress to mimic upload progress
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 500);

            try {
                // Validate URL format before proceeding
                try {
                    new URL(pdfUrl);
                } catch (e) {
                    throw new Error("Invalid URL. Please enter a valid URL or upload the PDF file.");
                }

                // Use our server-side proxy to fetch the PDF
                // This avoids CORS issues that occur with direct fetch
                const proxyUrl = `/api/papermap/proxy?url=${encodeURIComponent(pdfUrl)}`;

                const response = await fetch(proxyUrl);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Failed to fetch PDF: ${response.statusText}`);
                }

                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || "Failed to process PDF");
                }

                // OPTIMIZATION: Check if the proxy returned a direct URL (for Vercel Blob URLs)
                if (data.isVercelBlob && data.directUrl) {
                    // Clear interval and complete progress
                    clearInterval(progressInterval);
                    setUploadProgress(100);

                    // Return the direct URL
                    return data.directUrl;
                }

                // For regular URLs, continue with the normal process
                // Convert base64 data back to a Blob
                const binaryData = atob(data.base64Data);
                const bytes = new Uint8Array(binaryData.length);
                for (let i = 0; i < binaryData.length; i++) {
                    bytes[i] = binaryData.charCodeAt(i);
                }

                // Create a blob from the binary data
                const pdfBlob = new Blob([bytes.buffer], { type: 'application/pdf' });

                // Double-check size after downloading
                if (pdfBlob.size > MAX_FILE_SIZE_BYTES) {
                    throw new Error(`File is too large (${(pdfBlob.size / (1024 * 1024)).toFixed(2)} MB). Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
                }

                // Extract filename from the proxy response
                const fileName = data.fileName || 'document.pdf';

                // Use direct client upload
                const blob = await upload(fileName, pdfBlob, {
                    access: 'public',
                    handleUploadUrl: '/api/papermap/blob',
                });

                // Clear interval and complete progress
                clearInterval(progressInterval);
                setUploadProgress(100);

                return blob.url;
            } catch (error) {
                // Clear interval
                clearInterval(progressInterval);

                // Handle specific error types
                if (error instanceof Error) {
                    // Check for common error patterns
                    if (error.message.includes('too large') || error.message.includes('size exceeds')) {
                        throw new Error(`File is too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
                    } else if (error.message.includes('valid PDF')) {
                        throw new Error("The URL does not point to a valid PDF file. Please enter a valid URL or upload the PDF file.");
                    } else if (error.message.includes('Failed to fetch PDF')) {
                        throw new Error("Could not download the PDF. Please ensure the URL is accessible or upload the PDF file.");
                    } else if (error.message.includes('Invalid URL format')) {
                        throw new Error("Please enter a valid URL or upload the PDF file.");
                    }
                    throw error;
                }
                throw new Error('Failed to process URL. Try uploading the PDF file.');
            }
        } catch (error) {
            // Don't log common errors to avoid console clutter
            const isCommonError = error instanceof Error && (
                error.message.includes('too large') ||
                error.message.includes('size exceeds') ||
                error.message.includes('valid PDF') ||
                error.message.includes('Invalid URL format')
            );

            if (!isCommonError) {
                console.error('Error processing URL:', error);
            }

            // Set appropriate error message
            if (error instanceof Error) {
                setUrlError(error.message);
            } else {
                setUrlError(`Failed to process URL. Please try again or upload the PDF file.`);
            }
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (inputMode === 'file' && file) {
            // Upload file to Vercel Blob first
            const blobUrl = await uploadFileToBlob(file);

            if (blobUrl) {
                // Pass both the file and the blob URL to ensure it's properly stored
                onFileUpload(file, blobUrl);
            }
            return;
        }

        if (inputMode === 'url') {
            if (!url.trim()) {
                setUrlError("Please enter a URL or upload the PDF file.");
                return;
            }

            setUrlError(null);
            setUrlLoading(true);

            try {
                // Upload URL to Vercel Blob
                const blobUrl = await uploadUrlToBlob(url);

                if (!blobUrl) {
                    throw new Error(`Failed to process URL. Please check the URL and try again or upload the PDF file.`);
                }

                // Fetch from our blob URL to create a file object
                const response = await fetch(blobUrl);

                if (!response.ok) {
                    throw new Error("Failed to retrieve file from storage");
                }

                const blob = await response.blob();

                // Create a File object from the blob
                const fileName = url.split('/').pop() || 'document.pdf';
                const fileFromUrl = new File([blob], fileName, { type: 'application/pdf' });

                // Pass both the file and blob URL to the handler 
                onFileUpload(fileFromUrl, blobUrl);
            } catch (err) {
                // Use the specific error message when available
                let errorMessage = "Failed to process the URL. Please try again or upload the PDF file.";

                if (err instanceof Error) {
                    errorMessage = err.message;
                }

                setUrlError(errorMessage);

                // Only log if it's not a common error
                const isCommonError = errorMessage.includes('too large') ||
                    errorMessage.includes('size exceeds') ||
                    errorMessage.includes('valid PDF') ||
                    errorMessage.includes('Invalid URL format');

                if (!isCommonError) {
                    console.error('Error fetching PDF:', err);
                }
            } finally {
                setUrlLoading(false);
            }
            return;
        }

        if (inputMode === 'text') {
            if (!text.trim()) {
                setUrlError("Please enter some text.");
                return;
            }

            try {
                // Add a special flag to identify this as a text input request
                onFileUpload({ text: text.trim(), isTextInput: true });
            } catch (err) {
                let errorMessage = "Failed to process the text. Please try again.";

                if (err instanceof Error) {
                    errorMessage = err.message;
                }

                setUrlError(errorMessage);
                console.error('Error processing text:', err);
            }
            return;
        }

        setUrlError("Please provide input in the selected format.");
    };

    // Determine if the Create button should be disabled
    const isCreateButtonDisabled = loading ||
        urlLoading ||
        isUploading ||
        (inputMode === 'file' && !file) ||
        (inputMode === 'url' && !url.trim()) ||
        (inputMode === 'text' && !text.trim()) ||
        !!fileSizeError;

    // Convert File to the format expected by FilePreview
    const filePreviewData = file ? {
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file),
        uploaded: !isUploading
    } : null;

    return (
        <div className="w-full max-w-7xl px-4 py-2 rounded-lg">
            <div className="mb-4">

                {fileSizeError && (
                    <div className="text-destructive text-sm mb-0 p-3 bg-destructive/10 rounded-base flex items-start">
                        <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{fileSizeError}</span>
                    </div>
                )}

                <Form {...form}>
                    <form
                        onSubmit={handleSubmit}
                        onClick={() => setIsFocused(true)}
                        onBlur={(e) => {
                            // Only blur if clicking outside the form
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                setIsFocused(false);
                            }
                        }}
                        tabIndex={0} // Make the form focusable
                        data-focused={isFocused}
                        className={`relative flex flex-col backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-colors duration-200 max-w-2xl mx-auto w-full ${isFocused
                            ? 'border-[3px] border-ring shadow-[3px_3px_0px_0px_var(--ring)]'
                            : 'border-[2px] border-border shadow-[var(--shadow)]'
                            } bg-bw rounded-lg p-2 focus:outline-none`}
                    >
                        {inputMode === 'file' && (
                            <div
                                className={`bg-muted/50 rounded-base p-8 text-center mb-2 relative transition-all duration-200 ${file
                                    ? 'border-primary bg-primary/10'
                                    : isDragging
                                        ? 'border-2 border-primary bg-primary/5 border-dashed'
                                        : 'border-none border-border'
                                    }`}
                                onDrop={handleFileDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                            >
                                {file ? (
                                    <div className="text-primary">
                                        <Button
                                            variant="neutral"
                                            size="icon"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setFile(null);
                                                setFileSizeError(null);
                                            }}
                                            className="absolute top-2 right-2"
                                        >
                                            <X className="h-5 w-5" />
                                        </Button>
                                        <p className="font-medium text-sm break-words max-w-full px-6" style={{ wordBreak: 'break-all' }}>{file.name.replace(/_/g, '_\u200B')}</p>
                                        <p className="text-xs mt-1 text-muted-foreground">
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-muted-foreground text-sm hidden md:block">
                                            {isDragging ? "Drop PDF here" : "Drop PDF here"}
                                        </p>
                                        <Button
                                            type="button"
                                            variant="default"
                                            className="mt-2"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            Browse Files
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".pdf"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {inputMode === 'url' && (
                            <Input
                                type="text"
                                value={url}
                                onChange={handleUrlChange}
                                placeholder="https://example.com/paper.pdf"
                                className="w-full bg-transparent border-0 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none disabled:opacity-50 p-0 resize-none min-h-[100px] max-h-[120px] overflow-y-auto px-1 pb-1"
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                            />
                        )}

                        {inputMode === 'text' && (
                            <textarea
                                ref={textareaRef}
                                value={text}
                                onChange={handleTextChange}
                                placeholder="Ask a question or brainstorm an idea.."
                                className="w-full bg-transparent border-0 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none disabled:opacity-50 p-0 resize-none min-h-[100px] overflow-y-hidden p-1"
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                rows={1}
                            />
                        )}

                        {urlError && (
                            <div className="text-destructive text-sm mt-1 p-3 bg-destructive/10 rounded-base flex items-start">
                                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                                <span>{urlError}</span>
                            </div>
                        )}

                        {/* Upload progress bar */}
                        {isUploading && (
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 my-2">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                        )}

                        <div className="flex justify-between items-center gap-4 w-full">
                            <div className="flex items-center gap-2">
                                <Tabs defaultValue="file" onValueChange={handleInputModeChange} className="w-fit">
                                    <TabsList className="h-8 p-1 bg-muted/50 border border-muted-foreground border-2">
                                        <TabsTrigger 
                                            value="file" 
                                            className="px-2 py-0.5 h-6 text-xs text-muted-foreground data-[state=active]:bg-main data-[state=active]:text-foreground data-[state=active]:shadow-none"
                                        >
                                            File
                                        </TabsTrigger>
                                        <TabsTrigger 
                                            value="url" 
                                            className="px-2 py-0.5 h-6 text-xs text-muted-foreground data-[state=active]:bg-main data-[state=active]:text-foreground data-[state=active]:shadow-none"
                                        >
                                            URL
                                        </TabsTrigger>
                                        <TabsTrigger 
                                            value="text" 
                                            className="px-2 py-0.5 h-6 text-xs text-muted-foreground data-[state=active]:bg-main data-[state=active]:text-foreground data-[state=active]:shadow-none"
                                        >
                                            Text
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>

                                <Badge
                                    variant={isHovered ? "default" : "neutral"}
                                    className="cursor-pointer h-8 text-muted-foreground"
                                    onClick={onExampleClick}
                                    onMouseEnter={() => setIsHovered(true)}
                                    onMouseLeave={() => setIsHovered(false)}
                                >
                                    Example
                                </Badge>
                            </div>

                            <Button
                                type="submit"
                                className="shrink-0 p-2 transition-colors disabled:opacity-50 h-8 text-sm"
                                disabled={isCreateButtonDisabled}
                                aria-label="Create mindmap"
                            >
                                {loading || urlLoading || isUploading ? (
                                    <LoaderCircle className="size-4 animate-spin" />
                                ) : (
                                    <Waypoints className="size-4" />
                                )}
                                Create
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>

            {error && (
                <div className="text-destructive text-sm mt-4 p-3 bg-destructive/10 rounded-base">
                    {error.includes("[GoogleGenerativeAI Error]")
                        ? "AI service unavailable. Please try again later."
                        : error.includes("File is too large") || error.includes("too large") || error.includes("size exceeds")
                            ? `The AI cannot process this large file. Please upload a smaller PDF.`
                            : error.length > 60
                                ? `${error.substring(0, 60)}...`
                                : error
                    }
                </div>
            )}
        </div>
    );
};

export default InputForm;
