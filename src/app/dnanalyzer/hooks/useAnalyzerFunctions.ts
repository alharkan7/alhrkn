import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export interface TextFile {
    id: string
    title: string
    content: string
    processed?: boolean
    isLoaded?: boolean
    isContentModified?: boolean
    originalDocumentId?: number
}

export interface Statement {
    statement: string
    concept: string
    actor: string
    organization: string
    agree: boolean
    sourceFile?: string
    startIndex?: number
    endIndex?: number
    isLoaded?: boolean
    isModified?: boolean
    originalStatementId?: number
}

interface MySQLConfig {
    host: string
    user: string
    password: string
    database: string
    port: number
}

export function useAnalyzerFunctions() {
    const { data: session, status } = useSession()
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
    const [mysqlConfig, setMysqlConfig] = useState<MySQLConfig>({
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
    const processedFilesCount = files.filter(file => file.processed).length

    const handleFileSelect = (fileId: string) => {
        setSelectedFileId(fileId)
        setError('')
    }

    const handleAddFile = (title: string, content: string) => {
        const newFile: TextFile = {
            id: Date.now().toString(),
            title,
            content,
            processed: false,
            isLoaded: false,
            isContentModified: false
        }
        setFiles(prev => [...prev, newFile])
    }

    const handleDeleteFile = async (fileId: string) => {
        const fileToDelete = files.find(file => file.id === fileId)
        if (!fileToDelete) return

        try {
            if (fileToDelete.originalDocumentId) {
                const response = await fetch('/api/dnanalyzer/delete', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ documentId: fileToDelete.originalDocumentId }),
                })
                if (!response.ok) throw new Error('Failed to delete document from database')
            }

            setFiles(prev => prev.filter(file => file.id !== fileId))
            setAllStatements(prev => prev.filter(statement =>
                statement.sourceFile !== fileToDelete.title
            ))

            if (selectedFileId === fileId) setSelectedFileId(null)
            if (filteredFileId === fileId) setFilteredFileId(null)
        } catch (error) {
            console.error('Error deleting file:', error)
            setError('Failed to delete the document. Please try again.')
        }
    }

    const autoSaveStatements = async (
        showSuccessMessage = false,
        newStatements?: Statement[],
        processedFileIds?: string[],
        showErrorOnSkip = false
    ) => {
        if (!session?.user?.email || !hasConfig) {
            if (showErrorOnSkip) {
                setSaveStatus('error')
                setSaveMessage('Auto-save skipped: Please log in and configure your database settings.')
                setTimeout(() => setSaveStatus('idle'), 3000)
            }
            return
        }

        const statementsToSave = newStatements || allStatements
        if (statementsToSave.length === 0) return

        try {
            const documentsWithStatements = files
                .filter(file => {
                    if ((processedFileIds && processedFileIds.includes(file.id)) || (file.processed && !file.isLoaded)) {
                        return true
                    }
                    if (file.isLoaded && (file.isContentModified || statementsToSave.some(stmt => stmt.sourceFile === file.title && (stmt.isModified || !stmt.originalStatementId)))) {
                        return true
                    }
                    return false
                })
                .map(file => ({
                    id: file.originalDocumentId,
                    title: file.title,
                    content: file.content,
                    statements: statementsToSave.filter(stmt => {
                        if (!file.isLoaded) return stmt.sourceFile === file.title
                        return stmt.sourceFile === file.title && (stmt.isModified || !stmt.originalStatementId)
                    }).map(stmt => ({ ...stmt }))
                }))
                .filter(doc => doc.statements.length > 0)

            if (documentsWithStatements.length === 0) return

            const response = await fetch('/api/dnanalyzer/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documents: documentsWithStatements }),
            })

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            const data = await response.json()

            if (data.success) {
                if (showSuccessMessage) {
                    setSaveStatus('success')
                    setSaveMessage('Data successfully saved to database!')
                    setTimeout(() => setSaveStatus('idle'), 3000)
                }
                setAllStatements(prev => prev.map(stmt => ({ ...stmt, isModified: false })))
            } else {
                throw new Error(data.error || 'Unknown error occurred')
            }
        } catch (err) {
            console.error('Auto-save failed:', err)
        }
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            })

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            const data = await response.json()
            if (data.error) throw new Error(data.error)

            const newStatements = (data.statements || []).map((stmt: Statement) => ({
                ...stmt,
                sourceFile: selectedFile.title,
                startIndex: stmt.startIndex,
                endIndex: stmt.endIndex,
                isLoaded: false,
                isModified: false
            }))

            setAllStatements(prev => [...prev, ...newStatements])
            setFiles(prev => prev.map(file =>
                file.id === selectedFile.id ? { ...file, processed: true } : file
            ))

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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: file.content }),
                })

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
                const data = await response.json()
                if (data.error) throw new Error(data.error)

                const newStatements = (data.statements || []).map((stmt: Statement) => ({
                    ...stmt,
                    sourceFile: file.title,
                    startIndex: stmt.startIndex,
                    endIndex: stmt.endIndex,
                    isLoaded: false,
                    isModified: false
                }))

                allNewStatements.push(...newStatements)
                processedFileIds.push(file.id)
                processedCount++
            } catch (err) {
                console.error(`Error processing file "${file.title}":`, err)
                errorCount++
            }
        }

        setAllStatements(prev => [...prev, ...allNewStatements])
        setFiles(prev => prev.map(f =>
            processedFileIds.includes(f.id) ? { ...f, processed: true } : f
        ))

        if (errorCount === 0) {
            setSaveStatus('success')
            setSaveMessage(`Successfully analyzed ${processedCount} file(s)!`)
            await autoSaveStatements(true, allNewStatements, processedFileIds, true)
        } else if (processedCount > 0) {
            setSaveStatus('error')
            setSaveMessage(`Analyzed ${processedCount} file(s), but ${errorCount} failed.`)
            await autoSaveStatements(true, allNewStatements, processedFileIds, true)
        } else {
            setError('Failed to analyze all files. Please check your API configuration.')
        }

        setTimeout(() => setSaveStatus('idle'), 3000)
        setLoading(false)
    }

    const handleUpdateStatement = async (index: number, updatedStatement: Statement) => {
        const currentStatement = allStatements[index]
        const file = files.find(f => f.title === currentStatement.sourceFile)

        setAllStatements(prev => prev.map((stmt, i) => i === index ? updatedStatement : stmt))

        if (currentStatement && file?.id) {
            await autoSaveStatements(true, [updatedStatement], [file.id])
        } else {
            await autoSaveStatements(true)
        }
    }

    const handleDeleteStatement = async (statementIndex: number) => {
        const statementToDelete = allStatements[statementIndex]
        if (!statementToDelete) return

        try {
            if (statementToDelete.isLoaded && statementToDelete.originalStatementId) {
                const response = await fetch('/api/dnanalyzer/delete-statement', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ statementId: statementToDelete.originalStatementId }),
                })
                if (!response.ok) throw new Error('Failed to delete statement from database')
            }

            setAllStatements(prev => prev.filter((_, index) => index !== statementIndex))
        } catch (error) {
            console.error('Error deleting statement:', error)
            setError('Failed to delete statement')
        }
    }

    const handleAddManualStatement = async (
        fileId: string,
        statementData: Omit<Statement, 'sourceFile' | 'isLoaded' | 'isModified' | 'originalStatementId'>
    ) => {
        const file = files.find(f => f.id === fileId)
        if (!file) return

        const newStatement: Statement = {
            ...statementData,
            sourceFile: file.title,
            isLoaded: false,
            isModified: false
        }

        setAllStatements(prev => [...prev, newStatement])
        await autoSaveStatements(true, [newStatement], [fileId])
    }

    const handleToggleFilteredResults = (fileId: string | null) => {
        if (filteredFileId === fileId) {
            setFilteredFileId(null)
            setShowResults(!showResults)
        } else {
            setFilteredFileId(fileId)
            setShowResults(true)
        }
    }

    const handleUpdateContent = async (fileId: string, newContent: string) => {
        setFiles(prev => prev.map(file =>
            file.id === fileId ? { ...file, content: newContent, isContentModified: true } : file
        ))

        const file = files.find(f => f.id === fileId)
        if (file && file.isLoaded) {
            try {
                const response = await fetch('/api/dnanalyzer/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        documents: [{
                            id: file.originalDocumentId,
                            title: file.title,
                            content: newContent,
                            statements: []
                        }]
                    }),
                })

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
                const data = await response.json()
                if (!data.success) throw new Error(data.error || 'Unknown error occurred')

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
                setHasConfig(false)
                setHasApiKey(false)
                setGoogleApiKey('')
            }
        } catch (error) {
            console.error('Error loading user config:', error)
        }
    }

    const saveUserConfig = async () => {
        if (!session?.user?.email) return

        setSavingConfig(true)
        try {
            const requestBody: any = {}

            if (mysqlConfig.host && mysqlConfig.user && mysqlConfig.password && mysqlConfig.database) {
                requestBody.mysqlConfig = mysqlConfig
            }

            if (googleApiKey.trim()) {
                requestBody.googleApiKey = googleApiKey.trim()
            }

            if (Object.keys(requestBody).length === 0) {
                throw new Error('Please provide either MySQL configuration or Google API key')
            }

            const response = await fetch('/api/dnanalyzer/mysql-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            })

            if (response.ok) {
                if (requestBody.mysqlConfig) setHasConfig(true)
                if (requestBody.googleApiKey) setHasApiKey(true)
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userEmail: session.user.email }),
            })

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            const data = await response.json()

            if (data.success && data.documents && data.statements) {
                const loadedFiles: TextFile[] = data.documents.map((doc: any) => ({
                    id: `loaded-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    title: doc.title,
                    content: doc.content,
                    processed: true,
                    isLoaded: true,
                    isContentModified: false,
                    originalDocumentId: doc.id
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
                    isLoaded: true,
                    isModified: false,
                    originalStatementId: stmt.originalStatementId
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

    // Load user config when authenticated
    useEffect(() => {
        if (session?.user?.email) {
            loadUserConfig()
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

    return {
        // Session and status
        session,
        status,

        // State
        files,
        selectedFileId,
        selectedFile,
        allStatements,
        loading,
        error,
        saving,
        saveStatus,
        saveMessage,
        loadingData,
        showResults,
        filteredFileId,
        processedFilesCount,

        // Configuration
        mysqlConfig,
        setMysqlConfig,
        googleApiKey,
        setGoogleApiKey,
        isConfigDialogOpen,
        setIsConfigDialogOpen,
        savingConfig,
        hasConfig,
        hasApiKey,
        showMySQLPassword,
        setShowMySQLPassword,
        showApiKey,
        setShowApiKey,

        // Handlers
        handleFileSelect,
        handleAddFile,
        handleDeleteFile,
        handleAnalyze,
        handleBulkAnalyze,
        handleUpdateStatement,
        handleDeleteStatement,
        handleAddManualStatement,
        handleToggleFilteredResults,
        handleUpdateContent,
        handleSaveToDatabase,
        handleLoadData,
        saveUserConfig,
        setShowResults,
    }
}
