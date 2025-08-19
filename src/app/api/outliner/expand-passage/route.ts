import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

// Environment validation
const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!googleApiKey) {
  throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const semanticScholarApiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(googleApiKey);

// Function declaration for Gemini tool calling
const functionDeclarations = [
  {
    name: 'search_semantic_scholar',
    description: 'Search Semantic Scholar for relevant academic papers and return concise metadata for citation purposes.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query describing the topic and key terms.' },
        limit: { type: 'integer', minimum: 1, maximum: 10, description: 'Max number of results (1-10).' }
      },
      required: ['query'],
    },
  },
];

// Helper: call Semantic Scholar
async function searchSemanticScholar(query: string, limit: number = 5) {
  const url = new URL('https://api.semanticscholar.org/graph/v1/paper/search');
  url.searchParams.set('query', query);
  url.searchParams.set('limit', String(Math.min(Math.max(limit || 5, 1), 10)));
  url.searchParams.set('fields', [
    'title',
    'year',
    'venue',
    'authors',
    'externalIds',
    'url',
    'tldr',
    'isOpenAccess',
    'publicationTypes',
    'citationCount',
  ].join(','));

  const res = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      ...(semanticScholarApiKey ? { 'x-api-key': semanticScholarApiKey } : {}),
      'User-Agent': 'alhrkn/expand-passage (https://alhrkn.vercel.app)'
    },
    // Be conservative with timeouts
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    // Return empty results on failure to allow the model to proceed without references
    return { results: [], rawStatus: res.status };
  }

  const data = await res.json().catch(() => ({}));
  const items = Array.isArray(data?.data || data?.results) ? (data.data || data.results) : [];

  const results = items
    .filter((p: any) => p && p.title && p.year)
    .map((p: any, idx: number) => {
      const doi = p.externalIds?.DOI || p.externalIds?.doi;
      const authors = Array.isArray(p.authors) ? p.authors.map((a: any) => a?.name).filter(Boolean) : [];
      const url = p.url || (doi ? `https://doi.org/${doi}` : undefined);
      return {
        id: idx + 1,
        title: p.title,
        authors,
        year: p.year,
        venue: p.venue,
        doi: doi || undefined,
        url,
        isOpenAccess: Boolean(p.isOpenAccess),
        publicationTypes: Array.isArray(p.publicationTypes) ? p.publicationTypes : undefined,
        citationCount: typeof p.citationCount === 'number' ? p.citationCount : undefined,
        tldr: typeof p.tldr?.text === 'string' ? p.tldr.text : undefined,
      };
    })
    .slice(0, Math.min(Math.max(limit || 5, 1), 10));

  return { results };
}

// Extract function calls from Gemini response
function extractFunctionCalls(response: any): Array<{ name: string; args: any }> {
  try {
    const first = response?.candidates?.[0];
    const parts = first?.content?.parts || [];
    const calls: Array<{ name: string; args: any }> = [];
    for (const part of parts) {
      if (part?.functionCall) {
        calls.push({
          name: part.functionCall.name,
          args: part.functionCall.args ?? {},
        });
      }
    }
    return calls;
  } catch {
    return [];
  }
}

// First-pass prompt (tool calling)
function buildFirstPassPrompt(inputText: string) {
  return `You are an academic writing assistant. Expand the following text into well-structured scientific paper style paragraphs (2–4 paragraphs) with accurate, properly formatted numeric citations like [1], [2].

Use the provided search function to retrieve up-to-date, relevant references from Semantic Scholar first. Select the most relevant 3–8 works. Base factual statements on these sources. Avoid hallucinations and do not fabricate references.

Input text to expand:\n"""\n${inputText}\n"""\n
Instructions:
- Plan key points and supporting evidence.
- Use neutral, scholarly tone with clear topic sentences and cohesion.
- Insert numeric citations [n] at the appropriate places.
- After the paragraphs, include a REFERENCES section listing each citation on a new line starting with [n] followed by authors (Last, F.), year, title, venue, and DOI/URL if available.
- Keep the total under ~600 words.`;
}

// Second-pass schema for strict structured JSON
const structuredResponseSchema = {
  type: 'object',
  properties: {
    paragraphs: { type: 'array', items: { type: 'string' }, minItems: 1 },
    citationsStyle: { type: 'string', enum: ['numeric-brackets'] },
    references: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          authors: { type: 'array', items: { type: 'string' } },
          year: { type: 'integer' },
          venue: { type: 'string' },
          doi: { type: 'string' },
          url: { type: 'string' },
          citationCount: { type: 'integer' },
          isOpenAccess: { type: 'boolean' },
        },
        required: ['id', 'title', 'authors', 'year'],
        propertyOrdering: ['id', 'title', 'authors', 'year', 'venue', 'doi', 'url', 'citationCount', 'isOpenAccess']
      },
      minItems: 0,
    },
    mappingNote: { type: 'string' },
  },
  required: ['paragraphs', 'citationsStyle', 'references'],
  propertyOrdering: ['paragraphs', 'citationsStyle', 'references', 'mappingNote']
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

    // 1) First pass: tool/function-calling to fetch references and draft content
    const modelWithTools = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools: [{ functionDeclarations } as any],
      generationConfig: {
        temperature: 0.6,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
      toolConfig: {
        functionCallingConfig: { mode: 'AUTO' as const },
      } as any,
    });

    const chat = (modelWithTools as any).startChat();

    let draft = await chat.sendMessage([{ text: buildFirstPassPrompt(text) }]);

    // Handle function calls (up to 2 rounds). Respond with ALL function responses in the same turn.
    for (let round = 0; round < 2; round++) {
      const calls = extractFunctionCalls(draft?.response);
      if (!calls.length) break;

      const responseParts: any[] = [];
      for (const { name, args } of calls) {
        if (name === 'search_semantic_scholar') {
          const query = typeof args?.query === 'string' ? args.query : text;
          const limit = typeof args?.limit === 'number' ? args.limit : 6;
          const results = await searchSemanticScholar(query, limit);
          responseParts.push({
            functionResponse: {
              name: 'search_semantic_scholar',
              response: results,
            },
          });
        }
      }

      if (responseParts.length) {
        draft = await chat.sendMessage(responseParts);
      } else {
        break;
      }
    }

    const draftText = String(draft?.response?.text?.() ?? '').trim();
    if (!draftText) {
      return new Response(JSON.stringify({ error: 'Failed to generate draft content' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2) Second pass: convert to strict structured JSON using response schema
    const formatterModel = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    const formattingSystem = `You are a careful information extraction system. Convert the given DRAFT with paragraphs and a REFERENCES list into strict JSON following the provided schema. Preserve paragraph content and numeric citation indices. Map each numeric citation [n] to the corresponding reference with id=n.

If the DRAFT lacks a REFERENCES section, infer references from context when possible, otherwise return an empty array. Keep authors as an array of strings in "Last, First" order when possible.`;

    const formattingPrompt = `SCHEMA:
Expect a JSON object with fields: paragraphs: string[], citationsStyle: "numeric-brackets", references: Array<{ id, title, authors[], year, venue?, doi?, url?, citationCount?, isOpenAccess? }>, mappingNote: string.

DRAFT START
${draftText}
DRAFT END`;

    const formatted = await (formatterModel as any).generateContent({
      contents: [
        { role: 'user', parts: [{ text: formattingSystem }] },
        { role: 'user', parts: [{ text: formattingPrompt }] },
      ],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
        responseSchema: structuredResponseSchema as any,
      },
    });

    let jsonText = String(formatted?.response?.text?.() ?? '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      const match = jsonText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    }

    if (!parsed || !Array.isArray(parsed?.paragraphs)) {
      return new Response(JSON.stringify({ error: 'Failed to format structured output', raw: jsonText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        paragraphs: parsed.paragraphs,
        citationsStyle: parsed.citationsStyle || 'numeric-brackets',
        references: parsed.references || [],
        mappingNote: parsed.mappingNote || undefined,
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


