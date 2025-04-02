import { NextRequest, NextResponse } from 'next/server';

// Define constants
const MAX_FILE_SIZE_MB = 25; // Same limit as in Sidebar.tsx
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Server-side proxy for fetching PDFs to avoid CORS issues
 * This endpoint fetches the PDF on the server and returns it to the client
 */
export async function GET(request: NextRequest) {
  try {
    // Get URL from query parameters
    const url = request.nextUrl.searchParams.get('url');
    
    // Validate URL
    if (!url) {
      return NextResponse.json(
        { error: "Missing PDF URL parameter" },
        { status: 400 }
      );
    }

    // Attempt to perform basic URL validation
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    console.log(`Proxy fetching PDF from: ${url}`);

    // Fetch the PDF
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
      },
      // Use Node.js native fetch - no CORS issues on server
    });

    // Check for successful response
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // Verify content type is PDF
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/pdf')) {
      return NextResponse.json(
        { error: "URL does not point to a valid PDF file" },
        { status: 400 }
      );
    }

    // Check file size
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File is too large (${(parseInt(contentLength) / (1024 * 1024)).toFixed(2)} MB). Maximum file size is ${MAX_FILE_SIZE_MB} MB.` },
        { status: 413 }
      );
    }

    // Get the binary PDF data
    const pdfBuffer = await response.arrayBuffer();
    
    // Check actual size after download
    if (pdfBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File is too large (${(pdfBuffer.byteLength / (1024 * 1024)).toFixed(2)} MB). Maximum file size is ${MAX_FILE_SIZE_MB} MB.` },
        { status: 413 }
      );
    }

    // Return content as JSON with base64 data
    return NextResponse.json({
      success: true,
      contentType: contentType || 'application/pdf',
      fileName: extractFileName(url),
      size: pdfBuffer.byteLength,
      base64Data: Buffer.from(pdfBuffer).toString('base64')
    });

  } catch (error) {
    console.error('Error in PDF proxy:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to proxy PDF request" },
      { status: 500 }
    );
  }
}

/**
 * Extract a sensible filename from a URL
 */
function extractFileName(url: string): string {
  try {
    // Try to get filename from URL path
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    let fileName = pathParts[pathParts.length - 1];
    
    // If we found a filename
    if (fileName && fileName.trim() !== '') {
      // If it doesn't end with .pdf, add the extension
      if (!fileName.toLowerCase().endsWith('.pdf')) {
        fileName += '.pdf';
      }
      return fileName;
    }
    
    // Fallback to a default name with the domain
    return `document-from-${urlObj.hostname}.pdf`;
  } catch (e) {
    // If URL parsing fails, use a generic name
    return 'document.pdf';
  }
} 