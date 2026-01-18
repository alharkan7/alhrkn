"use client";

import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { SlideViewer } from './components/SlideViewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Presentation } from 'lucide-react';
import AppsFooter from '@/components/apps-footer';

interface SlideData {
  slides: string[];
  html: string;
  theme: string;
  slideCount?: number;
  estimatedDuration?: string;
  warning?: string;
}

const MARP_THEMES = [
  { value: 'default', label: 'Default' },
  { value: 'gaia', label: 'Gaia' },
  { value: 'uncover', label: 'Uncover' },
];

export default function SliderPage() {
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [slides, setSlides] = useState<SlideData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState('default');

  const handleFileContent = (content: string, name: string) => {
    setFileContent(content);
    setFileName(name);
    setError(null);
  };

  const handleConvert = async () => {
    if (!fileContent.trim()) {
      setError('Please select a file with content to convert');
      return;
    }

    if (fileContent.trim().length < 50) {
      setError('Text content must be at least 50 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/slider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: fileContent,
          theme: selectedTheme,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to convert to slides');
      }

      if (data.slides && data.slides.length > 0) {
        setSlides(data);
      } else {
        throw new Error('No slides were generated from the content');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while converting to slides');
      console.error('Conversion error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFileContent('');
    setFileName('');
    setSlides(null);
    setError(null);
    setSelectedTheme('default');
  };

  return (
    <div className="min-h-screen bg-background">

      <div className="pt-20 pb-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black tracking-tight mb-4">
              <span className="text-primary">Slider</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Transform your text documents into beautiful presentation slides in seconds
            </p>
          </div>

          {!slides ? (
            /* Upload and Convert Section */
            <div className="max-w-4xl mx-auto space-y-6">
              {/* File Upload */}
              <FileUpload
                onFileContent={handleFileContent}
                disabled={loading}
              />

              {/* Theme Selection and Convert */}
              {fileContent && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Convert to Slides</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Selected File
                        </label>
                        <p className="text-sm text-muted-foreground truncate">
                          {fileName}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Slide Theme
                        </label>
                        <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MARP_THEMES.map((theme) => (
                              <SelectItem key={theme.value} value={theme.value}>
                                {theme.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex space-x-4">
                      <Button
                        onClick={handleConvert}
                        disabled={loading}
                        className="flex-1"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Converting...
                          </>
                        ) : (
                          <>
                            <Presentation className="h-4 w-4 mr-2" />
                            Convert to Slides
                          </>
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleReset}
                        disabled={loading}
                      >
                        Reset
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error Message */}
              {error && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <p className="text-red-600">{error}</p>
                  </CardContent>
                </Card>
              )}

              {/* Instructions */}
              {!fileContent && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">How it works:</h3>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                      <li>Upload a text file (.txt, .md, .markdown)</li>
                      <li>Choose your preferred slide theme</li>
                      <li>Click "Convert to Slides" to transform your content</li>
                      <li>Navigate through your slides using arrow keys or buttons</li>
                      <li>Download the presentation as HTML</li>
                    </ol>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* Slide Viewer */
            <SlideViewer
              slides={slides.slides}
              onBack={handleReset}
              fileName={fileName}
              slideCount={slides.slideCount}
              estimatedDuration={slides.estimatedDuration}
            />
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0">
        <AppsFooter />
      </div>
    </div>
  );
}
