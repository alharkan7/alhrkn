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
    const { keywords, numIdeas, language = 'en' } = body || {};
    
    // Debug logging
    console.log('Stream API called with:', { keywords, numIdeas, language });

    if (!keywords || typeof keywords !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid "keywords"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ideasCount = Math.min(Math.max(Number(numIdeas) || 6, 1), 10);

    // Language-specific instructions
    const languageConfig = {
      en: {
        systemInstruction: 'You are an academic research assistant. Generate concise, high-quality research ideas with structured abstracts. Stream each idea as soon as it is ready.',
        userPrompt: `Task: Propose ${ideasCount} distinct research ideas based on the following keywords.
Keywords: ${keywords}

Output format: Newline-delimited JSON (NDJSON). Emit exactly one JSON object per line, with no leading or trailing commentary, and no enclosing array. For each idea, output an object with the following shape: {
  "title": string,
  "abstract": {
    "background": string,
    "literatureReview": string,
    "method": string,
    "analysisTechnique": string,
    "impact": string
  }
}

Constraints:
- Start output immediately; do not wait to finish planning.
- Do not include unescaped newline characters in values (use \\n if needed).
- Keep sections compact and concrete (2–4 sentences each).
- Avoid duplication across ideas.
- Do not include markdown, code fences, or any text other than NDJSON lines.`
      },
      id: {
        systemInstruction: 'Anda adalah asisten penelitian akademik. Buat ide penelitian yang ringkas dan berkualitas tinggi dengan abstrak yang terstruktur dalam Bahasa Indonesia. Streaming setiap ide segera setelah siap. PENTING: Semua output harus dalam Bahasa Indonesia.',
        userPrompt: `Tugas: Usulkan ${ideasCount} ide penelitian yang berbeda berdasarkan kata kunci berikut.
Kata kunci: ${keywords}

PENTING: Semua konten (judul, background, literature review, method, analysis technique, impact) HARUS dalam Bahasa Indonesia.

Format output: Newline-delimited JSON (NDJSON). Emitkan tepat satu objek JSON per baris, tanpa komentar awal atau akhir, dan tanpa array pembungkus. Untuk setiap ide, outputkan objek dengan bentuk berikut: {
  "title": string,
  "abstract": {
    "background": string,
    "literatureReview": string,
    "method": string,
    "analysisTechnique": string,
    "impact": string
  }
}

Kendala:
- Mulai output segera; jangan menunggu untuk menyelesaikan perencanaan.
- Jangan sertakan karakter newline yang tidak di-escape dalam nilai (gunakan \\n jika diperlukan).
- Jaga agar setiap bagian ringkas dan konkret (2–4 kalimat).
- Hindari duplikasi antar ide.
- Jangan sertakan markdown, code fences, atau teks lain selain baris NDJSON.
- SEMUA TEKS HARUS DALAM BAHASA INDONESIA.`
      }
    };

    const config = languageConfig[language as keyof typeof languageConfig] || languageConfig.en;

    const result = await model.generateContentStream({
      contents: [
        { role: 'user', parts: [{ text: config.systemInstruction }] },
        { role: 'user', parts: [{ text: config.userPrompt }] },
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

    // Basic validation - just ensure we have the expected structure
    const title = typeof obj.title === 'string' ? obj.title : '';
    const abstract = obj.abstract && typeof obj.abstract === 'object' ? obj.abstract : {};

    // More lenient validation - allow empty strings but ensure structure exists
    const background = typeof abstract.background === 'string' ? abstract.background : '';
    const literatureReview = typeof abstract.literatureReview === 'string' ? abstract.literatureReview : '';
    const method = typeof abstract.method === 'string' ? abstract.method : '';
    const analysisTechnique = typeof abstract.analysisTechnique === 'string' ? abstract.analysisTechnique : '';
    const impact = typeof abstract.impact === 'string' ? abstract.impact : '';

    // Only require that title exists - the rest can be empty strings
    if (!title.trim()) {
      return null;
    }

    const clean = {
      title: title.trim(),
      abstract: { background, literatureReview, method, analysisTechnique, impact },
    };
    return JSON.stringify(clean);
  } catch {
    return null;
  }
}


