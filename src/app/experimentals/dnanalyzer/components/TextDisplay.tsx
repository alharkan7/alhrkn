'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Check, X } from 'lucide-react'

interface TextFile {
  id: string
  title: string
  content: string
  processed?: boolean
  isLoaded?: boolean
  isContentModified?: boolean
  originalDocumentId?: number
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
  isLoaded?: boolean
  isModified?: boolean
  originalStatementId?: number
}

interface TextDisplayProps {
  selectedFile: TextFile | null
  statements: Statement[]
  onAnalyze: (text: string) => void
  onUpdateContent: (fileId: string, newContent: string) => void
  onAddManualStatement: (fileId: string, statement: Omit<Statement, 'sourceFile' | 'isLoaded' | 'isModified' | 'originalStatementId'>) => void
  loading: boolean
  error: string
}

interface HighlightedTextProps {
  text: string
  statements: Statement[]
  selectionRange?: { start: number; end: number } | null
}

function HighlightedText({ text, statements, selectionRange }: HighlightedTextProps) {
  // Filter statements that belong to this file and have valid indices
  const fileStatements = statements.filter(stmt => {
    const hasValidIndices = stmt.startIndex !== undefined && stmt.endIndex !== undefined && stmt.startIndex >= 0 && stmt.endIndex > stmt.startIndex
    return hasValidIndices
  })

  // Combine statements and selection range
  const allHighlights: Array<{
    start: number
    end: number
    type: 'statement' | 'selection'
    data?: Statement
  }> = []

  // Add statements
  fileStatements.forEach(stmt => {
    if (stmt.startIndex !== undefined && stmt.endIndex !== undefined) {
      allHighlights.push({
        start: stmt.startIndex,
        end: stmt.endIndex,
        type: 'statement',
        data: stmt
      })
    }
  })

  // Add selection range if it exists
  if (selectionRange) {
    allHighlights.push({
      start: selectionRange.start,
      end: selectionRange.end,
      type: 'selection'
    })
  }

  if (allHighlights.length === 0) {
    return <div className="whitespace-pre-wrap font-mono text-sm">{text}</div>
  }

  // Sort by start index
  allHighlights.sort((a, b) => a.start - b.start)

  const parts: React.JSX.Element[] = []
  let lastIndex = 0

  allHighlights.forEach((highlight, index) => {
    const start = highlight.start
    const end = highlight.end

    // Add text before the highlight
    if (start > lastIndex) {
      parts.push(
        <span key={`text-${index}`} className="whitespace-pre-wrap">
          {text.substring(lastIndex, start)}
        </span>
      )
    }

    // Add the highlighted content
    const highlightedText = text.substring(start, end)

    if (highlight.type === 'selection') {
      // Selection highlight
      parts.push(
        <span
          key={`selection-${index}`}
          className="bg-blue-200 px-1 rounded"
        >
          {highlightedText}
        </span>
      )
    } else if (highlight.type === 'statement' && highlight.data) {
      // Statement highlight
      const stmt = highlight.data
      parts.push(
        <span
          key={`highlight-${index}`}
          className="bg-yellow-200 px-1 rounded cursor-pointer relative group"
          title={`${stmt.actor} (${stmt.organization || 'No organization'}): ${stmt.agree ? 'Agrees' : 'Disagrees'} about ${stmt.concept}`}
        >
          {highlightedText}
          <Badge
            variant="neutral"
            className={`absolute -top-6 left-0 text-xs opacity-0 group-hover:opacity-100 transition-opacity ${
              stmt.agree ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {stmt.actor}
          </Badge>
        </span>
      )
    }

    lastIndex = end
  })

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key="remaining" className="whitespace-pre-wrap">
        {text.substring(lastIndex)}
      </span>
    )
  }

  return <div className="whitespace-pre-wrap font-mono text-sm relative">{parts}</div>
}

export default function TextDisplay({ selectedFile, statements, onAnalyze, onUpdateContent, onAddManualStatement, loading, error }: TextDisplayProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null)
  const [showManualDialog, setShowManualDialog] = useState(false)
  const [manualStatement, setManualStatement] = useState('')
  const [manualConcept, setManualConcept] = useState('')
  const [manualActor, setManualActor] = useState('')
  const [manualOrganization, setManualOrganization] = useState('')
  const [manualAgree, setManualAgree] = useState(false)
  const textContainerRef = useRef<HTMLDivElement>(null)

  const handleAnalyze = () => {
    if (selectedFile) {
      onAnalyze(selectedFile.content)
    }
  }

  const handleEditClick = () => {
    if (selectedFile) {
      if (!isEditing) {
        // Start editing
        setEditedContent(selectedFile.content)
        setIsEditing(true)
      } else {
        // Save changes
        onUpdateContent(selectedFile.id, editedContent)
        setIsEditing(false)
      }
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedContent('')
  }

  const handleTextDoubleClick = () => {
    if (selectedFile && !isEditing) {
      setEditedContent(selectedFile.content)
      setIsEditing(true)
    }
  }

  const handleTextSelection = () => {
    if (isEditing || !selectedFile || !textContainerRef.current) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const selectedTextContent = selection.toString().trim()
    if (!selectedTextContent) return

    // More reliable approach: find the selected text in the content string
    const content = selectedFile.content
    const selectedTextNormalized = selectedTextContent.replace(/\s+/g, ' ').trim()

    // Try to find the exact selected text in the content
    let startIndex = content.indexOf(selectedTextContent)

    // If exact match fails, try with normalized whitespace
    if (startIndex === -1) {
      const contentNormalized = content.replace(/\s+/g, ' ')
      const selectedNormalized = selectedTextContent.replace(/\s+/g, ' ')
      startIndex = contentNormalized.indexOf(selectedNormalized)
    }

    // If still not found, try a more flexible search
    if (startIndex === -1) {
      // Look for the first few words of the selection
      const firstWords = selectedTextContent.split(/\s+/).slice(0, 3).join(' ')
      startIndex = content.indexOf(firstWords)
    }

    if (startIndex !== -1) {
      const endIndex = startIndex + selectedTextContent.length
      const selectionRange = { start: startIndex, end: endIndex }

      console.log('Selected text:', selectedTextContent)
      console.log('Found at indices:', startIndex, 'to', endIndex)
      console.log('Corresponding text:', content.substring(startIndex, endIndex))

      setSelectedText(selectedTextContent)
      setSelectionRange(selectionRange)
      setManualStatement(selectedTextContent)
      setManualConcept('')
      setManualActor('')
      setManualOrganization('')
      setManualAgree(false)
      setShowManualDialog(true)
    } else {
      console.warn('Could not find selected text in content')
    }
  }

  const handleAddManualStatement = () => {
    if (!selectedFile || !selectionRange) {
      return
    }

    // Basic validation - at least statement and actor should be filled
    if (!manualStatement.trim() || !manualActor.trim()) {
      return // Don't close dialog if required fields are empty
    }

    const newStatement: Omit<Statement, 'sourceFile' | 'isLoaded' | 'isModified' | 'originalStatementId'> = {
      statement: manualStatement.trim(),
      concept: manualConcept.trim(),
      actor: manualActor.trim(),
      organization: manualOrganization.trim(),
      agree: manualAgree,
      startIndex: selectionRange.start,
      endIndex: selectionRange.end
    }

    try {
      onAddManualStatement(selectedFile.id, newStatement)

      // Close dialog and reset state
      setShowManualDialog(false)
      setSelectedText('')
      setSelectionRange(null)

      // Reset form
      setManualStatement('')
      setManualConcept('')
      setManualActor('')
      setManualOrganization('')
      setManualAgree(false)
    } catch (error) {
      console.error('Error adding manual statement:', error)
      // Keep dialog open on error
    }
  }

  const handleCancelManualStatement = () => {
    setShowManualDialog(false)
    setSelectedText('')
    setSelectionRange(null)

    // Reset form
    setManualStatement('')
    setManualConcept('')
    setManualActor('')
    setManualOrganization('')
    setManualAgree(false)
  }

  // Clear selection when clicking elsewhere (but not when dialog is open) and handle escape key for dialog
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Don't clear selection if dialog is open or if clicking inside text container
      if (showManualDialog) return
      if (!textContainerRef.current?.contains(e.target as Node)) {
        setSelectedText('')
        setSelectionRange(null)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showManualDialog) {
        handleCancelManualStatement()
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showManualDialog])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {selectedFile ? `Full Text: ${selectedFile.title}` : 'Select a Text File'}
          </CardTitle>
          {selectedFile && (
            <div className="flex gap-1">
              {isEditing ? (
                <>
                  <Button
                    variant="neutral"
                    size="sm"
                    onClick={handleEditClick}
                    className="h-8 w-8 p-0 bg-green-100 hover:bg-green-200"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    variant="neutral"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-8 w-8 p-0 bg-red-100 hover:bg-red-200"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="neutral"
                  size="sm"
                  onClick={handleEditClick}
                  className="h-8 w-8 p-0"
                  title="Edit text content"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        <CardDescription>
          {selectedFile
            ? 'Review the full content and analyze its discourse network'
            : 'Choose a file from the list above to view its content'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {selectedFile ? (
          <div className="space-y-4">
            <div className="min-h-[300px] border border-border rounded-md p-4 bg-muted">
              {isEditing ? (
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  onDoubleClick={handleTextDoubleClick}
                  className="min-h-[280px] resize-none font-mono text-sm"
                  placeholder="Edit text content..."
                />
              ) : (
                <div
                  ref={textContainerRef}
                  onDoubleClick={handleTextDoubleClick}
                  onMouseUp={handleTextSelection}
                  className="cursor-text select-text"
                >
                  <HighlightedText
                    text={selectedFile.content}
                    statements={statements.filter(stmt => stmt.sourceFile === selectedFile.title)}
                    selectionRange={selectionRange}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {(isEditing ? editedContent : selectedFile.content).split(' ').filter(word => word.length > 0).length} words • {statements.filter(stmt => stmt.sourceFile === selectedFile.title).length} highlighted statements
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={loading || selectedFile.processed}
                size="lg"
                variant="neutral"
              >
                {loading ? 'Analyzing...' : selectedFile.processed ? 'Already Processed' : 'Analyze Text'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="min-h-[200px] border-2 border-dashed border-border rounded-lg p-8 flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg mb-2">No file selected</p>
              <p className="text-sm">Click on a file from the list above to view its content</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 border border-destructive bg-destructive/10 rounded-lg">
            <div className="text-destructive">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Manual Statement Dialog */}
        <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Manual Statement</DialogTitle>
              <DialogDescription>
                Fill in the details for the selected text to add it to the discourse analysis.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="statement">Statement *</Label>
                <Textarea
                  id="statement"
                  value={manualStatement}
                  onChange={(e) => setManualStatement(e.target.value)}
                  placeholder="The selected text..."
                  className={`min-h-[60px] resize-none ${!manualStatement.trim() ? 'border-red-300 focus:border-red-500' : ''}`}
                />
                {!manualStatement.trim() && (
                  <p className="text-sm text-red-600">Statement is required</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="concept">Concept</Label>
                <Input
                  id="concept"
                  value={manualConcept}
                  onChange={(e) => setManualConcept(e.target.value)}
                  placeholder="What is this statement about?"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="actor">Actor *</Label>
                <Input
                  id="actor"
                  value={manualActor}
                  onChange={(e) => setManualActor(e.target.value)}
                  placeholder="Who said this?"
                  className={!manualActor.trim() ? 'border-red-300 focus:border-red-500' : ''}
                />
                {!manualActor.trim() && (
                  <p className="text-sm text-red-600">Actor is required</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  value={manualOrganization}
                  onChange={(e) => setManualOrganization(e.target.value)}
                  placeholder="Which organization?"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="agree"
                  checked={manualAgree}
                  onCheckedChange={setManualAgree}
                />
                <Label htmlFor="agree">Agrees with the concept</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="neutral" onClick={handleCancelManualStatement}>
                Cancel
              </Button>
              <Button onClick={handleAddManualStatement}>
                Add Statement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

