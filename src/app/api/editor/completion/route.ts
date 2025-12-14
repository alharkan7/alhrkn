import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

const SYSTEM_PROMPT = `You are an intelligent writing assistant. Your task is to predict and complete the text based on the given context. Follow these guidelines:

1. You will receive paragraph(s) of text.
2. The last text is the current one being edited - focus on completing this one
3. Use the previous text or paragraph(s) to understand the context, style, and flow of the writing
4. Generate a natural continuation that flows seamlessly from the last text
5. Keep the completion in 2-5 sentences maximum
6. Maintain consistency with the text's:
   - Writing style and voice
   - Technical level and terminology
   - Formatting and structure
   - Overall narrative flow
7. If the text needs a citation, you need to provide the keywords for that completion. The keywords is a phrase used to search for academic citations (via OpenAlex API) to support the arguments or data in the text, so make sure the keywords or phrase is REALLY EFFECTIVE to find the best RELEVANT reference
8. For the completion, provide ONLY the completion text, with no initial text and no additional explanations or markers
9. Format your response as a JSON object with 'completion' and 'keywords' fields
10. DO NOT add a citation on your own, like (Author, Year). It will be added by other function`;

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
};

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
});

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
            generationConfig,
            history: []
        });

        const response = await chat.sendMessage(
            `Here is the text that needs completion:\n\n${context}\n\nProvide a natural completion for the last part in JSON format with 'completion' and 'keywords' fields.`
        );

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
