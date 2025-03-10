import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
        temperature: 0.7, // Slightly higher for more creative completions
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 200, // Allow longer completions for better context
    }
});

const SYSTEM_PROMPT = `You are an intelligent writing assistant. Your task is to predict and complete the text based on the given context. Follow these guidelines:

1. Analyze the writing style, tone, and context of the provided text
2. Generate a natural continuation that flows seamlessly from the existing text
3. Keep the completion concise (2-3 sentences maximum)
4. Maintain consistency with the original text's:
   - Writing style and voice
   - Technical level and terminology
   - Formatting and structure

Provide ONLY the completion text, with no additional explanations or markers.`;

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
                temperature: 0.7,
                topP: 0.9,
                topK: 40,
                maxOutputTokens: 200,
            }
        });

        // Send system prompt first
        await chat.sendMessage(SYSTEM_PROMPT);

        // Send the context and get completion
        const response = await chat.sendMessage(
            `Complete this text naturally:\n\n"${context}"\n\nCompletion:`
        );

        const completion = await response.response.text();

        // Clean up the completion (remove quotes if present)
        const cleanedCompletion = completion.replace(/^["']|["']$/g, '').trim();

        return new Response(JSON.stringify({ completion: cleanedCompletion }), {
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
