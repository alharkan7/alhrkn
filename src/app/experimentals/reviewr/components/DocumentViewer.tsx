'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Comment } from './types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'

interface DocumentViewerProps {
  content: string
  comments: Comment[]
  onAddComment: (comment: Omit<Comment, 'id' | 'timestamp'>) => void
  onSelectText: (selectedText: string, range: { start: number, end: number }) => void
}

export function DocumentViewer({ content, comments, onAddComment, onSelectText }: DocumentViewerProps) {
  const [selectedText, setSelectedText] = useState('')
  const [selectionRange, setSelectionRange] = useState<{ start: number, end: number } | null>(null)
  const [showCommentBox, setShowCommentBox] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentBoxPosition, setCommentBoxPosition] = useState({ top: 0, left: 0 })
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
