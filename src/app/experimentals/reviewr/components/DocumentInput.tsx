'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface DocumentInputProps {
  onDocumentReady: (content: string, essayType: string) => void
}

export type EssayType = 'scholarship' | 'admission' | 'blog' | 'academic' | 'personal' | 'general'

const essayTypes: { value: EssayType; label: string; description: string }[] = [
  {
    value: 'scholarship',
    label: 'Scholarship Essay',
    description: 'Essays for scholarship applications, focusing on achievements and goals'
  },
  {
    value: 'admission',
    label: 'School Admission Essay',
    description: 'College or university admission essays and personal statements'
  },
  {
    value: 'blog',
    label: 'Blog Post',
    description: 'Online blog posts and articles for web publication'
  },
  {
    value: 'academic',
    label: 'Academic Paper',
    description: 'Research papers, academic essays, and scholarly writing'
  },
  {
    value: 'personal',
    label: 'Personal Essay',
    description: 'Personal narratives, memoirs, and reflective writing'
  },
  {
    value: 'general',
    label: 'General Essay',
    description: 'Other types of essays and written content'
  }
]

export function DocumentInput({ onDocumentReady }: DocumentInputProps) {
  const [textContent, setTextContent] = useState('')
  const [selectedEssayType, setSelectedEssayType] = useState<EssayType>('scholarship')
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      alert('Please upload a markdown (.md) or text (.txt) file')
      return
    }

    setLoading(true)
    try {
      const content = await file.text()
      setTextContent(content)
    } catch (error) {
      console.error('Error reading file:', error)
      alert('Error reading file. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }, [handleFileUpload])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }, [handleFileUpload])

  const handleProceed = useCallback(() => {
    if (!textContent.trim()) {
      alert('Please enter some content or upload a file')
      return
    }
    onDocumentReady(textContent.trim(), selectedEssayType)
  }, [textContent, selectedEssayType, onDocumentReady])

  const loadSampleEssay = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/scholarship-essay.md')
      const content = await response.text()
      setTextContent(content)
      setSelectedEssayType('scholarship')
    } catch (error) {
      console.error('Error loading sample essay:', error)
      alert('Error loading sample essay. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-heading font-bold mb-2">Essay Reviewer</h1>
        <p className="text-gray-600">
          Upload your essay or paste your content to get AI-powered feedback and reviews
        </p>
      </div>

      {/* Essay Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Essay Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="essay-type">Select the type of essay you want to review</Label>
            <Select value={selectedEssayType} onValueChange={(value: EssayType) => setSelectedEssayType(value)}>
              <SelectTrigger id="essay-type">
                <SelectValue placeholder="Select essay type" />
              </SelectTrigger>
              <SelectContent>
                {essayTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-gray-500">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="text-4xl">📄</div>
              <div>
                <p className="text-lg font-medium">Drop your markdown file here</p>
                <p className="text-sm text-gray-600">Supports .md and .txt files</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Choose File
                    <input
                      id="file-upload"
                      type="file"
                      accept=".md,.txt"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={loadSampleEssay}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load Sample Essay'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Text Input Area */}
      <Card>
        <CardHeader>
          <CardTitle>Or Paste/Type Your Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label htmlFor="text-content">Essay content (Markdown supported)</Label>
            <Textarea
              id="text-content"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste your essay content here or type directly. You can use markdown formatting like **bold**, *italic*, and # headers."
              className="min-h-[300px] font-mono text-sm"
            />
            <div className="text-xs text-gray-500">
              Characters: {textContent.length} | Words: {textContent.trim().split(/\s+/).filter(word => word.length > 0).length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <Button
          onClick={handleProceed}
          disabled={!textContent.trim() || loading}
          size="lg"
          className="px-8"
        >
          Start Review
        </Button>
      </div>
    </div>
  )
}
