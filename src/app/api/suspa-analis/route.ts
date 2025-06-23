import { GoogleGenerativeAI, SchemaType, Part } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

const responseSchema = {
  type: SchemaType.OBJECT as const,
  required: ["TANGGAL", "PULAU", "PROVINSI", "KABUPATEN / KOTA", "ISU UTAMA", "BIDANG", "TOPIK", "TOKOH", "JUMLAH PESERTA"],
  properties: {
    TANGGAL: {
      type: SchemaType.STRING as const,
      description: "Tanggal kejadian atau laporan.",
    },
    PULAU: {
      type: SchemaType.STRING as const,
      description: "Nama pulau lokasi isu.",
    },
    PROVINSI: {
      type: SchemaType.STRING as const,
      description: "Nama provinsi lokasi isu.",
    },
    "KABUPATEN / KOTA": {
      type: SchemaType.STRING as const,
      description: "Nama kabupaten atau kota lokasi isu.",
    },
    "ISU UTAMA": {
      type: SchemaType.STRING as const,
      description: "Ringkasan atau judul utama dari isu yang dibahas.",
    },
    BIDANG: {
      type: SchemaType.STRING as const,
      description: "Sektor atau bidang yang relevan dengan isu (e.g., Pertanian, Ekonomi, Politik).",
    },
    TOPIK: {
      type: SchemaType.ARRAY as const,
      description: "Daftar topik-topik spesifik yang terkait dengan isu utama.",
      items: {
        type: SchemaType.STRING as const,
      },
    },
    TOKOH: {
      type: SchemaType.ARRAY as const,
      description: "Daftar nama tokoh atau figur publik yang terlibat atau disebutkan.",
      items: {
        type: SchemaType.STRING as const,
      },
    },
    "JUMLAH PESERTA": {
      type: SchemaType.INTEGER as const,
      description: "Jumlah total peserta dalam acara/kejadian yang dilaporkan.",
    },
  },
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.1,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
    responseSchema: responseSchema,
  }
});

const SYSTEM_PROMPT_TEXT = `Anda adalah seorang analis yang ahli dalam mengekstrak informasi terstruktur dari teks panjang atau dokumen PDF dalam bahasa Indonesia. 

Tugas Anda adalah menganalisis konten yang diberikan (baik teks atau file) dan mengekstrak informasi yang relevan untuk semua field yang diminta.

Panduan ekstraksi:
1. Baca konten secara menyeluruh untuk memahami konteks
2. Identifikasi informasi yang relevan untuk setiap field
3. Untuk TOPIK dan TOKOH, berikan sebagai array of strings
4. Untuk JUMLAH PESERTA, berikan sebagai integer (jumlah orang yang terlibat/hadir dalam acara/kejadian)
5. Jika informasi tidak tersedia, gunakan "Tidak disebutkan" untuk strings, [] untuk arrays, dan 0 untuk integers
6. Prioritaskan akurasi dan presisi dalam ekstraksi

Respons akan secara otomatis diformat sesuai skema JSON yang ditentukan.`;

async function fileToGenerativePart(file: File): Promise<Part> {
  const base64EncodedData = await file.arrayBuffer().then(buffer => Buffer.from(buffer).toString('base64'));
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let promptParts: Part[] = [{ text: SYSTEM_PROMPT_TEXT }];

    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { text } = body;

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return NextResponse.json(
          { error: 'Text content is required and cannot be empty' },
          { status: 400 }
        );
      }
      
      promptParts.push({ text: `

Teks yang akan dianalisis:
"""
${text}
"""

Silakan ekstrak informasi yang relevan dan berikan dalam format JSON yang diminta.`});

    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'File is required' },
          { status: 400 }
        );
      }
      
      const filePart = await fileToGenerativePart(file);
      promptParts.push(filePart, { text: "\n\nSilakan ekstrak informasi yang relevan dari dokumen yang disediakan dan berikan dalam format JSON yang diminta."});

    } else {
      return NextResponse.json(
        { error: 'Unsupported Content-Type' },
        { status: 415 }
      );
    }
    
    // Generate the structured response
    const result = await model.generateContent({ contents: [{ role: "user", parts: promptParts }] });
    const response = await result.response;
    const analysisResult = response.text();

    // Parse the JSON response (should be valid due to structured output)
    let parsedResult;
    try {
      parsedResult = JSON.parse(analysisResult);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', analysisResult);
      return NextResponse.json(
        { error: 'Failed to parse analysis result' },
        { status: 500 }
      );
    }

    return NextResponse.json({ result: parsedResult });

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze text. Please try again.' },
      { status: 500 }
    );
  }
} 