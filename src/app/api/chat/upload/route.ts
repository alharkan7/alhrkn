import { handleUpload } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
    const body = await request.json();

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async () => {
                // Validate user if needed
                return {
                    allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                    maximumSizeInBytes: 4 * 1024 * 1024, // 5MB
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                // Store metadata in your database here if needed
                console.log('Upload completed:', blob);
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        console.error('Error handling upload:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
} 