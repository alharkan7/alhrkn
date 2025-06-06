import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
        return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
    }

    try {
        if (!request.body) {
            throw new Error('Missing request body');
        }
        
        const blob = await put(filename, new Blob([await request.arrayBuffer()]), {
            access: 'public',
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // Expire after 12 hours
        } as any);

        return NextResponse.json(blob);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to upload to Blob' }, { status: 500 });
    }
} 