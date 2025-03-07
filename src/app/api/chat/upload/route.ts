import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        const blob = await put(file.name, file, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN // Use server-side env variable
        });

        return NextResponse.json(blob);
    } catch (error) {
        console.error('Error uploading to blob:', error);
        return NextResponse.json(
            { error: 'Upload failed' },
            { status: 500 }
        );
    }
} 