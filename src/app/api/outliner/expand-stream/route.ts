import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idea, language = 'en' } = body || {};
    
    console.log('Expand Stream API called with:', { title: idea?.title, language });

    if (!idea || typeof idea !== 'object') {
      return new Response(JSON.stringify({ error: 'Missing or invalid "idea" object' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Language-specific instructions
    const languageConfig = {
      en: {
        systemInstruction: `You are an expert academic research consultant specializing in creating comprehensive, publication-ready research outlines and proposals. Your task is to expand a brief research idea into a detailed, structured research outline that can be rendered in a rich text editor.

IMPORTANT: Output ONLY valid JSON that follows the exact structure specified. Do not include any explanatory text, markdown, or other formatting outside the JSON.

STREAMING INSTRUCTIONS: Since this is a streaming response, you must generate the JSON structure progressively. Start with the opening brace and "blocks" array, then generate each block sequentially. Each block should be complete and valid JSON when emitted.`,
        userPrompt: `Task: Expand the following brief research idea into a comprehensive, detailed research outline.

Input Research Idea:
Title: ${idea.title}
Background: ${idea.abstract.background}
Literature Review: ${idea.abstract.literatureReview}
Method: ${idea.abstract.method}
Analysis Technique: ${idea.abstract.analysisTechnique}
Impact: ${idea.abstract.impact}

Output Format: Return a JSON object with the following structure for EditorJS:
{
  "blocks": [
    {
      "type": "header",
      "data": {
        "text": "Research Title",
        "level": 1
      }
    },
    {
      "type": "header", 
      "data": {
        "text": "1. Introduction",
        "level": 2
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Introduction paragraph text..."
      }
    },
    {
      "type": "header",
      "data": {
        "text": "1.1 Background and Context",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Background paragraph..."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "unordered",
        "items": [
          "Key point 1",
          "Key point 2",
          "Key point 3"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "1.2 Problem Statement",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Problem statement..."
      }
    },
    {
      "type": "header",
      "data": {
        "text": "1.3 Research Objectives",
        "level": 3
      }
    },
    {
      "type": "list",
      "data": {
        "style": "ordered",
        "items": [
          "Primary objective 1",
          "Secondary objective 2",
          "Tertiary objective 3"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "2. Literature Review",
        "level": 2
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Literature review introduction..."
      }
    },
    {
      "type": "header",
      "data": {
        "text": "2.1 Theoretical Framework",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Theoretical framework description..."
      }
    },
    {
      "type": "header",
      "data": {
        "text": "2.2 Current State of Research",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Current research status..."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "unordered",
        "items": [
          "Research gap 1",
          "Research gap 2",
          "Research gap 3"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "3. Methodology",
        "level": 2
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Methodology overview..."
      }
    },
    {
      "type": "header",
      "data": {
        "text": "3.1 Research Design",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Research design description..."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "ordered",
        "items": [
          "Design approach 1",
          "Design approach 2",
          "Design approach 3"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "3.2 Data Collection Methods",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Data collection methods..."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "unordered",
        "items": [
          "Method 1: Description",
          "Method 2: Description",
          "Method 3: Description"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "3.3 Analysis Techniques",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Analysis techniques description..."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "ordered",
        "items": [
          "Technique 1: Purpose and application",
          "Technique 2: Purpose and application",
          "Technique 3: Purpose and application"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "4. Expected Results and Impact",
        "level": 2
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Expected results overview..."
      }
    },
    {
      "type": "header",
      "data": {
        "text": "4.1 Anticipated Findings",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Anticipated findings description..."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "unordered",
        "items": [
          "Finding 1: Expected outcome",
          "Finding 2: Expected outcome",
          "Finding 3: Expected outcome"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "4.2 Potential Impact",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Potential impact description..."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "unordered",
        "items": [
          "Academic impact: Contribution to field",
          "Practical impact: Real-world applications",
          "Policy impact: Potential policy implications"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "5. Timeline and Resources",
        "level": 2
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Timeline and resources overview..."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "ordered",
        "items": [
          "Phase 1: Planning and preparation (Month 1-2)",
          "Phase 2: Data collection (Month 3-6)",
          "Phase 3: Analysis and writing (Month 7-9)",
          "Phase 4: Review and submission (Month 10-12)"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "6. Conclusion",
        "level": 2
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Conclusion paragraph summarizing the research proposal and its significance..."
      }
    }
  ]
}

Requirements:
- Expand each section with detailed, academic-level content
- Use appropriate block types: header, paragraph, list (both ordered and unordered)
- Ensure content flows logically from introduction to conclusion
- Include specific, actionable details rather than generic statements
- Maintain academic writing style and tone
- Each section should be substantial (2-4 paragraphs or equivalent list items)
- Use the provided research idea as the foundation but expand significantly
- Ensure all content is relevant to the research topic
- Output ONLY the JSON object, no other text`
      },
      id: {
        systemInstruction: `Anda adalah konsultan penelitian akademik ahli yang mengkhususkan diri dalam membuat outline dan proposal penelitian yang komprehensif dan siap publikasi. Tugas Anda adalah memperluas ide penelitian singkat menjadi outline penelitian yang detail dan terstruktur yang dapat dirender dalam editor teks kaya.

PENTING: Output HANYA JSON yang valid yang mengikuti struktur yang ditentukan persis. Jangan sertakan teks penjelasan, markdown, atau format lain di luar JSON.

INSTRUKSI STREAMING: Karena ini adalah respons streaming, Anda harus menghasilkan struktur JSON secara progresif. Mulai dengan brace pembuka dan array "blocks", lalu hasilkan setiap blok secara berurutan. Setiap blok harus lengkap dan JSON yang valid saat dipancarkan.`,
        userPrompt: `Tugas: Perluas ide penelitian singkat berikut menjadi outline penelitian yang komprehensif dan detail.

Ide Penelitian Input:
Judul: ${idea.title}
Latar Belakang: ${idea.abstract.background}
Tinjauan Literatur: ${idea.abstract.literatureReview}
Metode: ${idea.abstract.method}
Teknik Analisis: ${idea.abstract.analysisTechnique}
Dampak: ${idea.abstract.impact}

Format Output: Kembalikan objek JSON dengan struktur berikut untuk EditorJS:
{
  "blocks": [
    {
      "type": "header",
      "data": {
        "text": "Judul Penelitian",
        "level": 1
      }
    },
    {
      "type": "header", 
      "data": {
        "text": "1. Pendahuluan",
        "level": 2
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Teks paragraf pendahuluan..."
      }
    },
    {
      "type": "header",
      "data": {
        "text": "1.1 Latar Belakang dan Konteks",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Paragraf latar belakang..."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "unordered",
        "items": [
          "Poin kunci 1",
          "Poin kunci 2",
          "Poin kunci 3"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "1.2 Pernyataan Masalah",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Pernyataan masalah..."
      }
    },
    {
      "type": "header",
      "data": {
        "text": "1.3 Tujuan Penelitian",
        "level": 3
      }
    },
    {
      "type": "list",
      "data": {
        "style": "ordered",
        "items": [
          "Tujuan utama 1",
          "Tujuan sekunder 2",
          "Tujuan tersier 3"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "2. Tinjauan Literatur",
        "level": 2
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Pendahuluan tinjauan literatur..."
      }
    },
    {
      "type": "header",
      "data": {
        "text": "2.1 Kerangka Teoritis",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Deskripsi kerangka teoritis..."
      }
    },
    {
      "type": "header",
      "data": {
        "text": "2.2 Keadaan Penelitian Saat Ini",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Status penelitian saat ini..."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "unordered",
        "items": [
          "Kesenjangan penelitian 1",
          "Kesenjangan penelitian 2",
          "Kesenjangan penelitian 3"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "3. Metodologi",
        "level": 2
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Ikhtisar metodologi..."
      }
    },
    {
      "type": "header",
      "data": {
        "text": "3.1 Desain Penelitian",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Deskripsi desain penelitian..."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "ordered",
        "items": [
          "Pendekatan desain 1",
          "Pendekatan desain 2",
          "Pendekatan desain 3"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "3.2 Metode Pengumpulan Data",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Metode pengumpulan data..."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "unordered",
        "items": [
          "Metode 1: Deskripsi",
          "Metode 2: Deskripsi",
          "Metode 3: Deskripsi"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "3.3 Teknik Analisis",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Deskripsi teknik analisis..."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "ordered",
        "items": [
          "Teknik 1: Tujuan dan aplikasi",
          "Teknik 2: Tujuan dan aplikasi",
          "Teknik 3: Tujuan dan aplikasi"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "4. Hasil yang Diharapkan dan Dampak",
        "level": 2
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Ikhtisar hasil yang diharapkan..."
      }
    },
    {
      "type": "header",
      "data": {
        "text": "4.1 Temuan yang Diantisipasi",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Deskripsi temuan yang diantisipasi..."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "unordered",
        "items": [
          "Temuan 1: Hasil yang diharapkan",
          "Temuan 2: Hasil yang diharapkan",
          "Temuan 3: Hasil yang diharapkan"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "4.2 Dampak Potensial",
        "level": 3
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Deskripsi dampak potensial..."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "unordered",
        "items": [
          "Dampak akademik: Kontribusi ke bidang",
          "Dampak praktis: Aplikasi dunia nyata",
          "Dampak kebijakan: Implikasi kebijakan potensial"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "5. Timeline dan Sumber Daya",
        "level": 2
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Ikhtisar timeline dan sumber daya..."
      }
    },
    {
      "type": "list",
      "data": {
        "style": "ordered",
        "items": [
          "Fase 1: Perencanaan dan persiapan (Bulan 1-2)",
          "Fase 2: Pengumpulan data (Bulan 3-6)",
          "Fase 3: Analisis dan penulisan (Bulan 7-9)",
          "Fase 4: Review dan pengajuan (Bulan 10-12)"
        ]
      }
    },
    {
      "type": "header",
      "data": {
        "text": "6. Kesimpulan",
        "level": 2
      }
    },
    {
      "type": "paragraph",
      "data": {
        "text": "Paragraf kesimpulan yang merangkum proposal penelitian dan signifikansinya..."
      }
    }
  ]
}

Persyaratan:
- Perluas setiap bagian dengan konten yang detail dan tingkat akademik
- Gunakan tipe blok yang sesuai: header, paragraph, list (baik ordered maupun unordered)
- Pastikan konten mengalir secara logis dari pendahuluan ke kesimpulan
- Sertakan detail yang spesifik dan dapat ditindaklanjuti, bukan pernyataan generik
- Pertahankan gaya dan nada penulisan akademik
- Setiap bagian harus substansial (2-4 paragraf atau item list yang setara)
- Gunakan ide penelitian yang disediakan sebagai fondasi tetapi perluas secara signifikan
- Pastikan semua konten relevan dengan topik penelitian
- Output HANYA objek JSON, tidak ada teks lain`
      }
    };

    const config = languageConfig[language as keyof typeof languageConfig] || languageConfig.en;

    // Set up Server-Sent Events
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('Starting streaming generation...');
          
          const result = await model.generateContentStream({
            contents: [
              { role: 'user', parts: [{ text: config.systemInstruction }] },
              { role: 'user', parts: [{ text: config.userPrompt }] },
            ],
            generationConfig: {
              temperature: 0.7,
              topP: 0.9,
              topK: 40,
              maxOutputTokens: 4096,
              responseMimeType: 'application/json',
            },
          });

          let fullText = '';
          let blockCount = 0;
          
          // Send initial connection event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;
            
            console.log('Received chunk:', chunkText);
          }
          
          console.log('Stream completed, parsing full response...');
          
          // Parse the complete response
          try {
            const parsedResponse = JSON.parse(fullText);
            
            if (parsedResponse && parsedResponse.blocks && Array.isArray(parsedResponse.blocks)) {
              console.log('Parsed blocks:', parsedResponse.blocks.length);
              
              // Send blocks one by one with delays for streaming effect
              for (let i = 0; i < parsedResponse.blocks.length; i++) {
                const block = parsedResponse.blocks[i];
                
                console.log('Sending block:', i, block.type);
                
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                  type: 'block', 
                  block,
                  index: i 
                })}\n\n`));
                
                // Add small delay for visual effect
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            } else {
              throw new Error('Invalid response structure');
            }
          } catch (parseError) {
            console.error('Error parsing full response:', parseError);
            throw parseError;
          }
          
          console.log('Stream completed, final text length:', fullText.length);
          
          // Send completion event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'completed' })}\n\n`));
          controller.close();
          
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error: any) {
    console.error('Error in /api/outliner/expand-stream:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
