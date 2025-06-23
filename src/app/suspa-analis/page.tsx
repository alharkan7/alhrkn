'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppsHeader } from '@/components/apps-header'
import AppsFooter from '@/components/apps-footer'
import { Upload, Loader2, FileText, Table, Copy, Check } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

type AnalysisResult = {
  TANGGAL: string
  PULAU: string
  PROVINSI: string
  'KABUPATEN / KOTA': string
  'ISU UTAMA': string
  BIDANG: string
  TOPIK: string[]
  TOKOH: string[]
  'JUMLAH PESERTA': number
}

export default function SuspaAnalisPage() {
  const [text, setText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasProcessed, setHasProcessed] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text')

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
          body: JSON.stringify({ text }),
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

    // Extract only the values (no headers)
    const values = [
      result.TANGGAL,
      result.PULAU,
      result.PROVINSI,
      result['KABUPATEN / KOTA'],
      result['ISU UTAMA'],
      result.BIDANG,
      Array.isArray(result.TOPIK) ? result.TOPIK.join(', ') : result.TOPIK,
      Array.isArray(result.TOKOH) ? result.TOKOH.join(', ') : result.TOKOH,
      result['JUMLAH PESERTA']
    ]

    // Create tab-separated values for Excel (single row)
    const copyData = values.join('\t')

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppsHeader />
      
      <div className="w-full px-4 py-8 flex-1 flex flex-col">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Suspa Analis</h1>
          <p className="text-muted-foreground">
            Extract Structured Information Instantly
          </p>
        </div>

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
                    className={`transition-colors ${
                      inputMode === 'text'
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
                    className={`transition-colors ${
                      inputMode === 'file'
                        ? 'font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    File
                  </Label>
                </div>
              </CardTitle>
              <CardDescription>
                {inputMode === 'text'
                  ? 'Enter your long text here'
                  : 'Upload a PDF or TXT file for analysis'}
              </CardDescription>
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
                variant="neutral"
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
                  Analysis Results
                </div>
                {result && (
                  <Button
                    variant="neutral"
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
              <CardDescription>
                {result ? 'Extracted structured information' : 'Results will appear here'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden">
              {result ? (
                <div className="overflow-y-auto flex-1">
                  <table className="w-full border-collapse border border-border bg-white">
                    <thead className="sticky top-0 bg-background">
                      <tr className="bg-muted/50">
                        <th className="border border-border p-3 text-left text-sm font-medium">
                          Field
                        </th>
                        <th className="border border-border p-3 text-left text-sm font-medium">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-muted/25">
                        <td className="border border-border p-3 text-sm font-medium">
                          TANGGAL
                        </td>
                        <td className="border border-border p-3 text-sm">
                          {result.TANGGAL}
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/25">
                        <td className="border border-border p-3 text-sm font-medium">
                          PULAU
                        </td>
                        <td className="border border-border p-3 text-sm">
                          {result.PULAU}
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/25">
                        <td className="border border-border p-3 text-sm font-medium">
                          PROVINSI
                        </td>
                        <td className="border border-border p-3 text-sm">
                          {result.PROVINSI}
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/25">
                        <td className="border border-border p-3 text-sm font-medium">
                          KABUPATEN / KOTA
                        </td>
                        <td className="border border-border p-3 text-sm">
                          {result['KABUPATEN / KOTA']}
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/25">
                        <td className="border border-border p-3 text-sm font-medium">
                          ISU UTAMA
                        </td>
                        <td className="border border-border p-3 text-sm">
                          {result['ISU UTAMA']}
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/25">
                        <td className="border border-border p-3 text-sm font-medium">
                          BIDANG
                        </td>
                        <td className="border border-border p-3 text-sm">
                          {result.BIDANG}
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/25">
                        <td className="border border-border p-3 text-sm font-medium">
                          TOPIK
                        </td>
                        <td className="border border-border p-3 text-sm">
                          {Array.isArray(result.TOPIK) ? result.TOPIK.join(', ') : result.TOPIK}
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/25">
                        <td className="border border-border p-3 text-sm font-medium">
                          TOKOH
                        </td>
                        <td className="border border-border p-3 text-sm">
                          {Array.isArray(result.TOKOH) ? result.TOKOH.join(', ') : result.TOKOH}
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/25">
                        <td className="border border-border p-3 text-sm font-medium">
                          JUMLAH PESERTA
                        </td>
                        <td className="border border-border p-3 text-sm">
                          {result['JUMLAH PESERTA']}
                        </td>
                      </tr>
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

    </div>
  )
}
