'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Statement {
  statement: string
  concept: string
  actor: string
  organization: string
  agree: boolean
}

interface DiscourseAnalyzerProps {
  text: string
  setText: (text: string) => void
  statements: Statement[]
  setStatements: (statements: Statement[]) => void
  loading: boolean
  error: string
  onAnalyze: () => void
}

interface EditableCellProps {
  value: string
  onSave: (newValue: string) => void
  className?: string
}

function EditableCell({ value, onSave, className = "" }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDoubleClick = () => {
    setIsEditing(true)
    setEditValue(value)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
  }

  const handleSave = () => {
    onSave(editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    )
  }

  return (
    <div
      className={`text-sm cursor-pointer hover:bg-gray-50 px-2 py-1 rounded ${className}`}
      onDoubleClick={handleDoubleClick}
      title="Double-click to edit"
    >
      {value}
    </div>
  )
}

export default function DiscourseAnalyzer({
  text,
  setText,
  statements,
  setStatements,
  loading,
  error,
  onAnalyze
}: DiscourseAnalyzerProps) {
  const handleCellEdit = (rowIndex: number, field: keyof Statement, newValue: string) => {
    const updatedStatements = [...statements]
    if (field === 'agree') {
      // Handle boolean field
      updatedStatements[rowIndex][field] = newValue.toLowerCase() === 'true'
    } else {
      // Handle string fields
      updatedStatements[rowIndex][field] = newValue
    }
    setStatements(updatedStatements)
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Input Text</CardTitle>
          <CardDescription>
            Paste or drop your article, news, or any text content here (dozens to hundreds of words)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Paste your text here... (e.g., news article, blog post, or any textual content)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[200px] resize-none"
          />
        </CardContent>
      </Card>

      {/* Process Button */}
      <div className="flex justify-center">
        <Button
          onClick={onAnalyze}
          disabled={!text.trim() || loading}
          size="lg"
          className="px-8"
          variant="neutral"
        >
          {loading ? 'Analyzing...' : 'Analyze Text'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Results</CardTitle>
          <CardDescription>
            {statements.length > 0
              ? `Found ${statements.length} statement${statements.length !== 1 ? 's' : ''} in the text. Double-click any cell to edit.`
              : 'The discourse network analysis will appear here'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Statement</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Concept</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Actor</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Organization</th>
                    <th className="border border-gray-300 px-4 py-2 text-center font-semibold">Agree</th>
                  </tr>
                </thead>
                <tbody>
                  {statements.map((statement, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        <EditableCell
                          value={statement.statement}
                          onSave={(newValue) => handleCellEdit(index, 'statement', newValue)}
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <EditableCell
                          value={statement.concept}
                          onSave={(newValue) => handleCellEdit(index, 'concept', newValue)}
                          className="font-medium"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <EditableCell
                          value={statement.actor}
                          onSave={(newValue) => handleCellEdit(index, 'actor', newValue)}
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <EditableCell
                          value={statement.organization}
                          onSave={(newValue) => handleCellEdit(index, 'organization', newValue)}
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <EditableCell
                          value={statement.agree ? 'TRUE' : 'FALSE'}
                          onSave={(newValue) => handleCellEdit(index, 'agree', newValue)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 flex items-center justify-center">
              <div className="text-center text-gray-500">
                {loading ? (
                  <div>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                    <p>Analyzing text...</p>
                  </div>
                ) : (
                  <p>Results will appear here after processing</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
