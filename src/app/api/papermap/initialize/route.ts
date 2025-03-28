import { GoogleGenerativeAI, GenerationConfig, Schema, SchemaType } from '@google/generative-ai';
import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

// Initialize with the general system prompt from ask/route.ts
const SYSTEM_PROMPT = `You are a leading expert in the field analyzing this research paper. A user is asking a follow-up question about a specific concept or finding in the paper. Answer the question directly and factually based on the paper's content. Follow these guidelines strictly:

1. Answer the question directly without referring to "the authors" or "the paper."
2. Base your answer only on information from the paper.
3. If the question cannot be answered based on the paper, say so directly.
4. Be specific and include relevant technical details, data, and numbers from the paper.
5. Explain complex concepts in a clear, concise manner.
6. DO NOT make up information not present in the paper.
7. Your response will be used directly in a markdown renderer, so use proper markdown formatting:
   - Use **bold** for key findings and important terms
   - Use *italics* for emphasis
   - Use bullet points for lists of related points
   - Use numbered lists for sequential information
   - Use \`code blocks\` for mathematical equations or formulas
   - Use > blockquotes for direct definitions or key statements
   - Include tables using markdown syntax where appropriate for comparing data
   - Use markdown headings sparingly and only when needed to organize very long answers`;

// Define schema for structured output - this ensures consistent formatting
const responseSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        confirmation: {
            type: SchemaType.STRING,
            description: "A confirmation that the PDF has been processed and is ready for questions"
        }
    },
    required: ["confirmation"]
};

// Basic generation config for initialization
const generationConfig: GenerationConfig = {
    temperature: 0.2,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 4096,
    responseMimeType: "application/json",
    responseSchema: responseSchema
};

// Helper function to fetch PDF data from a Blob URL
async function fetchPdfFromBlobUrl(blobUrl: string): Promise<string | null> {
    try {
        console.log('Fetching PDF from Blob URL for initialization:', blobUrl);
        
        // Special handling for the example PDF in the public directory
        if (blobUrl.includes('Steve_Jobs_Stanford_Commencement_Speech_2015.pdf')) {
            console.log('Detected local example PDF URL from public folder for initialization');
            
            // For the local PDF in the public folder, we need to use the absolute URL
            let finalPdfUrl = blobUrl;
            if (blobUrl.startsWith('/')) {
                // In production environment, use the full URL from VERCEL_URL env var
                // In development, use localhost:3000
                const baseUrl = process.env.VERCEL_URL 
                    ? `https://${process.env.VERCEL_URL}` 
                    : process.env.NODE_ENV === 'development' 
                        ? 'http://localhost:3000' 
                        : '';
                        
                finalPdfUrl = `${baseUrl}${blobUrl}`;
                console.log('Using absolute URL for local PDF in public folder for initialization:', finalPdfUrl);
            }
            
            try {
                // Set proper headers for fetch request
                const headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/pdf',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                };
                
                console.log('Attempting to fetch local PDF with absolute URL:', finalPdfUrl);
                const response = await fetch(finalPdfUrl, { 
                    headers,
                    cache: 'no-store'
                });
                
                if (!response.ok) {
                    console.error(`Failed to fetch local PDF for initialization: Status ${response.status}, ${response.statusText}`);
                    throw new Error(`Failed to fetch local PDF: ${response.status}`);
                }
                
                console.log('✅ Successfully fetched local PDF from public folder for initialization, status:', response.status);
                const arrayBuffer = await response.arrayBuffer();
                console.log('PDF data size:', arrayBuffer.byteLength, 'bytes');
                
                // Convert ArrayBuffer to base64 on the server using Buffer
                const buffer = Buffer.from(arrayBuffer);
                const base64Content = buffer.toString('base64');
                console.log('✅ Successfully converted PDF to base64 for initialization, length:', base64Content.length);
                return base64Content;
            } catch (error) {
                console.error('❌ Error fetching local PDF for initialization:', error);
                throw error; // Rethrow to be handled by the main try/catch
            }
        }
        
        // Handle external PDFs
        if (blobUrl.startsWith('http') && !blobUrl.includes(process.env.VERCEL_URL || 'localhost')) {
            console.log('Detected external PDF URL for initialization:', blobUrl);
            
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/pdf',
                'Accept-Language': 'en-US,en;q=0.9'
            };
            
            const response = await fetch(blobUrl, { headers });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch external PDF: ${response.status} ${response.statusText}`);
            }
            
            console.log('Successfully fetched external PDF for initialization, size:', response.headers.get('content-length'));
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Content = buffer.toString('base64');
            return base64Content;
        }
        
        // Normal case for standard URLs
        console.log('Fetching PDF from standard URL for initialization:', blobUrl);
        const response = await fetch(blobUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch PDF from URL for initialization: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Content = buffer.toString('base64');
        return base64Content;
    } catch (error) {
        console.error('Error fetching PDF from URL for initialization:', error);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        // Get the request data
        const requestData = await req.json();
        const { pdfData, blobUrl } = requestData;
        
        // Handle different cases for PDF data
        let pdfBase64 = pdfData;
        
        // If we don't have direct PDF data but have a blob URL, fetch the PDF
        if (!pdfBase64 && blobUrl) {
            console.log('No PDF data provided but Blob URL available, fetching PDF from Blob for initialization...');
            pdfBase64 = await fetchPdfFromBlobUrl(blobUrl);
            if (pdfBase64) {
                console.log('Successfully fetched PDF from Blob URL for initialization');
            }
        }
        
        if (!pdfBase64) {
            return new Response(JSON.stringify({ error: 'Missing PDF data and no valid Blob URL provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Create a model with the system instruction
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: SYSTEM_PROMPT,
        });
        
        // Start a chat session
        const chat = model.startChat({
            generationConfig,
            history: []
        });

        // Initialize the session with the PDF (using structured output)
        const initialResponse = await chat.sendMessage([
            {
                inlineData: {
                    mimeType: "application/pdf",
                    data: pdfBase64
                }
            },
            "Please confirm that you've processed this PDF and are ready to answer questions about it. Return your confirmation in the required format."
        ]);
        
        // Verify we got a valid response
        const responseText = await initialResponse.response.text();
        try {
            const parsedResponse = JSON.parse(responseText);
            console.log('Initialization confirmation:', parsedResponse.confirmation);
        } catch (e) {
            console.warn('Initialization response was not proper JSON:', responseText);
        }
        
        // Get the initial chat history after PDF submission
        const history = await chat.getHistory();

        // Generate a session ID
        const sessionId = randomUUID();
        
        // Create a session object to store in an encrypted cookie
        const sessionData = {
            id: sessionId,
            pdfInitialized: true,
            // Store history data to recreate the chat later
            history: history,
            model: "gemini-1.5-flash",
            systemPrompt: SYSTEM_PROMPT,
            generationConfig: {
                ...generationConfig,
                responseSchema: responseSchema
            },
            lastAccessed: Date.now()
        };
        
        // Return the sessionData to client - will be stored in localStorage
        console.log(`Initialized new session with ID: ${sessionId}`);

        return new Response(JSON.stringify({ 
            sessionId,
            sessionData: JSON.stringify(sessionData) 
        }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in initialize API:', error);
        return new Response(JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Internal server error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
} 