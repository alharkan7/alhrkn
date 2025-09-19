'use client'

import React, { useState, useEffect } from 'react'
import { EssayReviewer } from './components/EssayReviewer'
import { DocumentInput, type EssayType } from './components/DocumentInput'
import { parseMarkdownToHtml } from './components/utils'
import { Button } from '@/components/ui/button'

export default function ReviewrPage() {
  const [content, setContent] = useState('')
  const [essayType, setEssayType] = useState<EssayType>('scholarship')
  const [showReviewer, setShowReviewer] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [aiReviewData, setAiReviewData] = useState<any>(null)
  const [currentRubric, setCurrentRubric] = useState<any>(null)

  const handleDocumentReady = (documentContent: string, selectedEssayType: string) => {
    const htmlContent = parseMarkdownToHtml(documentContent)
    setContent(htmlContent)
    setEssayType(selectedEssayType as EssayType)
    setShowReviewer(true)
    // Reset any previous AI review data
    setAiReviewData(null)
  }

  const handleBackToInput = () => {
    setShowReviewer(false)
    setAiReviewData(null)
  }

  const handleAIReview = async () => {
    if (!content || !currentRubric) {
      alert('Please wait for the rubric to load before requesting an AI review.')
      return
    }

    setReviewLoading(true)
    try {
      // Convert HTML content back to plain text for API
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = content
      const plainTextContent = tempDiv.textContent || tempDiv.innerText || ''

      const response = await fetch('/api/reviewr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          essayContent: plainTextContent,
          essayType: essayType,
          rubric: currentRubric
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI review')
      }

      const reviewData = await response.json()
      setAiReviewData(reviewData)
      console.log('AI Review Data:', reviewData)
    } catch (error) {
      console.error('Error getting AI review:', error)
      alert('Failed to get AI review. Please try again.')
    } finally {
      setReviewLoading(false)
    }
  }

  // Show document input if not ready to review
  if (!showReviewer) {
    return (
      <div className="min-h-screen bg-background py-8">
        <DocumentInput onDocumentReady={handleDocumentReady} />
      </div>
    )
  }

  // Show the reviewer interface
  return (
    <div className="h-screen bg-background">
      <div className="bg-white border-b-2 border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="neutral" 
              size="sm"
              onClick={handleBackToInput}
            >
              ← Back to Input
            </Button>
            <div>
              <h1 className="text-xl font-heading font-bold">
                Essay Reviewer - {essayType.charAt(0).toUpperCase() + essayType.slice(1)}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Select text in the document to add comments and reviews
              </p>
            </div>
          </div>
          <div>
            <Button 
              onClick={handleAIReview}
              disabled={!content}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {reviewLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  AI Reviewing...
                </>
              ) : (
                'Get AI Review'
              )}
            </Button>
          </div>
        </div>
      </div>
      <div className="h-[calc(100vh-80px)]">
        <EssayReviewer 
          content={content} 
          essayType={essayType} 
          aiReviewData={aiReviewData}
          onGetCurrentRubric={setCurrentRubric}
        />
      </div>
    </div>
  )
}