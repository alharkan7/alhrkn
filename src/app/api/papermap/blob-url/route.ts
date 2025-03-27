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

    // Get URL from request body
    const body = await request.json();
    const url = body.url;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: "Valid URL is required" },
        { status: 400 }
      );
    }

    // Only allow PDF URLs
    if (!url.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: "URL must point to a PDF file" },
        { status: 400 }
      );
    }

    try {
      // Fetch the PDF from the provided URL
      const response = await fetch(url);
      
      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch PDF from URL: ${response.statusText}` },
          { status: 400 }
        );
      }

      // Get the content-type and check if it's a PDF
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/pdf')) {
        return NextResponse.json(
          { error: "URL does not point to a valid PDF file" },
          { status: 400 }
        );
      }

      // Get file size from headers if available
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File is too large (${(parseInt(contentLength) / (1024 * 1024)).toFixed(2)} MB). Maximum file size is ${MAX_FILE_SIZE_MB} MB.` },
          { status: 400 }
        );
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Double-check size after downloading
      if (blob.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File is too large (${(blob.size / (1024 * 1024)).toFixed(2)} MB). Maximum file size is ${MAX_FILE_SIZE_MB} MB.` },
          { status: 400 }
        );
      }

      // Extract filename from URL or use a default
      const urlParts = url.split('/');
      const originalFilename = urlParts[urlParts.length - 1] || 'document.pdf';
      
      // Create a unique filename
      const uniqueId = nanoid();
      const fileName = `${uniqueId}-${originalFilename}`;

      // Upload to Vercel Blob
      const uploadedBlob = await put(fileName, blob, {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/pdf',
        cacheControlMaxAge: 60 * 60 * 24 * 1, // 1 days in seconds
      });

      // Return success response with blob URL and metadata
      return NextResponse.json({
        success: true,
        url: uploadedBlob.url,
        size: blob.size,
        uploadedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 604800000).toISOString(), // 7 days from now
        originalUrl: url,
      });
    } catch (fetchError) {
      console.error('Error fetching from URL:', fetchError);
      return NextResponse.json(
        { error: "Failed to fetch PDF from the provided URL" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in blob-url route:', error);
    return NextResponse.json(
      { error: "Failed to process URL" },
      { status: 500 }
    );
  }
} 