'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  loading: boolean
  error: string
}

interface HighlightedTextProps {
  text: string
  statements: Statement[]
}

function HighlightedText({ text, statements }: HighlightedTextProps) {
  // Filter statements that belong to this file and have valid indices
  const fileStatements = statements.filter(stmt =>
    stmt.sourceFile === null || stmt.startIndex !== undefined && stmt.endIndex !== undefined && stmt.startIndex >= 0
  )

  if (fileStatements.length === 0) {
    return <div className="whitespace-pre-wrap font-mono text-sm">{text}</div>
  }

  // Sort statements by startIndex
  const sortedStatements = fileStatements.sort((a, b) => (a.startIndex || 0) - (b.startIndex || 0))

  const parts: React.JSX.Element[] = []
  let lastIndex = 0

  sortedStatements.forEach((stmt, index) => {
    const start = stmt.startIndex!
    const end = stmt.endIndex!

    // Add text before the highlight
    if (start > lastIndex) {
      parts.push(
        <span key={`text-${index}`} className="whitespace-pre-wrap">
          {text.substring(lastIndex, start)}
        </span>
      )
    }

    // Add the highlighted statement
    const highlightedText = text.substring(start, end)
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

export default function TextDisplay({ selectedFile, statements, onAnalyze, onUpdateContent, loading, error }: TextDisplayProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')

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
                <div onDoubleClick={handleTextDoubleClick} className="cursor-text">
                  <HighlightedText
                    text={selectedFile.content}
                    statements={statements.filter(stmt => stmt.sourceFile === selectedFile.title)}
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
            <div className="text-center text-muted-foreground">
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
      </CardContent>
    </Card>
  )
}

