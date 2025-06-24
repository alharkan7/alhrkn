import { GoogleGenerativeAI, SchemaType, Part } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

const domainProperties = {
  TANGGAL: {
    type: SchemaType.STRING as const,
    description: "Tanggal kejadian atau laporan. Jika tidak ada, gunakan 'Tidak disebutkan'.",
  },
  PULAU: {
    type: SchemaType.STRING as const,
    description: "Nama pulau lokasi isu. Jika tidak ada, gunakan 'Tidak disebutkan'.",
  },
  PROVINSI: {
    type: SchemaType.STRING as const,
    description: "Nama provinsi lokasi isu. Jika tidak ada, gunakan 'Tidak disebutkan'.",
  },
  "KABUPATEN / KOTA": {
    type: SchemaType.STRING as const,
    description: "Nama kabupaten atau kota lokasi isu. Jika tidak ada, gunakan 'Tidak disebutkan'.",
  },
  "ISU UTAMA": {
    type: SchemaType.STRING as const,
    description: "Ringkasan atau judul utama dari isu yang dibahas untuk domain ini. Jika tidak ada isu relevan, gunakan 'Nihil'.",
  },
  BIDANG: {
    type: SchemaType.STRING as const,
    description: "Sektor atau bidang yang relevan, harus sesuai nama domain (e.g., 'SOSBUD', 'IDEOLOGI').",
  },
  TOPIK: {
    type: SchemaType.ARRAY as const,
    description: "Daftar topik-topik spesifik yang terkait dengan isu utama. Jika tidak ada, gunakan array kosong [].",
    items: {
      type: SchemaType.STRING as const,
    },
  },
  TOKOH: {
    type: SchemaType.ARRAY as const,
    description: "Daftar nama tokoh atau figur publik yang terlibat atau disebutkan. Jika tidak ada, gunakan array kosong [].",
    items: {
      type: SchemaType.STRING as const,
    },
  },
  "JUMLAH PESERTA": {
    type: SchemaType.INTEGER as const,
    description: "Jumlah total peserta dalam acara/kejadian yang dilaporkan. Jika tidak ada, gunakan 0.",
  },
};

const singleDomainSchema = {
  type: SchemaType.OBJECT as const,
  required: ["TANGGAL", "PULAU", "PROVINSI", "KABUPATEN / KOTA", "ISU UTAMA", "BIDANG", "TOPIK", "TOKOH", "JUMLAH PESERTA"],
  properties: domainProperties,
}

const responseSchema = {
  type: SchemaType.OBJECT as const,
  required: ["SOSBUD", "IDEOLOGI", "POLITIK", "HANKAM", "EKONOMI"],
  properties: {
    SOSBUD: { 
      type: SchemaType.ARRAY as const,
      description: "Array analisis untuk bidang Sosial-Budaya (SOSBUD). Jika tidak ada informasi relevan, berikan array dengan satu objek yang 'ISU UTAMA' diisi dengan 'Nihil'.",
      items: singleDomainSchema
    },
    IDEOLOGI: { 
      type: SchemaType.ARRAY as const,
      description: "Array analisis untuk bidang Ideologi. Jika tidak ada informasi relevan, berikan array dengan satu objek yang 'ISU UTAMA' diisi dengan 'Nihil'.",
      items: singleDomainSchema
    },
    POLITIK: { 
      type: SchemaType.ARRAY as const,
      description: "Array analisis untuk bidang Politik. Jika tidak ada informasi relevan, berikan array dengan satu objek yang 'ISU UTAMA' diisi dengan 'Nihil'.",
      items: singleDomainSchema
    },
    HANKAM: { 
      type: SchemaType.ARRAY as const,
      description: "Array analisis untuk bidang Pertahanan dan Keamanan (HANKAM). Jika tidak ada informasi relevan, berikan array dengan satu objek yang 'ISU UTAMA' diisi dengan 'Nihil'.",
      items: singleDomainSchema
    },
    EKONOMI: { 
      type: SchemaType.ARRAY as const,
      description: "Array analisis untuk bidang Ekonomi. Jika tidak ada informasi relevan, berikan array dengan satu objek yang 'ISU UTAMA' diisi dengan 'Nihil'.",
      items: singleDomainSchema
    },
  },
};

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.1,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
    responseSchema: responseSchema,
  }
});

const SYSTEM_PROMPT_TEXT = `Anda adalah seorang Analis Intelijen Strategis yang sangat teliti dan berpengalaman. Misi Anda adalah melakukan analisis mendalam terhadap dokumen atau teks yang diberikan untuk menyusun laporan intelijen yang akurat dan komprehensif, dipecah menjadi lima domain strategis.

Tugas Anda adalah mengekstrak informasi kunci secara cermat dari konten yang disediakan dan mengkategorikannya ke dalam domain yang sesuai:
- **SOSBUD** (Sosial-Budaya)
- **IDEOLOGI**
- **POLITIK**
- **HANKAM** (Pertahanan dan Keamanan)
- **EKONOMI**

**PENTING**: Setiap domain dapat memiliki MULTIPLE ISU UTAMA yang berbeda. Jika dalam suatu domain terdapat beberapa isu yang berbeda, buatlah entri terpisah untuk setiap isu dalam array domain tersebut.

Panduan Ekstraksi Intelijen:
1. **Analisis Komprehensif:** Pindai dan pahami keseluruhan dokumen untuk mengidentifikasi konteks, tujuan, dan pesan utama.
2. **Klasifikasi Domain:** Tentukan informasi mana yang termasuk dalam domain SOSBUD, IDEOLOGI, POLITIK, HANKAM, dan EKONOMI. Satu informasi bisa relevan untuk beberapa domain.
3. **Identifikasi Multiple Issues:** Jika dalam satu domain terdapat beberapa isu yang berbeda, pisahkan menjadi entri yang berbeda dalam array domain tersebut.
4. **Ekstraksi Presisi Tinggi:** Untuk setiap isu dalam setiap domain, identifikasi dengan tepat data yang sesuai untuk setiap field yang diminta.
   - **BIDANG:** Isi dengan nama domain yang sesuai (e.g., "SOSBUD", "IDEOLOGI").
   - **ISU UTAMA:** Ringkas isu utama spesifik untuk entri tersebut. Jika tidak ada informasi yang relevan untuk suatu domain, buat satu entri dengan "ISU UTAMA" = "Nihil".
   - **TOPIK & TOKOH:** Ekstrak semua tema dan individu yang relevan untuk isu spesifik tersebut.
5. **Kuantifikasi Data:** Untuk **JUMLAH PESERTA**, cari angka spesifik untuk setiap isu. Jika tidak ada, gunakan 0.
6. **Penanganan Informasi Nihil:** Jika suatu domain sama sekali tidak memiliki informasi relevan dalam teks, buat array dengan satu objek yang "ISU UTAMA" diisi "Nihil" dan gunakan nilai default untuk field lainnya ("Tidak disebutkan" untuk string, [] untuk array, 0 untuk integer).
7. **Kualitas di Atas Segalanya:** Akurasi, kelengkapan, dan presisi adalah prioritas utama. Hasil analisis Anda akan menjadi dasar bagi pengambilan keputusan strategis.

Contoh output untuk domain dengan multiple issues:
{
  "POLITIK": [
    {
      "TANGGAL": "2024-01-15",
      "PULAU": "Jawa",
      "PROVINSI": "DKI Jakarta", 
      "KABUPATEN / KOTA": "Jakarta Pusat",
      "ISU UTAMA": "Demonstrasi mahasiswa menuntut transparansi anggaran",
      "BIDANG": "POLITIK",
      "TOPIK": ["demonstrasi", "transparansi", "anggaran"],
      "TOKOH": ["Ketua BEM UI"],
      "JUMLAH PESERTA": 500
    },
    {
      "TANGGAL": "2024-01-15",
      "PULAU": "Jawa",
      "PROVINSI": "DKI Jakarta",
      "KABUPATEN / KOTA": "Jakarta Selatan", 
      "ISU UTAMA": "Pertemuan koalisi partai politik",
      "BIDANG": "POLITIK",
      "TOPIK": ["koalisi", "partai politik", "pertemuan"],
      "TOKOH": ["Ketua Partai A", "Ketua Partai B"],
      "JUMLAH PESERTA": 50
    }
  ]
}

Sistem akan secara otomatis memformat output Anda ke dalam skema JSON yang telah ditentukan. Fokuslah pada kualitas ekstraksi dan identifikasi multiple issues per domain.`;

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