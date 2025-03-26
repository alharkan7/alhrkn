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

export async function POST(req: NextRequest) {
    try {
        // Get the request data
        const requestData = await req.json();
        const { sessionId, sessionData, pdfData, nodeContext, question } = requestData;
        
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
        
        // If no session data or recreation failed, fall back to one-time mode
        if (!chat && pdfData) {
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
            return new Response(JSON.stringify({ 
                error: 'No valid session data or PDF data provided',
                answer: "I couldn't access the document. Please reload the page and try again."
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        if (!nodeContext || !question) {
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

        // Send the message to the chat session
        let response;
        
        if (pdfData && !sessionData) {
            // If using one-time mode with no session, include PDF
            response = await chat.sendMessage([
                {
                    inlineData: {
                        mimeType: "application/pdf",
                        data: pdfData
                    }
                },
                userPrompt
            ]);
        } else {
            // For session-based approach, just send the prompt
            response = await chat.sendMessage(userPrompt);
        }

        // Get the updated chat history
        const updatedHistory = await chat.getHistory();
        
        // Create updated session data to return to client
        const updatedSessionData = sessionData ? {
            ...(typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData),
            history: updatedHistory,
            lastAccessed: Date.now()
        } : null;

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
            }
        } catch (jsonError) {
            console.error('Failed to parse response as JSON:', jsonError);
            // Fall back to using the raw text as the answer
            parsedResult = {
                answer: result
            };
        }

        // Add updated session data to response if available
        const finalResponse = {
            ...parsedResult,
            updatedSessionData: updatedSessionData ? JSON.stringify(updatedSessionData) : null
        };

        return new Response(JSON.stringify(finalResponse), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in API route:', error);
        return new Response(JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Internal server error',
            answer: "I'm sorry, I couldn't process this request. Please try again later."
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
