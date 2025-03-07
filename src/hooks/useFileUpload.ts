import { useState } from 'react';
import { put } from '@vercel/blob';

interface FileData {
    name: string;
    type: string;
    url: string;
    uploaded?: boolean;
}

export function useFileUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [file, setFile] = useState<FileData | null>(null);

    const handleFileSelect = async (selectedFile: File) => {
        setIsUploading(true);
        
        // Show preview immediately with loading state
        const previewUrl = URL.createObjectURL(selectedFile);
        setFile({
            name: selectedFile.name,
            type: selectedFile.type,
            url: previewUrl,
            uploaded: false
        });
        
        try {
            if (selectedFile.type.startsWith('image/')) {
                // Upload image to Vercel Blob
                const blob = await put(selectedFile.name, selectedFile, {
                    access: 'public',
                    token: process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN
                });

                // Clean up the preview URL
                URL.revokeObjectURL(previewUrl);

                // Auto-send when upload is complete
                setFile(prev => prev ? {
                    ...prev,
                    url: blob.url,
                    uploaded: true
                } : null);
            } else {
                // For non-image files, continue using base64
                const base64String = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        resolve(result);
                    };
                    reader.readAsDataURL(selectedFile);
                });

                // Clean up the preview URL
                URL.revokeObjectURL(previewUrl);

                setFile(prev => prev ? {
                    ...prev,
                    url: base64String,
                    uploaded: true
                } : null);
            }
        } catch (error) {
            console.error('Error processing file:', error);
            URL.revokeObjectURL(previewUrl);
            setFile(null);
        } finally {
            setIsUploading(false);
        }
    };

    const clearFile = () => {
        if (file?.url && !file.url.startsWith('data:')) {
            URL.revokeObjectURL(file.url);
        }
        setFile(null);
        setIsUploading(false);
    };

    return {
        file,
        isUploading,
        handleFileSelect,
        clearFile
    };
}