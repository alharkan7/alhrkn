'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { DocumentViewer } from './DocumentViewer'
import { CommentPanel } from './CommentPanel'
import { Comment } from './types'

interface EssayReviewerProps {
  content: string
  aiReviewData?: any
}

export function EssayReviewer({ content, aiReviewData }: EssayReviewerProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [overallScore, setOverallScore] = useState<number | null>(null)
  const [overallFeedback, setOverallFeedback] = useState<string>('')

  // Process AI review data when it changes
  useEffect(() => {
    if (aiReviewData) {
      setOverallScore(aiReviewData.overallScore)
      setOverallFeedback(aiReviewData.overallFeedback)
      
      // Convert AI comments to our comment format
      const aiComments: Comment[] = aiReviewData.comments.map((aiComment: any, index: number) => {
        // Get plain text content for positioning
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = content
        const plainText = tempDiv.textContent || ''
        
        // Find position of selected text
        const start = plainText.indexOf(aiComment.selectedText)
        const end = start + aiComment.selectedText.length
        
        return {
          id: `ai-${index}-${Date.now()}`,
          text: `[${aiComment.category.toUpperCase()} - ${aiComment.severity.toUpperCase()}] ${aiComment.comment}`,
          selectedText: aiComment.selectedText,
          position: { start: Math.max(0, start), end: Math.max(0, end) },
          timestamp: new Date(),
          author: 'AI Reviewer'
        }
      }).filter((comment: Comment) => comment.position.start >= 0) // Only include comments where text was found
      
      // Replace existing comments with AI comments
      setComments(aiComments)
    }
  }, [aiReviewData, content])

  const handleAddComment = useCallback((newComment: Omit<Comment, 'id' | 'timestamp'>) => {
    const comment: Comment = {
      ...newComment,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    }
    setComments(prev => [...prev, comment])
  }, [])

  const handleDeleteComment = useCallback((commentId: string) => {
    setComments(prev => prev.filter(comment => comment.id !== commentId))
  }, [])

  const handleSelectText = useCallback((selectedText: string, range: { start: number, end: number }) => {
    // This could be used for additional functionality like showing preview
    console.log('Text selected:', selectedText, range)
  }, [])

  const handleScrollToComment = useCallback((comment: Comment) => {
    // Find and highlight the commented text temporarily
    const marks = document.querySelectorAll(`[data-comment-id="${comment.id}"]`)
    if (marks.length > 0) {
      marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Add temporary highlight
      marks[0].classList.add('bg-orange-300')
      setTimeout(() => {
        marks[0].classList.remove('bg-orange-300')
      }, 2000)
    }
  }, [])

  return (
    <div className="flex h-screen">
      {/* Document Viewer - Left Panel */}
      <div className="flex-1 overflow-auto p-6">
        <DocumentViewer
          content={content}
          comments={comments}
          onAddComment={handleAddComment}
          onSelectText={handleSelectText}
        />
      </div>
      
      {/* Comment Panel - Right Panel */}
      <div className="w-80 flex-shrink-0">
        <CommentPanel
          comments={comments}
          onDeleteComment={handleDeleteComment}
          onScrollToComment={handleScrollToComment}
          overallScore={overallScore}
          overallFeedback={overallFeedback}
        />
      </div>
    </div>
  )
}
