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

export async function POST(req: NextRequest) {
    try {
        // Get the request data
        const requestData = await req.json();
        const { pdfData } = requestData;
        
        if (!pdfData) {
            return new Response(JSON.stringify({ error: 'Missing PDF data' }), {
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
                    data: pdfData
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