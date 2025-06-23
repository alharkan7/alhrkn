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

const SYSTEM_PROMPT_TEXT = `Anda adalah seorang Analis Intelijen Strategis yang sangat teliti dan berpengalaman. Misi Anda adalah melakukan analisis mendalam terhadap dokumen atau teks yang diberikan untuk menyusun laporan intelijen yang akurat dan komprehensif.

Tugas Anda adalah mengekstrak informasi kunci secara cermat dari konten yang disediakan, memperhatikan setiap detail, baik yang tersurat maupun tersirat. Pastikan setiap field dalam skema JSON diisi dengan informasi yang paling relevan dan akurat.

Panduan Ekstraksi Intelijen:
1. **Analisis Konteks Total:** Pindai dan pahami keseluruhan dokumen untuk mengidentifikasi konteks strategis, tujuan, dan pesan utama.
2. **Ekstraksi Presisi Tinggi:** Identifikasi dengan tepat data yang sesuai untuk setiap field yang diminta. Jangan membuat asumsi, dasarakan semua ekstraksi pada bukti dari dalam teks.
3. **Identifikasi Entitas Kunci:**
   - **TOPIK:** Ekstrak semua tema, sub-tema, dan isu spesifik yang dibahas. Tangkap nuansa dari setiap topik.
   - **TOKOH:** Identifikasi semua individu yang disebutkan.
4. **Kuantifikasi Data:** Untuk **JUMLAH PESERTA**, cari angka spesifik. Jika disebutkan dalam bentuk teks (e.g., "ratusan"), berikan estimasi integer yang paling masuk akal (e.g., 100). Jika tidak ada, gunakan 0.
5. **Penanganan Informasi Nihil:** Jika setelah analisis menyeluruh sebuah informasi benar-benar tidak ditemukan, gunakan nilai default: "Tidak disebutkan" untuk string, [] untuk array, dan 0 untuk integer.
6. **Kualitas di Atas Segalanya:** Akurasi, kelengkapan, dan presisi adalah prioritas utama. Hasil analisis Anda akan menjadi dasar bagi pengambilan keputusan strategis.

Sistem akan secara otomatis memformat output Anda ke dalam skema JSON yang telah ditentukan. Fokuslah pada kualitas ekstraksi.`;

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
    let promptParts: Part[];
    let systemPrompt: string | null | undefined;

    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { text } = body;
      systemPrompt = body.systemPrompt;

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return NextResponse.json(
          { error: 'Text content is required and cannot be empty' },
          { status: 400 }
        );
      }
      
      if (!systemPrompt || typeof systemPrompt !== 'string') {
        return NextResponse.json(
          { error: 'System prompt is required' },
          { status: 400 }
        );
      }

      promptParts = [
        { text: systemPrompt },
        { text: `

Teks yang akan dianalisis:
"""
${text}
"""

Silakan ekstrak informasi yang relevan dan berikan dalam format JSON yang diminta.`}
      ];

    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      systemPrompt = formData.get('systemPrompt') as string | null;

      if (!file) {
        return NextResponse.json(
          { error: 'File is required' },
          { status: 400 }
        );
      }

      if (!systemPrompt) {
        return NextResponse.json(
          { error: 'System prompt is required' },
          { status: 400 }
        );
      }
      
      const filePart = await fileToGenerativePart(file);
      promptParts = [
        { text: systemPrompt },
        filePart, 
        { text: "\n\nLakukan analisis intelijen terhadap dokumen terlampir berikut. Ekstrak informasi sesuai dengan panduan dan format yang telah ditetapkan."}
      ];

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