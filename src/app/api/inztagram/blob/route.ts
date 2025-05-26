import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename') || (file ? file.name : undefined);

        if (!file || !filename) {
            return NextResponse.json({ error: 'Missing file or filename' }, { status: 400 });
        }

        const blob = await put(filename, file, {
            access: 'public',
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // Expire after 12 hours
            addRandomSuffix: true,
        } as any);

        return NextResponse.json(blob);
    } catch (error) {
        console.error('Error uploading to blob:', error);
        return NextResponse.json({ error: 'Failed to upload to Blob' }, { status: 500 });
    }
} 