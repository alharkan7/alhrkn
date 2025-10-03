'use client'

import { useState } from 'react'
import TextFileList from './components/TextFileList'
import TextDisplay from './components/TextDisplay'
import ResultsSheet from './components/ResultsSheet'

interface TextFile {
  id: string
  title: string
  content: string
  processed?: boolean
}

interface Statement {
  statement: string
  concept: string
  actor: string
  organization: string
  agree: boolean
  sourceFile?: string
}

export default function DNAnalyzerPage() {
  const [files, setFiles] = useState<TextFile[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [allStatements, setAllStatements] = useState<Statement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedFile = files.find(file => file.id === selectedFileId) || null

  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId)
    setError('') // Clear any previous errors when selecting a file
  }

  const handleAddFile = (title: string, content: string) => {
    const newFile: TextFile = {
      id: Date.now().toString(), // Simple ID generation
      title,
      content,
      processed: false
    }
    setFiles(prev => [...prev, newFile])
  }

  const handleAnalyze = async (text: string) => {
    if (!selectedFile || !text.trim()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/dnanalyzer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const newStatements = (data.statements || []).map((stmt: Statement) => ({
        ...stmt,
        sourceFile: selectedFile.title
      }))

      // Add new statements to accumulated results
      setAllStatements(prev => [...prev, ...newStatements])

      // Mark file as processed
      setFiles(prev => prev.map(file =>
        file.id === selectedFile.id
          ? { ...file, processed: true }
          : file
      ))

    } catch (err) {
      console.error('Error processing text:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while processing the text')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatement = (index: number, field: keyof Statement, newValue: string) => {
    setAllStatements(prev => {
      const updated = [...prev]
      if (field === 'agree') {
        updated[index][field] = newValue.toLowerCase() === 'true'
      } else {
        updated[index][field] = newValue
      }
      return updated
    })
  }

  const processedFilesCount = files.filter(file => file.processed).length

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Discourse Network Analyzer</h1>
          <p className="text-gray-600">Analyze discourse networks across multiple text files</p>
        </div>

        {/* Text Files List - Top */}
        <div className="mb-6">
          <TextFileList
            files={files}
            selectedFileId={selectedFileId}
            onFileSelect={handleFileSelect}
            onAddFile={handleAddFile}
          />
        </div>

        {/* Text Display - Middle */}
        <div className="mb-6">
          <TextDisplay
            selectedFile={selectedFile}
            onAnalyze={handleAnalyze}
            loading={loading}
            error={error}
          />
        </div>
      </div>

      {/* Results Sheet - Right Side */}
      <ResultsSheet
        statements={allStatements}
        onUpdateStatement={handleUpdateStatement}
        totalFiles={files.length}
        processedFiles={processedFilesCount}
      />
    </div>
  )
}
