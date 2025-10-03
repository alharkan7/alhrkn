'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface TextFile {
  id: string
  title: string
  content: string
  processed?: boolean
}

interface TextDisplayProps {
  selectedFile: TextFile | null
  onAnalyze: (text: string) => void
  loading: boolean
  error: string
}

export default function TextDisplay({ selectedFile, onAnalyze, loading, error }: TextDisplayProps) {
  const handleAnalyze = () => {
    if (selectedFile) {
      onAnalyze(selectedFile.content)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {selectedFile ? `Full Text: ${selectedFile.title}` : 'Select a Text File'}
        </CardTitle>
        <CardDescription>
          {selectedFile
            ? 'Review the full content and analyze its discourse network'
            : 'Choose a file from the list above to view its content'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {selectedFile ? (
          <div className="space-y-4">
            <Textarea
              value={selectedFile.content}
              readOnly
              className="min-h-[300px] resize-none font-mono text-sm"
              placeholder="Selected file content will appear here..."
            />

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {selectedFile.content.split(' ').length} words
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={loading || selectedFile.processed}
                size="lg"
              >
                {loading ? 'Analyzing...' : selectedFile.processed ? 'Already Processed' : 'Analyze Text'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg p-8 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">No file selected</p>
              <p className="text-sm">Click on a file from the list above to view its content</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-lg">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

