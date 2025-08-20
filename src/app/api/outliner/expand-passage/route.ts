import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

// Environment validation
const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!googleApiKey) {
  throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(googleApiKey);

// Schema for structured response
const structuredResponseSchema = {
  type: 'object',
  properties: {
    paragraphs: { type: 'array', items: { type: 'string' }, minItems: 1 },
  },
  required: ['paragraphs'],
  propertyOrdering: ['paragraphs']
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { text } = body || {};

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'Missing or invalid "text". Provide a paragraph or context string to expand.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use Gemini to generate structured output directly
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      generationConfig: {
        temperature: 0.6,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: structuredResponseSchema as any,
      },
    });

    const prompt = `You are an academic writing assistant. You are expanding text within a specific section of a research paper. Analyze the context and determine which academic section this belongs to (Background, Literature Review, Research Method, Analysis Technique, Impact, etc.).

Input text to expand:
"""
${text}
"""

Instructions:
- First, identify which academic section this text belongs to based on the context and content.
- Maintain the appropriate tone and style for that specific section:
  * Background: Establish context, explain the problem, provide foundational information
  * Literature Review: Analyze existing research, identify gaps, synthesize findings
  * Research Method: Describe procedures, explain methodology, justify choices
  * Analysis Technique: Explain analytical approaches, tools, and frameworks
  * Impact: Discuss implications, significance, and broader relevance
- Write 1-3 clear, informative paragraphs that expand on the input text.
- Use neutral, scholarly tone with clear topic sentences and cohesion.
- Ensure the expanded content flows naturally with the previous paragraphs provided in context.
- Return the result in the specified JSON schema with paragraphs array only.
- Do not include citations such as [1], [2,3], etc.`;

    const result = await model.generateContent(prompt);
    const jsonText = String(result?.response?.text?.() ?? '').trim();
    
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // Try to extract JSON if the response isn't clean
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    }

    if (!parsed || !Array.isArray(parsed?.paragraphs)) {
      return new Response(JSON.stringify({ error: 'Failed to generate structured output', raw: jsonText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        paragraphs: parsed.paragraphs,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in /api/outliner/expand-passage:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}


