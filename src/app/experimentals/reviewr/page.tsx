'use client'

import React, { useState, useEffect } from 'react'
import { EssayReviewer } from './components/EssayReviewer'
import { parseMarkdownToHtml } from './components/utils'
import { Button } from '@/components/ui/button'

export default function ReviewrPage() {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [aiReviewData, setAiReviewData] = useState<any>(null)

  useEffect(() => {
    const loadEssayContent = async () => {
      try {
        const response = await fetch('/scholarship-essay.md')
        const markdownContent = await response.text()
        const htmlContent = parseMarkdownToHtml(markdownContent)
        setContent(htmlContent)
      } catch (error) {
        console.error('Error loading essay content:', error)
        // Fallback content if file loading fails
        setContent(`
          <h1 class="text-2xl font-bold mt-10 mb-6">Sample Essay</h1>
          <p class="mb-4">This is a sample essay for demonstration purposes. Select any text to add comments.</p>
          <p class="mb-4">You can highlight any passage, sentence, or paragraph and add your review comments. The comments will appear in the panel on the right side of the screen.</p>
          <p class="mb-4">This interface is similar to Google Docs or Microsoft Word commenting functionality, allowing for collaborative review and feedback on written documents.</p>
        `)
      } finally {
        setLoading(false)
      }
    }

    loadEssayContent()
  }, [])

  const handleAIReview = async () => {
    if (!content) return

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
          essayType: 'scholarship'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p>Loading essay...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background">
      <div className="bg-white border-b-2 border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-heading font-bold">Essay Reviewer</h1>
            <p className="text-sm text-gray-600 mt-1">
              Select text in the document to add comments and reviews
            </p>
          </div>
          <div>
            <Button 
              onClick={handleAIReview}
              disabled={loading || !content}
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
        <EssayReviewer content={content} aiReviewData={aiReviewData} />
      </div>
    </div>
  )
}