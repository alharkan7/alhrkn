import { GoogleGenerativeAI, GenerationConfig, Schema, SchemaType, GenerativeModel, ChatSession } from '@google/generative-ai';
import { NextRequest } from 'next/server';

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

// System prompt specifically for answering follow-up questions about a node
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

// Define schema for structured output
const responseSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        answer: {
            type: SchemaType.STRING,
            description: "A detailed answer to the follow-up question formatted in markdown. This will be rendered directly without further processing."
        }
    },
    required: ["answer"]
};

const generationConfig: GenerationConfig = {
    temperature: 0.2,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 4096,
    responseMimeType: "application/json",
    responseSchema: responseSchema
};

// Helper function to recreate a chat session from stored data
async function recreateChatSession(sessionData: any): Promise<ChatSession | null> {
    try {
        if (!sessionData || !sessionData.history || !sessionData.model) {
            return null;
        }

        const model = genAI.getGenerativeModel({
            model: sessionData.model || "gemini-1.5-flash",
            systemInstruction: sessionData.systemPrompt || SYSTEM_PROMPT,
        });
        
        const chat = model.startChat({
            generationConfig: {
                ...sessionData.generationConfig,
                responseMimeType: "application/json",
                responseSchema: responseSchema
            },
            history: sessionData.history || []
        });
        
        return chat;
    } catch (error) {
        console.error('Error recreating chat session:', error);
        return null;
    }
}

// Helper function to fetch PDF data from a Blob URL
async function fetchPdfFromBlobUrl(blobUrl: string): Promise<string | null> {
    try {
        console.log('Fetching PDF from Blob URL:', blobUrl);
        
        // Special handling for the example PDF in the public directory
        if (blobUrl.includes('Steve_Jobs_Stanford_Commencement_Speech_2015.pdf')) {
            console.log('Detected local example PDF URL from public folder');
            
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
                console.log('Using absolute URL for local PDF in public folder:', finalPdfUrl);
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
                    console.error(`Failed to fetch local PDF: Status ${response.status}, ${response.statusText}`);
                    throw new Error(`Failed to fetch local PDF: ${response.status}`);
                }
                
                console.log('✅ Successfully fetched local PDF from public folder, status:', response.status);
                const arrayBuffer = await response.arrayBuffer();
                console.log('PDF data size:', arrayBuffer.byteLength, 'bytes');
                
                // Convert ArrayBuffer to base64 on the server using Buffer
                const buffer = Buffer.from(arrayBuffer);
                const base64Content = buffer.toString('base64');
                console.log('✅ Successfully converted PDF to base64, length:', base64Content.length);
                return base64Content;
            } catch (error) {
                console.error('❌ Error fetching local PDF:', error);
                throw error; // Rethrow to be handled by the main try/catch
            }
        }
        
        // Handle external URLs similarly using Buffer instead of FileReader
        if (blobUrl.startsWith('http') && !blobUrl.includes(process.env.VERCEL_URL || 'localhost')) {
            console.log('Detected external PDF URL:', blobUrl);
            
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/pdf',
                'Accept-Language': 'en-US,en;q=0.9'
            };
            
            const response = await fetch(blobUrl, { headers });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch external PDF: ${response.status} ${response.statusText}`);
            }
            
            console.log('Successfully fetched external PDF, size:', response.headers.get('content-length'));
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Content = buffer.toString('base64');
            return base64Content;
        }
        
        // Normal case for standard URLs
        console.log('Fetching PDF from standard URL:', blobUrl);
        const response = await fetch(blobUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch PDF from URL: ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Content = buffer.toString('base64');
        return base64Content;
    } catch (error) {
        console.error('Error fetching PDF from URL:', error);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        // Get the request data
        const requestData = await req.json();
        const { sessionId, sessionData, pdfData, blobUrl, nodeContext, question } = requestData;
        
        console.log('API received follow-up question request with:', { 
            hasSessionId: !!sessionId,
            hasSessionData: !!sessionData,
            hasPdfData: !!pdfData,
            hasBlobUrl: !!blobUrl,
            blobUrlPreview: blobUrl ? `${blobUrl.substring(0, 50)}...` : 'none',
            hasNodeContext: !!nodeContext,
            questionLength: question ? question.length : 0
        });

        // Try to recreate chat from session data if provided
        let chat = null;
        
        if (sessionData) {
            let parsedSessionData;
            try {
                // Parse session data if it's a string
                parsedSessionData = typeof sessionData === 'string' 
                    ? JSON.parse(sessionData) 
                    : sessionData;
                
                chat = await recreateChatSession(parsedSessionData);
                if (chat) {
                    console.log(`Recreated chat session from provided data: ${parsedSessionData.id}`);
                }
            } catch (parseError) {
                console.error('Failed to parse session data:', parseError);
            }
        }
        
        // Handle different cases for PDF data
        let pdfBase64 = pdfData;
        
        // If we don't have direct PDF data but have a blob URL, fetch the PDF
        if (!pdfBase64 && blobUrl) {
            console.log('No PDF data provided but Blob URL available, fetching PDF from Blob...');
            try {
                pdfBase64 = await fetchPdfFromBlobUrl(blobUrl);
                if (pdfBase64) {
                    console.log('✅ Successfully fetched PDF from Blob URL, base64 length:', pdfBase64.length);
                } else {
                    console.error('❌ Failed to fetch PDF from Blob URL - null result returned');
                }
            } catch (fetchError) {
                console.error('❌ Error fetching PDF from Blob URL:', fetchError);
            }
        }
        
        // If no session data or recreation failed, fall back to one-time mode with PDF data
        if (!chat && pdfBase64) {
            console.log('No valid session data, falling back to one-time PDF processing');
            
            // Create a model with the system instruction
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                systemInstruction: SYSTEM_PROMPT,
            });
            
            // Start a new chat session
            chat = model.startChat({
                generationConfig,
                history: []
            });
        }
        
        if (!chat) {
            console.error('❌ No valid chat session could be created - missing both session data and PDF data');
            return new Response(JSON.stringify({ 
                error: 'No valid session data or PDF data provided',
                answer: "I couldn't access the document. Please reload the page and try again."
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        if (!nodeContext || !question) {
            console.error('❌ Missing required data: nodeContext or question');
            return new Response(JSON.stringify({ 
                error: 'Missing node context or question',
                answer: "The question is missing required information. Please try again."
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Form the prompt to include the node context and the user's question
        const userPrompt = `
Node Title: ${nodeContext.title}
Node Description: ${nodeContext.description}

User Question: ${question}

Please provide a detailed answer to this question based on the content of the paper.`;

        console.log('Sending prompt to Gemini with prompt length:', userPrompt.length);
        
        // Send the message to the chat session
        let response;
        
        // Check if this is a new chat without history - if so, we need to include the PDF
        // regardless of whether we're using session data or not
        const hasHistory = await chat.getHistory().then(history => history.length > 1);
        console.log(`Chat ${hasHistory ? 'has existing history' : 'is NEW with no history'}`);
        
        if (!hasHistory && pdfBase64) {
            // For a new chat with no history, ALWAYS include the PDF inline
            console.log('Using one-time mode with PDF data (new chat), PDF base64 length:', pdfBase64.length);
            try {
                response = await chat.sendMessage([
                    {
                        inlineData: {
                            mimeType: "application/pdf",
                            data: pdfBase64
                        }
                    },
                    userPrompt
                ]);
                console.log('✅ Received response from Gemini with PDF context included');
            } catch (aiError) {
                console.error('❌ Error from Gemini API when sending with PDF context:', aiError);
                throw aiError;
            }
        } else {
            // For an existing chat with history, just send the prompt (PDF context already exists)
            console.log('Using session-based approach with existing chat history');
            try {
                response = await chat.sendMessage(userPrompt);
                console.log('✅ Received response from Gemini in session mode');
            } catch (aiError) {
                console.error('❌ Error from Gemini API in session mode:', aiError);
                throw aiError;
            }
        }

        // Get the updated chat history
        const updatedHistory = await chat.getHistory();
        
        // Create updated session data to return to client
        // Always create updated session data, whether we had session data initially or not
        const updatedSessionData = {
            id: sessionId || `session-${Date.now()}`,
            history: updatedHistory,
            model: "gemini-1.5-flash",
            systemPrompt: SYSTEM_PROMPT,
            generationConfig: {
                ...generationConfig,
                responseSchema: responseSchema
            },
            pdfInitialized: true,
            lastAccessed: Date.now()
        };
        
        console.log(`Sending updated session data to client, history length: ${updatedHistory.length}`);

        // Get the response - should be properly structured due to schema
        const result = await response.response.text();
        let parsedResult;
        
        try {
            // Parse the response - should be a JSON object with answer field
            parsedResult = JSON.parse(result);
            
            // Double check that we have the expected structure
            if (!parsedResult.answer) {
                console.warn('Response missing answer field:', result);
                parsedResult = { answer: "Sorry, I couldn't generate a proper response. Please try again." };
            } else {
                console.log('✅ Successfully parsed JSON response with answer field, answer length:', parsedResult.answer.length);
            }
        } catch (jsonError) {
            console.error('Failed to parse response as JSON:', jsonError);
            // Fall back to using the raw text as the answer
            parsedResult = {
                answer: result
            };
        }

        // Add updated session data to response
        const finalResponse = {
            ...parsedResult,
            updatedSessionData: JSON.stringify(updatedSessionData),
            sessionId: updatedSessionData.id
        };

        return new Response(JSON.stringify(finalResponse), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('❌ Error in API route:', error);
        return new Response(JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Internal server error',
            answer: "I'm sorry, I couldn't process this request. Please try again later."
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
