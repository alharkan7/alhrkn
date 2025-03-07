import { useState } from 'react';

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
        
        try {
            if (selectedFile.type.startsWith('image/')) {
                // Upload image to Vercel Blob
                const response = await fetch(`/api/blob?filename=${encodeURIComponent(selectedFile.name)}`, {
                    method: 'POST',
                    body: selectedFile
                });

                if (!response.ok) {
                    throw new Error('Failed to upload image');
                }

                const blob = await response.json();

                // Set file data with Blob URL
                setFile({
                    name: selectedFile.name,
                    type: selectedFile.type,
                    url: blob.url,
                    uploaded: true
                });
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

                setFile({
                    name: selectedFile.name,
                    type: selectedFile.type,
                    url: base64String,
                    uploaded: true
                });
            }
        } catch (error) {
            console.error('Error processing file:', error);
            setFile(null);
        } finally {
            setIsUploading(false);
        }
    };

    const clearFile = () => {
        setFile(null);
    };

    return {
        file,
        isUploading,
        handleFileSelect,
        clearFile
    };
}