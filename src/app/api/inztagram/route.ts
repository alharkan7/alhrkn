import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 2048,
  },
});

const SYSTEM_PROMPT = `You are an expert in Mermaid.js diagrams. Given a diagram type and a natural language description, output ONLY the Mermaid.js diagram BODY (not the type declaration, not markdown, not explanations). Do not include code fences or any extra text.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { description, diagramType } = body;
    if (!description || !diagramType) {
      return new Response(JSON.stringify({ error: 'Missing description or diagramType' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Diagram type: ${diagramType}\nDescription: ${description}\n\nOutput ONLY the Mermaid.js diagram BODY (do not include the diagram type declaration, code fences, or any explanations).`;

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'user', parts: [{ text: prompt }] },
      ],
    });

    let code = result.response.text().trim();
    // Remove code fences and diagram type if present
    if (code.startsWith("```mermaid")) code = code.slice(9).trim();
    if (code.startsWith("```")) code = code.slice(3).trim();
    if (code.endsWith("```")) code = code.slice(0, -3).trim();
    if (code.toLowerCase().startsWith(diagramType.toLowerCase())) code = code.slice(diagramType.length).trim();

    return new Response(JSON.stringify({ code }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in /api/inztagram:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 