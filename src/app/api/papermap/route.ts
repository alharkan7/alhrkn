import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

const SYSTEM_PROMPT = `You are a scientific paper analyzer. Your task is to create a hierarchical mindmap structure from the paper content. Follow these guidelines:

1. Create a JSON structure representing a mindmap with the following format:
   {
     "nodes": [
       {
         "id": string,
         "title": string (keyword/concept),
         "description": string (2-3 sentences explaining the concept),
         "parentId": string | null,
         "level": number
       }
     ]
   }
2. The root node should be the main topic/title of the paper
3. Break down the paper into major sections (methods, results, etc.)
4. For each section, identify key concepts and their relationships
5. Keep descriptions concise but informative
6. Ensure proper hierarchical relationships between nodes
7. Maximum 3 levels of depth for better visualization`;

const generationConfig = {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
};

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
});

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return new Response(JSON.stringify({ error: 'PDF file is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const fileData = await file.arrayBuffer();
        
        const chat = model.startChat({
            generationConfig,
            history: []
        });

        const response = await chat.sendMessage([
            {
                inlineData: {
                    mimeType: "application/pdf",
                    data: Buffer.from(fileData).toString('base64')
                }
            },
            "Analyze this scientific paper and create a mindmap structure. Provide the result in JSON format as specified."
        ]);

        const result = await response.response.text();
        const cleanedResult = result.replace(/^```json\n|\n```$/g, '').trim();
        const parsedResult = JSON.parse(cleanedResult);

        return new Response(JSON.stringify(parsedResult), {
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