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
    const { text, language = 'en' } = body || {};
    const shouldStream = (req.headers.get('x-stream') || '').toLowerCase() === '1';

    console.log('Expand-passage API called with language:', language);

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'Missing or invalid "text". Provide a paragraph or context string to expand.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate language parameter
    if (language !== 'en' && language !== 'id') {
      return new Response(JSON.stringify({ error: 'Invalid language parameter. Must be "en" or "id".' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If streaming is requested, stream raw plaintext paragraphs as they are generated
    if (shouldStream) {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-lite',
        generationConfig: {
          temperature: 0.6,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
          responseMimeType: 'text/plain',
        },
      });

      const prompt = language === 'id' 
        ? `Anda adalah asisten penulisan akademik. Anda sedang memperluas teks dalam bagian tertentu dari makalah penelitian. Analisis konteks dan tentukan bagian akademik mana yang termasuk (Latar Belakang, Tinjauan Literatur, Metode Penelitian, Teknik Analisis, Dampak, dll.).\n\nTeks input untuk diperluas:\n"""\n${text}\n"""\n\nInstruksi:\n- Pertama, identifikasi bagian akademik mana yang termasuk dalam teks ini berdasarkan konteks dan konten.\n- Pertahankan nada dan gaya yang sesuai untuk bagian tersebut:\n  * Latar Belakang: Menetapkan konteks, menjelaskan masalah, memberikan informasi dasar\n  * Tinjauan Literatur: Menganalisis penelitian yang ada, mengidentifikasi kesenjangan, mensintesis temuan\n  * Metode Penelitian: Menjelaskan prosedur, menjelaskan metodologi, membenarkan pilihan\n  * Teknik Analisis: Menjelaskan pendekatan analitis, alat, dan kerangka kerja\n  * Dampak: Membahas implikasi, signifikansi, dan relevansi yang lebih luas\n- Tulis 1-2 paragraf yang jelas dan informatif yang memperluas teks input.\n- Gunakan nada netral dan ilmiah dengan kalimat topik yang jelas dan kohesi.\n- Pastikan konten yang diperluas mengalir secara alami dengan paragraf sebelumnya yang disediakan dalam konteks.\n- Output teks biasa saja. Pisahkan paragraf dengan baris kosong.\n- Jangan sertakan kutipan seperti [1], [2,3], dll.`
        : `You are an academic writing assistant. You are expanding text within a specific section of a research paper. Analyze the context and determine which academic section this belongs to (Background, Literature Review, Research Method, Analysis Technique, Impact, etc.).\n\nInput text to expand:\n"""\n${text}\n"""\n\nInstructions:\n- First, identify which academic section this text belongs to based on the context and content.\n- Maintain the appropriate tone and style for that specific section:\n  * Background: Establish context, explain the problem, provide foundational information\n  * Literature Review: Analyze existing research, identify gaps, synthesize findings\n  * Research Method: Describe procedures, explain methodology, justify choices\n  * Analysis Technique: Explain analytical approaches, tools, and frameworks\n  * Impact: Discuss implications, significance, and broader relevance\n- Write 1-2 clear, informative paragraphs that expand on the input text.\n- Use neutral, scholarly tone with clear topic sentences and cohesion.\n- Ensure the expanded content flows naturally with the previous paragraphs provided in context.\n- Output plain text only. Separate paragraphs with a blank line.\n- Do not include citations such as [1], [2,3], etc.`;

      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            const result = await model.generateContentStream(prompt);
            for await (const chunk of result.stream) {
              const piece = String(chunk?.text?.() ?? '');
              if (piece) controller.enqueue(encoder.encode(piece));
            }
            controller.close();
          } catch (e: any) {
            try { controller.enqueue(encoder.encode(`\n[STREAM_ERROR]: ${e?.message || 'failed'}\n`)); } catch {}
            controller.close();
          }
        }
      });

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no'
        }
      });
    }

    // Non-streaming: Use Gemini to generate structured JSON with paragraphs
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

    const prompt = language === 'id'
      ? `Anda adalah asisten penulisan akademik. Anda sedang memperluas teks dalam bagian tertentu dari makalah penelitian. Analisis konteks dan tentukan bagian akademik mana yang termasuk (Latar Belakang, Tinjauan Literatur, Metode Penelitian, Teknik Analisis, Dampak, dll.).\n\nTeks input untuk diperluas:\n"""\n${text}\n"""\n\nInstruksi:\n- Pertama, identifikasi bagian akademik mana yang termasuk dalam teks ini berdasarkan konteks dan konten.\n- Pertahankan nada dan gaya yang sesuai untuk bagian tersebut:\n  * Latar Belakang: Menetapkan konteks, menjelaskan masalah, memberikan informasi dasar\n  * Tinjauan Literatur: Menganalisis penelitian yang ada, mengidentifikasi kesenjangan, mensintesis temuan\n  * Metode Penelitian: Menjelaskan prosedur, menjelaskan metodologi, membenarkan pilihan\n  * Teknik Analisis: Menjelaskan pendekatan analitis, alat, dan kerangka kerja\n  * Dampak: Membahas implikasi, signifikansi, dan relevansi yang lebih luas\n- Tulis 1-3 paragraf yang jelas dan informatif yang memperluas teks input.\n- Gunakan nada netral dan ilmiah dengan kalimat topik yang jelas dan kohesi.\n- Pastikan konten yang diperluas mengalir secara alami dengan paragraf sebelumnya yang disediakan dalam konteks.\n- Kembalikan hasil dalam skema JSON yang ditentukan dengan array paragraf saja.\n- Jangan sertakan kutipan seperti [1], [2,3], dll.`
      : `You are an academic writing assistant. You are expanding text within a specific section of a research paper. Analyze the context and determine which academic section this belongs to (Background, Literature Review, Research Method, Analysis Technique, Impact, etc.).\n\nInput text to expand:\n"""\n${text}\n"""\n\nInstructions:\n- First, identify which academic section this text belongs to based on the context and content.\n- Maintain the appropriate tone and style for that specific section:\n  * Background: Establish context, explain the problem, provide foundational information\n  * Literature Review: Analyze existing research, identify gaps, synthesize findings\n  * Research Method: Describe procedures, explain methodology, justify choices\n  * Analysis Technique: Explain analytical approaches, tools, and frameworks\n  * Impact: Discuss implications, significance, and broader relevance\n- Write 1-3 clear, informative paragraphs that expand on the input text.\n- Use neutral, scholarly tone with clear topic sentences and cohesion.\n- Ensure the expanded content flows naturally with the previous paragraphs provided in context.\n- Return the result in the specified JSON schema with paragraphs array only.\n- Do not include citations such as [1], [2,3], etc.`;

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


