'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import TextFileList from './components/TextFileList'
import TextDisplay from './components/TextDisplay'
import ResultsSheet from './components/ResultsSheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Save, AlertCircle, CheckCircle, Settings, Database } from 'lucide-react'
import { AppsHeader } from '@/components/apps-header'
import AppsFooter from '@/components/apps-footer'
import { signIn } from 'next-auth/react'
import { FileText, LogIn } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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
  const { data: session, status } = useSession()

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

  // MySQL Configuration state
  const [mysqlConfig, setMysqlConfig] = useState({
    host: '',
    user: '',
    password: '',
    database: '',
    port: 3306
  })
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [hasConfig, setHasConfig] = useState(false)

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
    if (!session?.user?.email) {
      setSaveStatus('error')
      setSaveMessage('You must be logged in to save data')
      return
    }

    if (!hasConfig) {
      setSaveStatus('error')
      setSaveMessage('Please configure your MySQL database settings first')
      setIsConfigDialogOpen(true)
      return
    }

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
    if (!session?.user?.email) {
      setSaveStatus('error')
      setSaveMessage('You must be logged in to export data')
      return
    }

    if (!hasConfig) {
      setSaveStatus('error')
      setSaveMessage('Please configure your MySQL database settings first')
      setIsConfigDialogOpen(true)
      return
    }

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

  // Load user's MySQL configuration
  const loadMySQLConfig = async () => {
    if (!session?.user?.email) return

    try {
      const response = await fetch('/api/dnanalyzer/mysql-config')
      if (response.ok) {
        const data = await response.json()
        setMysqlConfig(data.mysqlConfig)
        setHasConfig(true)
      } else if (response.status === 404) {
        // No config found, user needs to set it up
        setHasConfig(false)
      }
    } catch (error) {
      console.error('Error loading MySQL config:', error)
    }
  }

  // Save user's MySQL configuration
  const saveMySQLConfig = async () => {
    if (!session?.user?.email) return

    setSavingConfig(true)
    try {
      const response = await fetch('/api/dnanalyzer/mysql-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mysqlConfig }),
      })

      if (response.ok) {
        setHasConfig(true)
        setIsConfigDialogOpen(false)
        setSaveStatus('success')
        setSaveMessage('MySQL configuration saved successfully!')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save configuration')
      }
    } catch (error: any) {
      setSaveStatus('error')
      setSaveMessage(error.message || 'Failed to save MySQL configuration')
    } finally {
      setSavingConfig(false)
    }
  }

  // Load MySQL config when user is authenticated
  useEffect(() => {
    if (session?.user?.email) {
      loadMySQLConfig()
    }
  }, [session])

  const handleLoadData = async () => {
    if (!session?.user?.email) {
      setSaveStatus('error')
      setSaveMessage('You must be logged in to load data')
      return
    }

    if (!hasConfig) {
      setSaveStatus('error')
      setSaveMessage('Please configure your MySQL database settings first')
      setIsConfigDialogOpen(true)
      return
    }

    setLoadingData(true)
    setSaveStatus('idle')
    setSaveMessage('')

    try {
      const response = await fetch('/api/dnanalyzer/load', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail: session.user.email }),
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

  // Show loading skeleton when authentication status is loading
  if (status === 'loading') {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="z-50">
          <AppsHeader />
        </div>
        <div className="flex-1 flex flex-col justify-center items-center max-w-6xl mx-auto w-full">
          <div className="animate-pulse space-y-4 w-full max-w-md">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
        <div className="flex-none mb-1">
          <AppsFooter />
        </div>
      </div>
    )
  }

  // Show login screen when not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="z-50">
          <AppsHeader />
        </div>
        <div className="flex-1 flex flex-col justify-center items-center max-w-6xl mx-auto w-full">
          <div className="w-full relative overflow-hidden min-h-full">
            {/* Full-width background */}
            <div className="absolute inset-0"></div>

            {/* Centered content */}
            <div className="relative z-10 flex-1 w-full max-w-sm mx-auto flex flex-col">
              {/* Header Space */}
              <div className="p-3 w-full flex-shrink-0"></div>

              {/* Login Content */}
              <div className="flex-1 bg-white rounded-t-3xl p-4 flex flex-col items-center justify-center space-y-4 overflow-y-auto">
                <div className="text-center space-y-3 max-w-md">
                  <FileText className="w-12 h-12 text-blue-500 mx-auto" />
                  <h1 className="text-xl font-bold text-gray-900">
                    Discourse Network Analyzer
                  </h1>
                  <p className="text-gray-600 text-sm">
                    Please sign in with your Google account to access discourse analysis tools and manage your own MySQL database.
                  </p>
                </div>

                <div className="w-full max-w-sm flex flex-col items-center space-y-2">
                  <Button
                    onClick={() => signIn('google')}
                    className="w-80 h-10 text-base font-medium"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign in with Google
                  </Button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 text-center mb-1">
                <span className="text-xs text-white/70">
                  © {new Date().getFullYear()}
                </span>
                <button
                  onClick={() => window.open('https://x.com/alhrkn')}
                  className="text-xs text-white/70 hover:text-white cursor-pointer transition-colors ml-1"
                >
                  alhrkn
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-none mb-1">
          <AppsFooter />
        </div>
      </div>
    )
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
            <div className="flex items-center gap-2">
              <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="neutral"
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Database Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      MySQL Database Configuration
                    </DialogTitle>
                    <DialogDescription>
                      Configure your MySQL database connection for storing discourse analysis data.
                      Each user has their own separate database.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="host">Host</Label>
                        <Input
                          id="host"
                          placeholder="localhost"
                          value={mysqlConfig.host}
                          onChange={(e) => setMysqlConfig(prev => ({ ...prev, host: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input
                          id="port"
                          type="number"
                          placeholder="3306"
                          value={mysqlConfig.port}
                          onChange={(e) => setMysqlConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 3306 }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="database">Database Name</Label>
                      <Input
                        id="database"
                        placeholder="dnanalyzer"
                        value={mysqlConfig.database}
                        onChange={(e) => setMysqlConfig(prev => ({ ...prev, database: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user">Username</Label>
                      <Input
                        id="user"
                        placeholder="root"
                        value={mysqlConfig.user}
                        onChange={(e) => setMysqlConfig(prev => ({ ...prev, user: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter password"
                        value={mysqlConfig.password}
                        onChange={(e) => setMysqlConfig(prev => ({ ...prev, password: e.target.value }))}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        variant="neutral"
                        onClick={() => setIsConfigDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={saveMySQLConfig}
                        disabled={savingConfig}
                        className="flex items-center gap-2"
                      >
                        {savingConfig ? 'Testing...' : 'Save & Test Connection'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                onClick={handleLoadData}
                disabled={loadingData || !hasConfig}
                variant="neutral"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {loadingData ? 'Loading...' : 'Load Data'}
              </Button>
            </div>
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
                  disabled={saving || exporting || !hasConfig}
                  variant="neutral"
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save to Database'}
                </Button>

                <Button
                  onClick={handleExportToDNA}
                  disabled={saving || exporting || !hasConfig}
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
