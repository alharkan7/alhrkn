import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
        temperature: 0.3, // Lower temperature for more focused predictions
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 100, // Limit tokens for quick predictions
    }
});

const SYSTEM_PROMPT = `You are an academic writing assistant. Given the context of previous sentences, predict the most likely next sentence that would naturally follow in an academic paper. The prediction should:
- Maintain the academic tone and style
- Be coherent with the previous context
- Be concise and clear
- Follow academic writing conventions
Provide only the predicted words, nothing else. Do not include the existing words or sentences.`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { context } = body;

        if (!context) {
            return new Response(JSON.stringify({ error: 'Context is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const chat = model.startChat({
            history: [],
            generationConfig: {
                temperature: 0.3,
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 100,
            }
        });

        // Send system prompt first
        await chat.sendMessage(SYSTEM_PROMPT);

        // Send the context and get prediction
        const response = await chat.sendMessage(
            `Previous context: "${context}"\nPredict the next sentence:`
        );

        const prediction = await response.response.text();

        return new Response(JSON.stringify({ prediction }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}