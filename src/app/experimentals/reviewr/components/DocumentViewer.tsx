'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Comment } from './types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { getRubric } from './rubrics'

interface DocumentViewerProps {
  content: string
  comments: Comment[]
  essayType: string
  onAddComment: (comment: Omit<Comment, 'id' | 'timestamp'>) => void
  onSelectText: (selectedText: string, range: { start: number, end: number }) => void
  onRubricChange?: (rubric: any) => void
}

export function DocumentViewer({ content, comments, essayType, onAddComment, onSelectText, onRubricChange }: DocumentViewerProps) {
  const [selectedText, setSelectedText] = useState('')
  const [selectionRange, setSelectionRange] = useState<{ start: number, end: number } | null>(null)
  const [showCommentBox, setShowCommentBox] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentBoxPosition, setCommentBoxPosition] = useState({ top: 0, left: 0 })
  const [isEditingRubric, setIsEditingRubric] = useState(false)
  const [editableRubric, setEditableRubric] = useState(() => getRubric(essayType))
  const contentRef = useRef<HTMLDivElement>(null)
  const commentBoxRef = useRef<HTMLDivElement>(null)

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      const selectedContent = selection.toString().trim()
      const range = selection.getRangeAt(0)
      
      // Calculate position for comment box
      const rect = range.getBoundingClientRect()
      const containerRect = contentRef.current?.getBoundingClientRect()
      
      if (containerRect) {
        const top = rect.bottom - containerRect.top + 10 // 10px below selection
        const left = Math.min(rect.left - containerRect.left, containerRect.width - 320) // Ensure it fits
        
        setCommentBoxPosition({ top, left: Math.max(0, left) })
      }
      
      // Simple position calculation for comment storage
      const fullText = contentRef.current?.textContent || ''
      const start = fullText.indexOf(selectedContent)
      const end = start + selectedContent.length

      // Reset previous comment if any
      if (showCommentBox) {
        setCommentText('')
      }

      setSelectedText(selectedContent)
      setSelectionRange({ start, end })
      setShowCommentBox(true)
      onSelectText(selectedContent, { start, end })
    }
  }, [onSelectText, showCommentBox])

  const handleAddComment = () => {
    if (commentText.trim() && selectedText && selectionRange) {
      onAddComment({
        text: commentText.trim(),
        selectedText,
        position: selectionRange,
        author: 'Current User'
      })
      setCommentText('')
      setShowCommentBox(false)
      setSelectedText('')
      setSelectionRange(null)
      
      // Clear selection
      window.getSelection()?.removeAllRanges()
    }
  }

  const handleCancelComment = useCallback(() => {
    setCommentText('')
    setShowCommentBox(false)
    setSelectedText('')
    setSelectionRange(null)
    window.getSelection()?.removeAllRanges()
  }, [])

  // Handle clicks outside comment box
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showCommentBox && 
          commentBoxRef.current && 
          !commentBoxRef.current.contains(event.target as Node) &&
          contentRef.current &&
          contentRef.current.contains(event.target as Node)) {
        // Only close if clicking inside the document area but outside the comment box
        const selection = window.getSelection()
        if (!selection || !selection.toString().trim()) {
          handleCancelComment()
        }
      }
    }

    if (showCommentBox) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showCommentBox, handleCancelComment])

  // Update editable rubric when essay type changes
  useEffect(() => {
    setEditableRubric(getRubric(essayType))
    setIsEditingRubric(false)
  }, [essayType])

  const handleSaveRubric = () => {
    setIsEditingRubric(false)
    if (onRubricChange) {
      onRubricChange(editableRubric)
    }
  }

  const handleCancelRubricEdit = () => {
    setEditableRubric(getRubric(essayType))
    setIsEditingRubric(false)
  }

  const updateCriterion = (criterionIndex: number, field: string, value: any) => {
    setEditableRubric(prev => ({
      ...prev,
      criteria: prev.criteria.map((criterion, index) => 
        index === criterionIndex 
          ? { ...criterion, [field]: value }
          : criterion
      )
    }))
  }

  const updateCriterionPoint = (criterionIndex: number, pointIndex: number, value: string) => {
    setEditableRubric(prev => ({
      ...prev,
      criteria: prev.criteria.map((criterion, index) => 
        index === criterionIndex 
          ? { 
              ...criterion, 
              points: criterion.points.map((point, pIndex) => 
                pIndex === pointIndex ? value : point
              )
            }
          : criterion
      )
    }))
  }

  const renderContentWithHighlights = () => {
    if (!content) return null

    let processedContent = content
    
    // If there are comments, add highlighting
    if (comments.length > 0) {
      // Sort comments by position (start position) in reverse order to avoid index shifting
      const sortedComments = [...comments].sort((a, b) => b.position.start - a.position.start)
      
      // Get plain text content for accurate positioning
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = content
      const plainText = tempDiv.textContent || ''
      
      sortedComments.forEach((comment) => {
        const beforeText = plainText.slice(0, comment.position.start)
        const commentedText = plainText.slice(comment.position.start, comment.position.end)
        const afterText = plainText.slice(comment.position.end)
        
        // Find the position in HTML content and add highlighting
        if (commentedText) {
          const escapedText = commentedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(`(${escapedText})`, 'g')
          processedContent = processedContent.replace(regex, 
            `<mark class="bg-yellow-200 border border-yellow-400 rounded px-1" data-comment-id="${comment.id}" title="Click to view comment">$1</mark>`
          )
        }
      })
    }

    return (
      <div 
        ref={contentRef}
        className="prose prose-lg max-w-none leading-relaxed select-text"
        onMouseUp={handleMouseUp}
        style={{ userSelect: 'text' }}
      >
        <div dangerouslySetInnerHTML={{ __html: processedContent }} />
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="bg-white border-2 border-border rounded-base p-8 min-h-[800px] shadow-shadow">
        {renderContentWithHighlights()}
      </div>
      
      {/* Rubric Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button 
            variant="neutral" 
            size="sm"
            className="absolute top-4 right-4 z-20"
          >
            📋 View Rubric
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <SheetTitle>{editableRubric.title}</SheetTitle>
                <SheetDescription>
                  {editableRubric.description}
                </SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingRubric ? (
                  <Button
                    variant="neutral"
                    size="sm"
                    onClick={() => setIsEditingRubric(true)}
                  >
                    ✏️ Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="neutral"
                      size="sm"
                      onClick={handleSaveRubric}
                    >
                      ✅ Save
                    </Button>
                    <Button
                      variant="neutral"
                      size="sm"
                      onClick={handleCancelRubricEdit}
                    >
                      ❌ Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {/* Criteria Breakdown */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Evaluation Criteria</h3>
              <div className="space-y-4">
                {editableRubric.criteria.map((criterion, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex justify-between">
                        {isEditingRubric ? (
                          <input
                            type="text"
                            value={criterion.name}
                            onChange={(e) => updateCriterion(index, 'name', e.target.value)}
                            className="flex-1 mr-2 border rounded px-2 py-1 text-sm"
                          />
                        ) : (
                          <span>{criterion.name}</span>
                        )}
                        <span className="text-sm font-normal text-gray-600 flex items-center">
                          {isEditingRubric ? (
                            <input
                              type="number"
                              value={criterion.weight}
                              onChange={(e) => updateCriterion(index, 'weight', parseInt(e.target.value) || 0)}
                              className="w-12 border rounded px-1 py-1 text-xs text-center"
                              min="0"
                              max="100"
                            />
                          ) : (
                            criterion.weight
                          )}%
                        </span>
                      </CardTitle>
                      {isEditingRubric ? (
                        <textarea
                          value={criterion.description}
                          onChange={(e) => updateCriterion(index, 'description', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm resize-none"
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm text-gray-600">{criterion.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1">
                        {criterion.points.map((point, pointIndex) => (
                          <li key={pointIndex} className="text-sm flex items-start">
                            <span className="text-green-600 mr-2">•</span>
                            {isEditingRubric ? (
                              <textarea
                                value={point}
                                onChange={(e) => updateCriterionPoint(index, pointIndex, e.target.value)}
                                className="flex-1 border rounded px-2 py-1 text-xs resize-none"
                                rows={2}
                              />
                            ) : (
                              point
                            )}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Focus Areas */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Key Focus Areas</h3>
              <div className="grid gap-2">
                {editableRubric.focusAreas.map((area, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg">
                    {isEditingRubric ? (
                      <input
                        type="text"
                        value={area}
                        onChange={(e) => {
                          setEditableRubric(prev => ({
                            ...prev,
                            focusAreas: prev.focusAreas.map((focusArea, i) => 
                              i === index ? e.target.value : focusArea
                            )
                          }))
                        }}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    ) : (
                      <span className="text-sm font-medium text-blue-800">{area}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {showCommentBox && (
        <Card 
          ref={commentBoxRef}
          className="absolute z-10 w-80 shadow-lg border-2"
          style={{
            top: `${commentBoxPosition.top}px`,
            left: `${commentBoxPosition.left}px`,
          }}
        >
          <CardContent className="p-4">
            <div className="mb-3">
              <div className="text-sm font-medium text-gray-600 mb-2">Selected text:</div>
              <div className="text-sm bg-yellow-100 p-2 rounded border italic">
                "{selectedText}"
              </div>
            </div>
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add your comment..."
              className="mb-3 min-h-[100px]"
              autoFocus
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleAddComment}
                size="sm"
                disabled={!commentText.trim()}
              >
                Add Comment
              </Button>
              <Button 
                onClick={handleCancelComment}
                variant="neutral"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
