'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'

interface TextFile {
  id: string
  title: string
  content: string
  processed?: boolean
  isLoaded?: boolean
}

interface TextFileListProps {
  files: TextFile[]
  selectedFileId: string | null
  onFileSelect: (fileId: string) => void
  onAddFile: (title: string, content: string) => void
}

function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

export default function TextFileList({ files, selectedFileId, onFileSelect, onAddFile }: TextFileListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')

  const handleAddFile = () => {
    if (newTitle.trim() && newContent.trim()) {
      onAddFile(newTitle.trim(), newContent.trim())
      setNewTitle('')
      setNewContent('')
      setIsDialogOpen(false)
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setNewTitle('')
    setNewContent('')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Text Sources</CardTitle>
            <CardDescription>
              Add text sources and select one to analyze discourse
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="neutral">
                <Plus className="w-4 h-4" />
                Add Source
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Text Source</DialogTitle>
                <DialogDescription>
                  Enter a title and paste or type your text content. This could be a news article, blog post, or any textual content you want to analyze.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Climate Policy Article"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Paste your text here... (news articles, blog posts, etc.)"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="min-h-[200px] resize-none"
                  />
                  <div className="text-sm text-muted-foreground">
                    {newContent.split(' ').filter(word => word.length > 0).length} words
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="neutral" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button variant="neutral" onClick={handleAddFile} disabled={!newTitle.trim() || !newContent.trim()}>
                  Add Source
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="mb-4">No text sources added yet</p>
            <p className="text-sm">Click "Add Source" to get started</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            <div className="space-y-3 pr-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedFileId === file.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-border hover:bg-muted'
                  }`}
                  onClick={() => onFileSelect(file.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate">
                            {file.title}
                          </h3>
                          {file.processed && (
                            <Badge variant="neutral" className="text-xs">
                              Processed
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                          {file.content.split(' ').filter(word => word.length > 0).length} words
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {truncateText(file.content)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

