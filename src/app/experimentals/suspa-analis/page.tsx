'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppsHeader } from '@/components/apps-header'
import AppsFooter from '@/components/apps-footer'
import { Upload, Loader2, FileText, Table, Copy, Check, SlidersHorizontal } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription
} from '@/components/ui/sheet'
import ReactMarkdown from 'react-markdown'
import React from 'react'

type DomainResult = {
  TANGGAL: string
  PULAU: string
  PROVINSI: string
  'KABUPATEN / KOTA': string
  'ISU UTAMA': string
  BIDANG: string
  TOPIK: string[] | string
  TOKOH: string[] | string
  'JUMLAH PESERTA': number
}

type AnalysisResult = Record<string, DomainResult[]>

const DEFAULT_SYSTEM_PROMPT = `Anda adalah seorang Analis Intelijen Strategis yang sangat teliti dan berpengalaman. Misi Anda adalah melakukan analisis mendalam terhadap dokumen atau teks yang diberikan untuk menyusun laporan intelijen yang akurat dan komprehensif, dipecah menjadi lima domain strategis.

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
\`\`\`json
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
\`\`\`

Sistem akan secara otomatis memformat output Anda ke dalam skema JSON yang telah ditentukan. Fokuslah pada kualitas ekstraksi dan identifikasi multiple issues per domain.`;

export default function SuspaAnalisPage() {
  const [text, setText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasProcessed, setHasProcessed] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text')
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (
      selectedFile.type === 'application/pdf' ||
      selectedFile.type === 'text/plain'
    ) {
      if (selectedFile.type === 'text/plain') {
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          setText(content)
          setFile(null)
          setError(null)
        }
        reader.readAsText(selectedFile)
      } else {
        setFile(selectedFile)
        setText('')
        setError(null)
      }
    } else {
      setError('Unsupported file type. Please upload a PDF or TXT file.')
      setFile(null)
    }
  }

  const handleProcess = async () => {
    if (!text.trim() && !file) {
      setError('Please enter text to analyze or upload a file')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      let response
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('systemPrompt', systemPrompt)
        response = await fetch('/api/suspa-analis', {
          method: 'POST',
          body: formData,
        })
      } else {
        response = await fetch('/api/suspa-analis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text, systemPrompt }),
        })
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process text')
      }

      setResult(data.result || null)
      setHasProcessed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (inputMode !== 'file') return

    const droppedFile = e.dataTransfer.files?.[0]
    if (!droppedFile) return

    if (
      droppedFile.type === 'application/pdf' ||
      droppedFile.type === 'text/plain'
    ) {
      if (droppedFile.type === 'text/plain') {
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          setText(content)
          setFile(null)
          setError(null)
        }
        reader.readAsText(droppedFile)
      } else {
        setFile(droppedFile)
        setText('')
        setError(null)
      }
    } else {
      setError('Unsupported file type. Please upload a PDF or TXT file.')
      setFile(null)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleCopyResults = async () => {
    if (!result) return

    const header = [
      "DOMAIN",
      "TANGGAL",
      "PULAU",
      "PROVINSI",
      "KABUPATEN / KOTA",
      "ISU UTAMA",
      "BIDANG",
      "TOPIK",
      "TOKOH",
      "JUMLAH PESERTA"
    ].join('\t');

    const rows = Object.entries(result).flatMap(([domain, domainResults]) =>
      domainResults
        .filter(domainResult =>
          domainResult &&
          typeof domainResult['ISU UTAMA'] === 'string' &&
          domainResult['ISU UTAMA'].toLowerCase() !== 'nihil'
        )
        .map(domainResult => {
          const values = [
            domain,
            domainResult.TANGGAL,
            domainResult.PULAU,
            domainResult.PROVINSI,
            domainResult['KABUPATEN / KOTA'],
            domainResult['ISU UTAMA'],
            domainResult.BIDANG,
            Array.isArray(domainResult.TOPIK) ? domainResult.TOPIK.join('; ') : domainResult.TOPIK,
            Array.isArray(domainResult.TOKOH) ? domainResult.TOKOH.join('; ') : domainResult.TOKOH,
            domainResult['JUMLAH PESERTA']
          ];
          return values.join('\t');
        })
    );

    const copyData = [header, ...rows].join('\n');

    try {
      await navigator.clipboard.writeText(copyData)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      // Fallback: create a temporary textarea and copy
      const textarea = document.createElement('textarea')
      textarea.value = copyData
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000) // Reset after 2 seconds
    }
  }

  const promptSettingsButton = (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="default" size="icon">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>System Prompt</SheetTitle>
          <SheetDescription>
            Tweak to guide how the AI do the extraction
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1 flex flex-col min-h-0">
          {isEditingPrompt ? (
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              onBlur={() => setIsEditingPrompt(false)}
              className="flex-1 resize-none text-sm"
              placeholder="Enter your system prompt here..."
              autoFocus
            />
          ) : (
            <div
              onDoubleClick={() => setIsEditingPrompt(true)}
              className="prose prose-sm dark:prose-invert max-w-none w-full h-full overflow-y-auto p-2 border rounded-md"
            >
              <ReactMarkdown>{systemPrompt}</ReactMarkdown>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppsHeader title="Suspa Analis Tools" leftButton={promptSettingsButton} />

      <div className="max-w-8xl px-4 py-4 flex-1 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
          {/* Input Section */}
          <Card className="flex flex-col h-full">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Input
                </div>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="input-mode-switch"
                    className={`transition-colors ${inputMode === 'text'
                      ? 'font-medium'
                      : 'text-muted-foreground'
                      }`}
                  >
                    Text
                  </Label>
                  <Switch
                    id="input-mode-switch"
                    checked={inputMode === 'file'}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setInputMode('file')
                        setText('')
                      } else {
                        setInputMode('text')
                        setFile(null)
                      }
                    }}
                  />
                  <Label
                    htmlFor="input-mode-switch"
                    className={`transition-colors ${inputMode === 'file'
                      ? 'font-medium'
                      : 'text-muted-foreground'
                      }`}
                  >
                    File
                  </Label>
                </div>
              </CardTitle>
              {/* <CardDescription>
                {inputMode === 'text'
                  ? 'Enter your long text here'
                  : 'Upload a PDF or TXT file for analysis'}
              </CardDescription> */}
            </CardHeader>
            <CardContent
              className="space-y-4 flex-1 flex flex-col overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {inputMode === 'text' ? (
                <div className="space-y-2 flex-1 flex flex-col overflow-hidden">
                  <Textarea
                    id="text-content"
                    placeholder="Enter your long text content here..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="flex-1 resize-none bg-white"
                  />
                  <p className="text-xs text-muted-foreground flex justify-between flex-shrink-0">
                    <span>{text.length} characters</span>
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 text-center transition-colors bg-white">
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.txt"
                  />
                  <label
                    htmlFor="file-upload"
                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Upload className="h-8 w-8 mb-4 opacity-50" />
                    {file ? (
                      <div>
                        <p className="font-semibold">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Click or drag another file to replace
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold">
                          Drag & drop a file or click to upload
                        </p>
                        <p className="text-sm text-muted-foreground">
                          PDF or TXT
                        </p>
                      </div>
                    )}
                  </label>
                  {file && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        const fileInput = document.getElementById(
                          'file-upload'
                        ) as HTMLInputElement
                        if (fileInput) fileInput.value = ''
                      }}
                      className="mt-4 text-destructive text-sm font-semibold"
                    >
                      Remove file
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex-shrink-0">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}

              <Button
                onClick={handleProcess}
                disabled={isProcessing || (!text.trim() && !file)}
                className="w-full flex-shrink-0"
                variant="secondary"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Process'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="flex flex-col h-full">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table className="h-5 w-5" />
                  Extraction
                </div>
                {result && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyResults}
                    className="h-8 px-3"
                    disabled={isCopied}
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </CardTitle>
              {/* <CardDescription>
                {result ? 'Extracted structured information' : 'Results will appear here'}
              </CardDescription> */}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden">
              {result ? (
                <div className="overflow-x-auto flex-1">
                  <table className="w-full min-w-max border-collapse border border-border bg-white">
                    <thead className="sticky top-0 bg-background z-10">
                      <tr className="bg-muted/50">
                        <th className="border border-border p-3 text-left text-sm font-medium">DOMAIN</th>
                        <th className="border border-border p-3 text-left text-sm font-medium">TANGGAL</th>
                        <th className="border border-border p-3 text-left text-sm font-medium">PULAU</th>
                        <th className="border border-border p-3 text-left text-sm font-medium">PROVINSI</th>
                        <th className="border border-border p-3 text-left text-sm font-medium">KABUPATEN / KOTA</th>
                        <th className="border border-border p-3 text-left text-sm font-medium">ISU UTAMA</th>
                        <th className="border border-border p-3 text-left text-sm font-medium">BIDANG</th>
                        <th className="border border-border p-3 text-left text-sm font-medium">TOPIK</th>
                        <th className="border border-border p-3 text-left text-sm font-medium">TOKOH</th>
                        <th className="border border-border p-3 text-left text-sm font-medium">JUMLAH PESERTA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(result)
                        .flatMap(([domain, domainResults]) =>
                          domainResults
                            .filter(domainResult =>
                              domainResult &&
                              typeof domainResult['ISU UTAMA'] === 'string' &&
                              domainResult['ISU UTAMA'].toLowerCase() !== 'nihil'
                            )
                            .map((domainResult, index) => (
                              <tr key={`${domain}-${index}`} className="hover:bg-muted/25">
                                <td className="border border-border p-3 text-sm font-bold">{domain}</td>
                                <td className="border border-border p-3 text-sm">{domainResult.TANGGAL}</td>
                                <td className="border border-border p-3 text-sm">{domainResult.PULAU}</td>
                                <td className="border border-border p-3 text-sm">{domainResult.PROVINSI}</td>
                                <td className="border border-border p-3 text-sm">{domainResult['KABUPATEN / KOTA']}</td>
                                <td className="border border-border p-3 text-sm">{domainResult['ISU UTAMA']}</td>
                                <td className="border border-border p-3 text-sm">{domainResult.BIDANG}</td>
                                <td className="border border-border p-3 text-sm">{Array.isArray(domainResult.TOPIK) ? domainResult.TOPIK.join(', ') : domainResult.TOPIK}</td>
                                <td className="border border-border p-3 text-sm">{Array.isArray(domainResult.TOKOH) ? domainResult.TOKOH.join(', ') : domainResult.TOKOH}</td>
                                <td className="border border-border p-3 text-sm">{domainResult['JUMLAH PESERTA']}</td>
                              </tr>
                            ))
                        )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                  <div>
                    <Table className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Enter text on the left and click "Process" to see results here</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex-shrink-0 mb-2 mt-0">
        <AppsFooter />
      </div>
    </div>
  )
}
