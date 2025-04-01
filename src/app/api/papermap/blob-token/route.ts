import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

// Define constants
const MAX_FILE_SIZE_MB = 25; // Same 25MB limit as before
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

    const body = await request.json() as HandleUploadBody;
    
    try {
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname) => {
          // Generate a client token for the browser to upload the file
          return {
            allowedContentTypes: ['application/pdf'],
            maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
            tokenPayload: JSON.stringify({
              timestamp: Date.now(),
            }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          // This won't work on localhost, but will work in production
          console.log('PDF upload completed:', blob.url);
        },
      });

      return NextResponse.json(jsonResponse);
    } catch (error) {
      console.error('Error handling upload:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Upload failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in blob token route:', error);
    return NextResponse.json(
      { error: "Failed to process upload request" },
      { status: 500 }
    );
  }
} 