import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// Define constants
const MAX_FILE_SIZE_MB = 25; // Increased from 4MB to 25MB
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Check if BLOB token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN is not configured" },
        { status: 500 }
      );
    }

    // Get formData from request
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // Validate the file
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum file size is ${MAX_FILE_SIZE_MB} MB.` },
        { status: 400 }
      );
    }

    // Check file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Create a unique filename
    const uniqueId = nanoid();
    const fileName = `${uniqueId}-${file.name}`;

    // Upload to Vercel Blob
    const blob = await put(fileName, file, {
      access: 'public',
      // Set TTL to 1 days (604800 seconds)
      addRandomSuffix: false,
      contentType: file.type,
      cacheControlMaxAge: 60 * 60 * 24 * 1, // 1 days in seconds
    });

    // Return success response with blob URL and metadata
    return NextResponse.json({
      success: true,
      url: blob.url,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 604800000).toISOString(), // 7 days from now
    });
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// Define the maximum file size for this route
export const config = {
  api: {
    bodyParser: false,
  },
}; 