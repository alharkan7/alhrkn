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

interface ResultsSheetProps {
  statements: Statement[]
  onUpdateStatement: (index: number, field: 'statement' | 'concept' | 'actor' | 'organization' | 'agree', newValue: string) => void
  totalFiles: number
  processedFiles: number
}

export default function ResultsSheet({
  statements,
  onUpdateStatement,
  totalFiles,
  processedFiles
}: ResultsSheetProps) {
  const handleCellEdit = (rowIndex: number, field: 'statement' | 'concept' | 'actor' | 'organization' | 'agree', newValue: string) => {
    if (field === 'agree') {
      // Handle boolean field
      onUpdateStatement(rowIndex, field, newValue.toLowerCase() === 'true' ? 'true' : 'false')
    } else {
      // Handle string fields
      onUpdateStatement(rowIndex, field, newValue)
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="default" className="fixed top-4 right-4 z-50 shadow-lg">
          <Eye className="w-4 h-4 mr-2" />
          View Results ({statements.length})
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Discourse Network Results</SheetTitle>
          <SheetDescription>
            Accumulated analysis results from all processed text files.
            Double-click any cell to edit. ({processedFiles}/{totalFiles} files processed)
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {statements.length === 0 ? (
            <div className="min-h-[400px] border-2 border-dashed border-gray-300 rounded-lg p-8 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">No results yet</p>
                <p className="text-sm">Process some text files to see analysis results here</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Source</th>
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
                      <td className="border border-gray-300 px-4 py-2 text-xs">
                        <Badge variant="neutral" className="text-xs">
                          {statement.sourceFile || 'Unknown'}
                        </Badge>
                      </td>
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
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

