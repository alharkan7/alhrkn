import { GoogleGenerativeAI, GenerationConfig, Schema, SchemaType } from '@google/generative-ai';
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
7. Structure your response in a JSON format as follows:
   {
     "answer": "Your detailed answer to the question"
   }
8. Provide a comprehensive answer that fully addresses the question.`;

// Define schema for structured output
const responseSchema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        answer: {
            type: SchemaType.STRING,
            description: "A detailed answer to the follow-up question"
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

export async function POST(req: NextRequest) {
    try {
        // Get the request data
        const requestData = await req.json();
        const { pdfData, nodeContext, question } = requestData;
        
        if (!pdfData || !nodeContext || !question) {
            return new Response(JSON.stringify({ error: 'Missing required data' }), {
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

        // Form the prompt to include the node context and the user's question
        const userPrompt = `
Node Title: ${nodeContext.title}
Node Description: ${nodeContext.description}

User Question: ${question}

Please provide a detailed answer to this question based on the content of the paper.`;

        // Send the message with the PDF data and the context/question
        const response = await chat.sendMessage([
            {
                inlineData: {
                    mimeType: "application/pdf",
                    data: pdfData
                }
            },
            userPrompt
        ]);

        // Get the structured response
        const result = await response.response.text();
        const parsedResult = JSON.parse(result);

        return new Response(JSON.stringify(parsedResult), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Internal server error',
            answer: "I'm sorry, I couldn't process this request. Please try again later."
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
