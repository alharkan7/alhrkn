'use client'

import React from 'react'
import { Comment } from './types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface CommentPanelProps {
  comments: Comment[]
  onDeleteComment: (commentId: string) => void
  onScrollToComment: (comment: Comment) => void
  overallScore?: number | null
  overallFeedback?: string
}

export function CommentPanel({ comments, onDeleteComment, onScrollToComment, overallScore, overallFeedback }: CommentPanelProps) {
  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="h-full bg-gray-50 border-l-2 border-border">
      <div className="p-4 border-b-2 border-border bg-white">
        <h2 className="text-lg font-heading font-semibold">
          {overallScore !== null ? 'AI Review Results' : `Comments (${comments.length})`}
        </h2>
      </div>
      
      <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
        {/* Overall AI Review Score and Feedback */}
        {overallScore !== null && overallFeedback && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Overall Score</span>
                <span className={`text-2xl font-bold ${getScoreColor(overallScore!)}`}>
                  {overallScore}/100
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm leading-relaxed text-gray-700">{overallFeedback}</p>
            </CardContent>
          </Card>
        )}

        {/* Comments Section */}
        <div>
          <h3 className="text-md font-semibold mb-3">
            Detailed Comments ({comments.length})
          </h3>
          {comments.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No comments yet.</p>
              <p className="text-sm mt-2">Select text in the document to add comments.</p>
            </div>
          ) : (
            comments.map((comment) => (
            <Card key={comment.id} className="bg-white">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {comment.author}
                  </CardTitle>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onDeleteComment(comment.id)}
                    className="h-6 w-6 p-0 text-xs"
                  >
                    ×
                  </Button>
                </div>
                <div className="text-xs text-gray-500">
                  {formatTimestamp(comment.timestamp)}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="mb-3">
                  <div 
                    className="text-xs bg-yellow-100 p-2 rounded border italic cursor-pointer hover:bg-yellow-200 transition-colors"
                    onClick={() => onScrollToComment(comment)}
                    title="Click to highlight in document"
                  >
                    "{comment.selectedText}"
                  </div>
                </div>
                <p className="text-sm leading-relaxed">{comment.text}</p>
              </CardContent>
            </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
