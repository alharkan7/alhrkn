'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import TextFileList from './components/TextFileList'
import TextDisplay from './components/TextDisplay'
import ResultsSheet from './components/ResultsSheet'
import { Button } from '@/components/ui/button'
import { Download, Save, Settings, Eye, EyeOff } from 'lucide-react'
import { AppsHeader } from '@/components/apps-header'
import AppsFooter from '@/components/apps-footer'
import { signIn } from 'next-auth/react'
import { UserMenu } from '@/components/user-menu'
import { Plus, LogIn, FileText } from 'lucide-react'
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
  const textFileListRef = useRef<any>(null)
  const hasAutoLoadedRef = useRef(false)

  const [files, setFiles] = useState<TextFile[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [allStatements, setAllStatements] = useState<Statement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [loadingData, setLoadingData] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [filteredFileId, setFilteredFileId] = useState<string | null>(null)

  // Configuration state
  const [mysqlConfig, setMysqlConfig] = useState({
    host: '',
    user: '',
    password: '',
    database: '',
    port: 3306
  })
  const [googleApiKey, setGoogleApiKey] = useState('')
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [hasConfig, setHasConfig] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [showMySQLPassword, setShowMySQLPassword] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)

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

    if (!hasApiKey) {
      setError('Please configure your Google Generative AI API key in settings first.')
      setIsConfigDialogOpen(true)
      return
    }

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

      // Auto-save the new statements
      await autoSaveStatements(true, newStatements, [selectedFile.id])

    } catch (err) {
      console.error('Error processing text:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while processing the text')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkAnalyze = async () => {
    if (!hasApiKey) {
      setError('Please configure your Google Generative AI API key in settings first.')
      setIsConfigDialogOpen(true)
      return
    }

    const unprocessedFiles = files.filter(file => !file.processed)

    if (unprocessedFiles.length === 0) {
      setError('All files have already been processed.')
      return
    }

    setLoading(true)
    setError('')

    let processedCount = 0
    let errorCount = 0
    const allNewStatements: Statement[] = []
    const processedFileIds: string[] = []

    for (const file of unprocessedFiles) {
      try {
        const response = await fetch('/api/dnanalyzer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: file.content }),
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
          sourceFile: file.title,
          startIndex: stmt.startIndex,
          endIndex: stmt.endIndex,
          isLoaded: false,
          isModified: false
        }))

        // Collect new statements
        allNewStatements.push(...newStatements)
        processedFileIds.push(file.id)

        processedCount++

      } catch (err) {
        console.error(`Error processing file "${file.title}":`, err)
        errorCount++
      }
    }

    // Update state with all new statements and mark files as processed
    setAllStatements(prev => [...prev, ...allNewStatements])
    setFiles(prev => prev.map(f =>
      processedFileIds.includes(f.id)
        ? { ...f, processed: true }
        : f
    ))

    if (errorCount === 0) {
      setSaveStatus('success')
      setSaveMessage(`Successfully analyzed ${processedCount} file(s)!`)
      // Auto-save the new statements
      await autoSaveStatements(true, allNewStatements, processedFileIds, true)
    } else if (processedCount > 0) {
      setSaveStatus('error')
      setSaveMessage(`Analyzed ${processedCount} file(s), but ${errorCount} failed.`)
      // Still auto-save successfully analyzed files
      await autoSaveStatements(true, allNewStatements, processedFileIds, true)
    } else {
      setError('Failed to analyze all files. Please check your API configuration.')
    }

    setTimeout(() => setSaveStatus('idle'), 3000)
    setLoading(false)
  }

  const handleUpdateStatement = async (index: number, updatedStatement: Statement) => {
    // Get the current statement to find its file
    const currentStatement = allStatements[index]
    const file = files.find(f => f.title === currentStatement.sourceFile)

    // Update the statement in state
    setAllStatements(prev => prev.map((stmt, i) => i === index ? updatedStatement : stmt))

    // Auto-save the updated statement
    if (currentStatement && file?.id) {
      await autoSaveStatements(true, [updatedStatement], [file.id])
    } else {
      await autoSaveStatements(true)
    }
  }

  const handleAddManualStatement = async (fileId: string, statementData: Omit<Statement, 'sourceFile' | 'isLoaded' | 'isModified' | 'originalStatementId'>) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return

    const newStatement: Statement = {
      ...statementData,
      sourceFile: file.title,
      isLoaded: false,
      isModified: false
    }

    setAllStatements(prev => [...prev, newStatement])

    // Auto-save the new manual statement
    await autoSaveStatements(true, [newStatement], [fileId])
  }

  const processedFilesCount = files.filter(file => file.processed).length

  const handleToggleFilteredResults = (fileId: string | null) => {
    if (filteredFileId === fileId) {
      // If clicking the same file, toggle off filtering
      setFilteredFileId(null)
      setShowResults(!showResults)
    } else {
      // If clicking a different file or first time, show filtered results
      setFilteredFileId(fileId)
      setShowResults(true)
    }
  }

  // Auto-save statements to database
  const autoSaveStatements = async (showSuccessMessage = false, newStatements?: Statement[], processedFileIds?: string[], showErrorOnSkip = false) => {
    if (!session?.user?.email || !hasConfig) {
      if (showErrorOnSkip) {
        setSaveStatus('error')
        setSaveMessage('Auto-save skipped: Please log in and configure your database settings.')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
      return // Skip auto-save if not authenticated or configured
    }

    // Use provided statements or fall back to all statements
    const statementsToSave = newStatements || allStatements

    if (statementsToSave.length === 0) {
      return // No statements to save
    }

    try {
      // Group statements by source file, including both new and modified loaded data
      const documentsWithStatements = files
        .filter(file => {
          // Include newly processed files (either from the processedFileIds param or from state)
          if ((processedFileIds && processedFileIds.includes(file.id)) || (file.processed && !file.isLoaded)) {
            return true
          }
          // Include loaded files that have been modified or have new manual statements
          if (file.isLoaded && (file.isContentModified || statementsToSave.some(stmt => stmt.sourceFile === file.title && (stmt.isModified || !stmt.originalStatementId)))) {
            return true
          }
          return false
        })
        .map(file => ({
          id: file.originalDocumentId, // Include original ID for updates
          title: file.title,
          content: file.content,
          statements: statementsToSave.filter(stmt => {
            // Include all statements from this file if it's a new file
            if (!file.isLoaded) {
              return stmt.sourceFile === file.title
            }
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
        return // No new or modified data to save
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
        if (showSuccessMessage) {
          setSaveStatus('success')
          setSaveMessage('Data successfully saved to database!')
          setTimeout(() => setSaveStatus('idle'), 3000)
        }
        // Mark statements as saved (no longer modified)
        setAllStatements(prev => prev.map(stmt => ({
          ...stmt,
          isModified: false
        })))
      } else {
        throw new Error(data.error || 'Unknown error occurred')
      }

    } catch (err) {
      console.error('Auto-save failed:', err)
      // Don't show error message to user for auto-save failures to avoid disrupting workflow
    }
  }

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
      await autoSaveStatements(true)
    } catch (err) {
      console.error('Error saving to database:', err)
      setSaveStatus('error')
      setSaveMessage(err instanceof Error ? err.message : 'An error occurred while saving')
    } finally {
      setSaving(false)
    }
  }


  // Load user's configuration
  const loadUserConfig = async () => {
    if (!session?.user?.email) return

    try {
      const response = await fetch('/api/dnanalyzer/mysql-config')
      if (response.ok) {
        const data = await response.json()
        if (data.mysqlConfig) {
          setMysqlConfig(data.mysqlConfig)
          setHasConfig(true)
        } else {
          setHasConfig(false)
        }
        if (data.googleApiKey) {
          setGoogleApiKey(data.googleApiKey)
          setHasApiKey(true)
        } else {
          setGoogleApiKey('')
          setHasApiKey(false)
        }
      } else if (response.status === 404) {
        // No config found, user needs to set it up
        setHasConfig(false)
        setHasApiKey(false)
        setGoogleApiKey('')
      }
    } catch (error) {
      console.error('Error loading user config:', error)
    }
  }

  // Save user's configuration
  const saveUserConfig = async () => {
    if (!session?.user?.email) return

    setSavingConfig(true)
    try {
      const requestBody: any = {}

      // Include MySQL config if provided
      if (mysqlConfig.host && mysqlConfig.user && mysqlConfig.password && mysqlConfig.database) {
        requestBody.mysqlConfig = mysqlConfig
      }

      // Include Google API key if provided
      if (googleApiKey.trim()) {
        requestBody.googleApiKey = googleApiKey.trim()
      }

      // At least one must be provided
      if (Object.keys(requestBody).length === 0) {
        throw new Error('Please provide either MySQL configuration or Google API key')
      }

      const response = await fetch('/api/dnanalyzer/mysql-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        if (requestBody.mysqlConfig) {
          setHasConfig(true)
        }
        if (requestBody.googleApiKey) {
          setHasApiKey(true)
        }
        setIsConfigDialogOpen(false)
        setSaveStatus('success')
        setSaveMessage('Configuration saved successfully!')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save configuration')
      }
    } catch (error: any) {
      setSaveStatus('error')
      setSaveMessage(error.message || 'Failed to save configuration')
    } finally {
      setSavingConfig(false)
    }
  }

  // Load user config when authenticated
  useEffect(() => {
    if (session?.user?.email) {
      loadUserConfig()
      // Reset auto-load flag when session changes
      hasAutoLoadedRef.current = false
    }
  }, [session])

  // Auto-load data when config is available and user is authenticated
  useEffect(() => {
    if (session?.user?.email && hasConfig && !hasAutoLoadedRef.current) {
      hasAutoLoadedRef.current = true
      handleLoadData()
    }
  }, [session?.user?.email, hasConfig])

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
              <div className="flex-1 bg-white rounded-3xl p-4 flex flex-col items-center justify-center space-y-4 overflow-y-auto">
                <div className="text-center space-y-3 max-w-md">
                  <FileText className="w-12 h-12 text-blue-500 mx-auto" />
                  <h1 className="text-xl font-bold text-gray-900">
                    Automatic Discourse Identifier
                  </h1>
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

                <p className="text-gray-600 text-sm text-center">
                  Sign in to access the tools and manage your DNA (Discourse Network Analyzer) database.
                </p>
              </div>

              {/* Footer */}
              {/* <div className="flex-shrink-0 text-center mb-1">
                <span className="text-xs text-white/70">
                  © {new Date().getFullYear()}
                </span>
                <button
                  onClick={() => window.open('https://x.com/alhrkn')}
                  className="text-xs text-white/70 hover:text-white cursor-pointer transition-colors ml-1"
                >
                  alhrkn
                </button>
              </div> */}
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
              <h1 className="text-3xl font-bold text-foreground mb-2">Automatic Discourse Identifier</h1>
              <p className="text-muted-foreground">Identify Discourse Data using AI for Discourse Network Analysis</p>
            </div>
            <UserMenu />
          </div>

          {/* Button Bar */}
          <div className="flex items-center gap-1 mt-4">
            <Button
              onClick={handleSaveToDatabase}
              disabled={saving || !hasConfig}
              variant="neutral"
              className="flex items-center gap-0 sm:gap-2"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">
                {saving ? 'Saving...' : 'Save'}
              </span>
            </Button>

            <Button
              onClick={handleLoadData}
              disabled={loadingData || !hasConfig}
              variant="neutral"
              className="flex items-center gap-0 sm:gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {loadingData ? 'Loading...' : 'Load'}
              </span>
            </Button>

            <Button
              onClick={() => textFileListRef.current?.triggerAddFile()}
              variant="neutral"
              className="flex items-center gap-0 sm:gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>

            <Button
              onClick={() => setShowResults(!showResults)}
              variant="neutral"
              className="flex items-center gap-0 sm:gap-2"
            >
              {showResults ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {showResults ? 'Hide' : 'Data'}
              </span>
            </Button>

            <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="neutral"
                  className="flex items-center gap-0 sm:gap-2 ml-auto"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Configuration Settings
                    </DialogTitle>
                    <DialogDescription>
                      Configure your MySQL database connection and Google Generative AI API key for discourse analysis.
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
                    <div className="relative">
                      <Input
                        id="password"
                        type={showMySQLPassword ? "text" : "password"}
                        placeholder="Enter password"
                        value={mysqlConfig.password}
                        onChange={(e) => setMysqlConfig(prev => ({ ...prev, password: e.target.value }))}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowMySQLPassword(!showMySQLPassword)}
                      >
                        {showMySQLPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="googleApiKey">Google Generative AI API Key</Label>
                    <div className="relative">
                      <Input
                        id="googleApiKey"
                        type={showApiKey ? "text" : "password"}
                        placeholder="Enter your Google API key"
                        value={googleApiKey}
                        onChange={(e) => setGoogleApiKey(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Get your API key from{' '}
                      <a
                        href="https://aistudio.google.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Google AI Studio
                      </a>
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="neutral"
                      onClick={() => setIsConfigDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={saveUserConfig}
                      disabled={savingConfig}
                      className="flex items-center gap-2"
                    >
                      {savingConfig ? 'Saving...' : 'Save Configuration'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>


        {/* Text Files List - Top */}
        <div className="mb-6">
          <TextFileList
            ref={textFileListRef}
            files={files}
            selectedFileId={selectedFileId}
            onFileSelect={handleFileSelect}
            onAddFile={handleAddFile}
            onBulkAnalyze={handleBulkAnalyze}
            loading={loading}
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
            onUpdateStatement={handleUpdateStatement}
            onToggleFilteredResults={handleToggleFilteredResults}
            isFilteredForFile={filteredFileId === selectedFileId}
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
        open={showResults}
        onOpenChange={setShowResults}
        filterSourceFile={filteredFileId ? files.find(f => f.id === filteredFileId)?.title || null : null}
      />

      {/* Footer */}
      <div className="flex-none mb-1">
        <AppsFooter />
      </div>
    </div>
  )
}
