'use client'

import { useState, useRef } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye } from 'lucide-react'

interface Statement {
  statement: string
  concept: string
  actor: string
  organization: string
  agree: boolean
  sourceFile?: string // Track which file this statement came from
  isLoaded?: boolean // true if loaded from DB, false if newly analyzed
  isModified?: boolean // true if statement has been edited
  originalStatementId?: number // Original DB statement ID for updates
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
        className="w-full px-2 py-1 text-sm border border-ring rounded focus:outline-none focus:ring-2 focus:ring-ring"
      />
    )
  }

  return (
    <div
      className={`text-sm cursor-pointer hover:bg-muted px-2 py-1 rounded ${className}`}
      onDoubleClick={handleDoubleClick}
      title="Double-click to edit"
    >
      {value}
    </div>
  )
}

interface ResultsSheetProps {
  statements: Statement[]
  onUpdateStatement: (index: number, updatedStatement: Statement) => void
  totalFiles: number
  processedFiles: number
  open: boolean
  onOpenChange: (open: boolean) => void
  filterSourceFile?: string | null
}

export default function ResultsSheet({
  statements,
  onUpdateStatement,
  totalFiles,
  processedFiles,
  open,
  onOpenChange,
  filterSourceFile
}: ResultsSheetProps) {
  // Filter statements based on the filterSourceFile prop
  const filteredStatements = filterSourceFile
    ? statements.filter(stmt => stmt.sourceFile === filterSourceFile)
    : statements
  const handleCellEdit = (rowIndex: number, field: 'statement' | 'concept' | 'actor' | 'organization' | 'agree', newValue: string) => {
    const currentStatement = filteredStatements[rowIndex]
    if (!currentStatement) return

    // Find the actual index in the original statements array
    const actualIndex = statements.findIndex(stmt => stmt === currentStatement)
    if (actualIndex === -1) return

    const updatedStatement = {
      ...currentStatement,
      [field]: field === 'agree' ? (newValue.toLowerCase() === 'true') : newValue,
      isModified: true
    }

    onUpdateStatement(actualIndex, updatedStatement)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Discourse Network Results</SheetTitle>
          <SheetDescription>
            {filterSourceFile
              ? `Analysis results filtered for: ${filterSourceFile}`
              : 'Accumulated analysis results from all processed text files'
            }. Double-click any cell to edit. ({processedFiles}/{totalFiles} files processed)
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {filteredStatements.length === 0 ? (
            <div className="min-h-[400px] border-2 border-dashed border-border rounded-lg p-8 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg mb-2">No results yet</p>
                <p className="text-sm">Process some text files to see analysis results here</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-4 py-2 text-left font-semibold">Source</th>
                    <th className="border border-border px-4 py-2 text-left font-semibold">Statement</th>
                    <th className="border border-border px-4 py-2 text-left font-semibold">Concept</th>
                    <th className="border border-border px-4 py-2 text-left font-semibold">Actor</th>
                    <th className="border border-border px-4 py-2 text-left font-semibold">Organization</th>
                    <th className="border border-border px-4 py-2 text-center font-semibold">Agree</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStatements.map((statement, index) => {
                    // Find the original index in the full statements array for editing
                    const originalIndex = filterSourceFile
                      ? statements.findIndex(stmt => stmt === statement)
                      : index
                    return (
                    <tr key={index} className="hover:bg-muted">
                      <td className="border border-border px-4 py-2 text-xs">
                        <Badge variant="neutral" className="text-xs">
                          {statement.sourceFile || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="border border-border px-4 py-2">
                        <EditableCell
                          value={statement.statement}
                          onSave={(newValue) => handleCellEdit(originalIndex, 'statement', newValue)}
                        />
                      </td>
                      <td className="border border-border px-4 py-2">
                        <EditableCell
                          value={statement.concept}
                          onSave={(newValue) => handleCellEdit(originalIndex, 'concept', newValue)}
                          className="font-medium"
                        />
                      </td>
                      <td className="border border-border px-4 py-2">
                        <EditableCell
                          value={statement.actor}
                          onSave={(newValue) => handleCellEdit(originalIndex, 'actor', newValue)}
                        />
                      </td>
                      <td className="border border-border px-4 py-2">
                        <EditableCell
                          value={statement.organization}
                          onSave={(newValue) => handleCellEdit(originalIndex, 'organization', newValue)}
                        />
                      </td>
                      <td className="border border-border px-4 py-2 text-center">
                        <EditableCell
                          value={statement.agree ? 'TRUE' : 'FALSE'}
                          onSave={(newValue) => handleCellEdit(originalIndex, 'agree', newValue)}
                        />
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

