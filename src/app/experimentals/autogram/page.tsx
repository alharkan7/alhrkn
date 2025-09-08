'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AppsHeader } from '@/components/apps-header'
import AppsFooter from '@/components/apps-footer'
import { Loader2, Sparkles, Network } from 'lucide-react'
import { toast } from 'sonner'
import DiagramRenderer from './components/DiagramRenderer'

export default function AutogramPage() {
  const [textInput, setTextInput] = useState(`The software development lifecycle consists of several key phases. First, planning involves defining project requirements and creating a roadmap. Then, design phase focuses on creating system architecture and user interface mockups. Development follows where programmers write code according to specifications. Testing ensures quality by identifying and fixing bugs. Finally, deployment makes the software available to users, followed by maintenance to address ongoing issues and updates.`)
  const [isProcessing, setIsProcessing] = useState(false)
  const [diagramData, setDiagramData] = useState<any>(null)

  const handleProcessText = async () => {
    if (!textInput.trim()) {
      toast.error('Please enter some text to process')
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch('/api/autogram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textInput,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to process text')
      }

      const result = await response.json()
      setDiagramData(result)
      toast.success('Diagram generated successfully!')
    } catch (error) {
      console.error('Error processing text:', error)
      toast.error('Failed to generate diagram. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="h-[100vh] flex flex-col items-center justify-center">
      <div className="fixed top-0 left-0 right-0 z-50">
        <AppsHeader />
      </div>

      <div className="w-full max-w-4xl px-4 py-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Autogram</h1>
          <p className="text-muted-foreground">Transform your text into beautiful Smart Art diagrams</p>
        </div>

        <div className="space-y-6">
          {/* Text Input Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Input Text
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter your text here... Describe a process, concept, or any content you want to visualize as a diagram."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="min-h-[200px] resize-none"
              />
            </CardContent>
          </Card>

          {/* Process Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleProcessText}
              disabled={isProcessing}
              size="lg"
              className="px-8"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Diagram...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Diagram
                </>
              )}
            </Button>
          </div>

          {/* Diagram Display Section */}
          {diagramData && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Diagram</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                  <DiagramRenderer data={diagramData} width={700} height={400} />
                </div>
                {diagramData.raw_response && (
                  <details className="mt-4">
                    <summary className="text-sm text-muted-foreground cursor-pointer">
                      View Raw Response
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                      {diagramData.raw_response}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 py-1 text-center text-xs bg-background">
        <div className="flex-none">
          <AppsFooter />
        </div>
      </div>
    </div>
  )
}
