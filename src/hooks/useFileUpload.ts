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
            // Convert file to base64
            const base64String = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    resolve(result);
                };
                reader.readAsDataURL(selectedFile);
            });

            // Set file data with base64 URL
            setFile({
                name: selectedFile.name,
                type: selectedFile.type,
                url: base64String,  // Store base64 string directly
                uploaded: true      // Mark as ready to use
            });
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