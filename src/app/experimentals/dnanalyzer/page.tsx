'use client'

import { useState, useRef } from 'react'
import TextFileList from './components/TextFileList'
import TextDisplay from './components/TextDisplay'
import ResultsSheet from './components/ResultsSheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Save, AlertCircle, CheckCircle } from 'lucide-react'

interface TextFile {
  id: string
  title: string
  content: string
  processed?: boolean
  isLoaded?: boolean // true if loaded from DB, false if newly added
  isContentModified?: boolean // true if content has been edited
  originalDocumentId?: number // Original DB ID for loaded documents
}

interface Statement {
  statement: string
  concept: string
  actor: string
  organization: string
  agree: boolean
  sourceFile?: string
  startIndex?: number
  endIndex?: number
  isLoaded?: boolean // true if loaded from DB, false if newly analyzed
  isModified?: boolean // true if statement has been edited
  originalStatementId?: number // Original DB statement ID for updates
}

export default function DNAnalyzerPage() {
  const [files, setFiles] = useState<TextFile[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [allStatements, setAllStatements] = useState<Statement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [loadingData, setLoadingData] = useState(false)

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
      processed: false,
      isLoaded: false, // Mark as newly added, not loaded from DB
      isContentModified: false // Initially not modified
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
        sourceFile: selectedFile.title,
        startIndex: stmt.startIndex,
        endIndex: stmt.endIndex,
        isLoaded: false, // Mark as newly analyzed, not loaded from DB
        isModified: false // Initially not modified
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

  const handleUpdateStatement = (index: number, field: 'statement' | 'concept' | 'actor' | 'organization' | 'agree', newValue: string) => {
    setAllStatements(prev => {
      const updated = [...prev]
      if (field === 'agree') {
        updated[index][field] = newValue.toLowerCase() === 'true'
      } else {
        updated[index][field] = newValue
      }
      updated[index].isModified = true // Mark as modified
      return updated
    })
  }

  const handleAddManualStatement = (fileId: string, statementData: Omit<Statement, 'sourceFile' | 'isLoaded' | 'isModified' | 'originalStatementId'>) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return

    const newStatement: Statement = {
      ...statementData,
      sourceFile: file.title,
      isLoaded: false,
      isModified: false
    }

    setAllStatements(prev => [...prev, newStatement])
  }

  const processedFilesCount = files.filter(file => file.processed).length

  const handleUpdateContent = async (fileId: string, newContent: string) => {
    // Update the file content in state
    setFiles(prev => prev.map(file =>
      file.id === fileId
        ? { ...file, content: newContent, isContentModified: true }
        : file
    ))

    // If the file was loaded from DB and has been edited, we need to save the changes
    const file = files.find(f => f.id === fileId)
    if (file && file.isLoaded) {
      try {
        // Update the existing document in database
        const response = await fetch('/api/dnanalyzer/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documents: [{
              id: file.originalDocumentId, // Pass the original DB ID for update
              title: file.title,
              content: newContent,
              statements: [] // No statements to add for content-only updates
            }]
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Unknown error occurred')
        }

        setSaveStatus('success')
        setSaveMessage('Content updated successfully!')
        setTimeout(() => setSaveStatus('idle'), 3000)

      } catch (err) {
        console.error('Error updating content:', err)
        setSaveStatus('error')
        setSaveMessage(err instanceof Error ? err.message : 'An error occurred while updating content')
      }
    }
  }

  const handleSaveToDatabase = async () => {
    if (allStatements.length === 0) {
      setSaveStatus('error')
      setSaveMessage('No statements to save. Please analyze some text files first.')
      return
    }

    setSaving(true)
    setSaveStatus('idle')
    setSaveMessage('')

    try {
      // Group statements by source file, including both new and modified loaded data
      const documentsWithStatements = files
        .filter(file => {
          // Include newly processed files
          if (file.processed && !file.isLoaded) return true
          // Include loaded files that have been modified or have new manual statements
          if (file.isLoaded && (file.isContentModified || allStatements.some(stmt => stmt.sourceFile === file.title && (stmt.isModified || !stmt.originalStatementId)))) return true
          return false
        })
        .map(file => ({
          id: file.originalDocumentId, // Include original ID for updates
          title: file.title,
          content: file.content,
          statements: allStatements.filter(stmt => {
            // Include all statements from this file if it's a new file
            if (!file.isLoaded) return stmt.sourceFile === file.title
            // For loaded files, include modified statements OR manually added statements (no originalStatementId)
            return stmt.sourceFile === file.title && (stmt.isModified || !stmt.originalStatementId)
          }).map(stmt => {
            // Include all statement fields including originalStatementId
            return { ...stmt }
          })
        }))
        // Only include documents that have statements to save
        .filter(doc => doc.statements.length > 0)

      if (documentsWithStatements.length === 0) {
        setSaveStatus('error')
        setSaveMessage('No new or modified data to save.')
        return
      }

      const response = await fetch('/api/dnanalyzer/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents: documentsWithStatements
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setSaveStatus('success')
        setSaveMessage('Data successfully saved to database!')
      } else {
        throw new Error(data.error || 'Unknown error occurred')
      }

    } catch (err) {
      console.error('Error saving to database:', err)
      setSaveStatus('error')
      setSaveMessage(err instanceof Error ? err.message : 'An error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  const handleExportToDNA = async () => {
    if (allStatements.length === 0) {
      setSaveStatus('error')
      setSaveMessage('No statements to export. Please analyze some text files first.')
      return
    }

    setExporting(true)
    setSaveStatus('idle')
    setSaveMessage('')

    try {
      // Group statements by source file, including both new and modified loaded data
      const documentsWithStatements = files
        .filter(file => {
          // Include newly processed files
          if (file.processed && !file.isLoaded) return true
          // Include loaded files that have been modified or have new manual statements
          if (file.isLoaded && (file.isContentModified || allStatements.some(stmt => stmt.sourceFile === file.title && (stmt.isModified || !stmt.originalStatementId)))) return true
          return false
        })
        .map(file => ({
          id: file.originalDocumentId, // Include original ID for updates
          title: file.title,
          content: file.content,
          statements: allStatements.filter(stmt => {
            // Include all statements from this file if it's a new file
            if (!file.isLoaded) return stmt.sourceFile === file.title
            // For loaded files, include modified statements OR manually added statements (no originalStatementId)
            return stmt.sourceFile === file.title && (stmt.isModified || !stmt.originalStatementId)
          }).map(stmt => ({
            // Include all statement fields including originalStatementId
            ...stmt
          }))
        }))
        // Only include documents that have statements to save
        .filter(doc => doc.statements.length > 0)

      if (documentsWithStatements.length === 0) {
        setSaveStatus('error')
        setSaveMessage('No new or modified data to export.')
        return
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const filename = `discourse-analysis-${timestamp}`

      const response = await fetch('/api/dnanalyzer/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents: documentsWithStatements,
          exportPath: filename
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      // Handle file download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename.endsWith('.dna') ? filename : `${filename}.dna`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSaveStatus('success')
      setSaveMessage(`Database exported successfully as ${filename}.dna`)

    } catch (err) {
      console.error('Error exporting to DNA file:', err)
      setSaveStatus('error')
      setSaveMessage(err instanceof Error ? err.message : 'An error occurred while exporting')
    } finally {
      setExporting(false)
    }
  }

  const handleLoadData = async () => {
    setLoadingData(true)
    setSaveStatus('idle')
    setSaveMessage('')

    try {
      const response = await fetch('/api/dnanalyzer/load', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.documents && data.statements) {
        // Convert loaded data to our format
        const loadedFiles: TextFile[] = data.documents.map((doc: any) => ({
          id: `loaded-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: doc.title,
          content: doc.content,
          processed: true,
          isLoaded: true, // Mark as loaded from DB
          isContentModified: false, // Initially not modified
          originalDocumentId: doc.id // Store original DB ID for updates
        }))

        const loadedStatements: Statement[] = data.statements.map((stmt: any) => ({
          statement: stmt.statement,
          concept: stmt.concept,
          actor: stmt.actor,
          organization: stmt.organization,
          agree: stmt.agree,
          sourceFile: stmt.sourceFile,
          startIndex: stmt.startIndex,
          endIndex: stmt.endIndex,
          isLoaded: true, // Mark as loaded from DB
          isModified: false, // Initially not modified
          originalStatementId: stmt.originalStatementId // Store original DB statement ID
        }))

        setFiles(prev => [...prev, ...loadedFiles])
        setAllStatements(prev => [...prev, ...loadedStatements])

        setSaveStatus('success')
        setSaveMessage(`Successfully loaded ${loadedStatements.length} statements from ${loadedFiles.length} documents`)
      } else {
        throw new Error(data.error || 'Unknown error occurred')
      }

    } catch (err) {
      console.error('Error loading data:', err)
      setSaveStatus('error')
      setSaveMessage(err instanceof Error ? err.message : 'An error occurred while loading data')
    } finally {
      setLoadingData(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Discourse Network Analyzer</h1>
              <p className="text-muted-foreground">Analyze discourse networks across multiple text files</p>
            </div>
            <Button
              onClick={handleLoadData}
              disabled={loadingData}
              variant="neutral"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {loadingData ? 'Loading...' : 'Load Data'}
            </Button>
          </div>
        </div>

        {/* Save/Export Section */}
        {allStatements.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                Save & Export Results
              </CardTitle>
              <CardDescription>
                Save your analysis results to a SQLite database compatible with DNA Analyzer tools
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <Button
                  onClick={handleSaveToDatabase}
                  disabled={saving || exporting}
                  variant="neutral"
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save to Database'}
                </Button>

                <Button
                  onClick={handleExportToDNA}
                  disabled={saving || exporting}
                  variant="neutral"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting...' : 'Export to .dna File'}
                </Button>

                <div className="flex-1">
                  {saveMessage && (
                    <div className={`flex items-center gap-2 text-sm ${
                      saveStatus === 'success'
                        ? 'text-green-600'
                        : saveStatus === 'error'
                        ? 'text-red-600'
                        : 'text-muted-foreground'
                    }`}>
                      {saveStatus === 'success' && <CheckCircle className="w-4 h-4" />}
                      {saveStatus === 'error' && <AlertCircle className="w-4 h-4" />}
                      <span>{saveMessage}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                <p><strong>Current Analysis:</strong> {allStatements.length} statements from {processedFilesCount} processed files</p>
              </div>
            </CardContent>
          </Card>
        )}

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
            statements={allStatements}
            onAnalyze={handleAnalyze}
            onUpdateContent={handleUpdateContent}
            onAddManualStatement={handleAddManualStatement}
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
