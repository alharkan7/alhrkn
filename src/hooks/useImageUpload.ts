import { useState } from 'react';
import imageCompression from 'browser-image-compression';

export function useImageUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);

    const handleImageChange = (file: File | null) => {
        if (file) {
            // Create immediate preview using FileReader
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setLocalImageUrl(base64String);
            };
            reader.readAsDataURL(file);
            
            // Process image for sending
            handleImageProcessing(file);
        }
    };

    const handleImageProcessing = async (file: File) => {
        setIsUploading(true);
        try {
            // Compression options
            const options = {
                maxSizeMB: 1,             
                maxWidthOrHeight: 1920,    
                useWebWorker: true,        
                fileType: 'image/webp', 
                initialQuality: 0.8,       
                alwaysKeepResolution: true 
            }

            // Compress the image
            let compressedFile = await imageCompression(file, options);

            // If still too large, compress again with lower quality
            if (compressedFile.size > 1024 * 1024) {  
                options.initialQuality = 0.6;  
                compressedFile = await imageCompression(compressedFile, options);
            }

            // Convert to Base64
            const reader = new FileReader();
            reader.readAsDataURL(compressedFile);
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setImageBase64(base64String);
                setIsUploading(false);
            };
        } catch (error) {
            console.error('Error processing image:', error);
            setIsUploading(false);
        }
    };

    const clearImages = () => {
        if (localImageUrl) {
            // URL.revokeObjectURL(localImageUrl); // Not needed with FileReader
        }
        setLocalImageUrl(null);
        setImageBase64(null);
    };

    return {
        isUploading,
        localImageUrl,
        imageBase64,
        clearImages,
        handleImageChange,
    };
}