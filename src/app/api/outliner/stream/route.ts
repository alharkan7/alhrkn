import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
});

const ideaSchema = {
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
      'You are an academic research assistant. Generate concise, high-quality research ideas with structured abstracts. Stream each idea as soon as it is ready.';

    const userPrompt = `Task: Propose ${ideasCount} distinct research ideas based on the following keywords.\nKeywords: ${keywords}\n\nOutput format: Newline-delimited JSON (NDJSON). Emit exactly one JSON object per line, with no leading or trailing commentary, and no enclosing array. For each idea, output an object with the following shape: {\n  "title": string,\n  "abstract": {\n    "background": string,\n    "literatureReview": string,\n    "method": string,\n    "analysisTechnique": string,\n    "impact": string\n  }\n}\n\nConstraints:\n- Start output immediately; do not wait to finish planning.\n- Do not include unescaped newline characters in values (use \\n if needed).\n- Keep sections compact and concrete (2–4 sentences each).\n- Avoid duplication across ideas.\n- Do not include markdown, code fences, or any text other than NDJSON lines.`;

    const result = await model.generateContentStream({
      contents: [
        { role: 'user', parts: [{ text: systemInstruction }] },
        { role: 'user', parts: [{ text: userPrompt }] },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 2048,
        responseMimeType: 'text/plain',
      },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let buffer = '';
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            buffer += text;
            let idx: number;
            while ((idx = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 1);
              const trimmed = line.trim();
              if (!trimmed) continue;
              const safe = sanitizeIdeaLine(trimmed);
              if (safe) controller.enqueue(encoder.encode(safe + '\n'));
            }
          }
          const remaining = buffer.trim();
          if (remaining) {
            const safe = sanitizeIdeaLine(remaining);
            if (safe) controller.enqueue(encoder.encode(safe + '\n'));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Error in /api/outliner/stream:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function sanitizeIdeaLine(line: string): string | null {
  try {
    const obj = JSON.parse(line);
    if (!obj || typeof obj !== 'object') return null;

    const title = typeof obj.title === 'string' ? obj.title : '';
    const abstract = obj.abstract && typeof obj.abstract === 'object' ? obj.abstract : {};
    const background = typeof abstract.background === 'string' ? abstract.background : '';
    const literatureReview = typeof abstract.literatureReview === 'string' ? abstract.literatureReview : '';
    const method = typeof abstract.method === 'string' ? abstract.method : '';
    const analysisTechnique = typeof abstract.analysisTechnique === 'string' ? abstract.analysisTechnique : '';
    const impact = typeof abstract.impact === 'string' ? abstract.impact : '';

    if (!title || !background || !literatureReview || !method || !analysisTechnique || !impact) {
      return null;
    }

    const clean = {
      title,
      abstract: { background, literatureReview, method, analysisTechnique, impact },
    };
    return JSON.stringify(clean);
  } catch {
    return null;
  }
}


