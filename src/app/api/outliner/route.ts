import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
  generationConfig: {
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 2048,
  },
});

const responseSchema = {
  type: 'object',
  properties: {
    ideas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          abstract: {
            type: 'object',
            properties: {
              background: { type: 'string' },
              literatureReview: { type: 'string' },
              method: { type: 'string' },
              analysisTechnique: { type: 'string' },
              impact: { type: 'string' }
            },
            required: ['background', 'literatureReview', 'method', 'analysisTechnique', 'impact'],
            propertyOrdering: ['background', 'literatureReview', 'method', 'analysisTechnique', 'impact']
          }
        },
        required: ['title', 'abstract'],
        propertyOrdering: ['title', 'abstract']
      },
      minItems: 1,
      maxItems: 10
    }
  },
  required: ['ideas'],
  propertyOrdering: ['ideas']
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keywords, numIdeas } = body || {};

    if (!keywords || typeof keywords !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid "keywords"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ideasCount = Math.min(Math.max(Number(numIdeas) || 6, 1), 10);

    const systemInstruction =
      'You are an academic research assistant. Generate concise, high-quality research ideas with structured abstracts.';

    const userPrompt = `Task: Propose ${ideasCount} distinct research ideas based on the following keywords.
Keywords: ${keywords}

For each idea, produce a title and a general abstract broken into:
- research background
- literature review
- research method
- analysis technique
- impact

Keep sections compact and concrete (2–4 sentences each). Avoid duplication across ideas.`;

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: systemInstruction }] },
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: responseSchema as any
      }
    });

    const responseText = result.response.text().trim();

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        return new Response(JSON.stringify({ error: 'Failed to parse model response as JSON', raw: responseText }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (!parsed?.ideas || !Array.isArray(parsed.ideas)) {
      return new Response(JSON.stringify({ error: 'Model response missing ideas array', raw: parsed }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in /api/outliner:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}


