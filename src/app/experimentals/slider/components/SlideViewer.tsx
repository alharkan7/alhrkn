"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SlideViewerProps {
  slides: string[];
  onBack: () => void;
  fileName?: string;
  slideCount?: number;
  estimatedDuration?: string;
  warning?: string;
}

export function SlideViewer({ slides, onBack, fileName, slideCount, estimatedDuration, warning }: SlideViewerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalSlides = slides.length;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index: number) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlide(index);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
      case ' ':
        e.preventDefault();
        nextSlide();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        prevSlide();
        break;
      case 'Escape':
        if (isFullscreen) {
          setIsFullscreen(false);
        }
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        setIsFullscreen(!isFullscreen);
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen]);

  const downloadSlides = () => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName || 'Presentation'} - Slides</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
    }
    .slide-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
      overflow: hidden;
    }
    .slide {
      padding: 40px;
      min-height: 400px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .slide-navigation {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 20px;
    }
    .slide-nav-btn {
      padding: 8px 16px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .slide-nav-btn.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }
    .slide-nav-btn:hover {
      background: #f8f9fa;
    }
    .slide-nav-btn.active:hover {
      background: #0056b3;
    }
    @media print {
      body { background: white; }
      .slide-container { box-shadow: none; margin-bottom: 0; }
      .slide-navigation { display: none; }
    }
  </style>
</head>
<body>
  <div class="slide-navigation">
    ${slides.map((_, index) => `<button class="slide-nav-btn" onclick="goToSlide(${index})">${index + 1}</button>`).join('')}
  </div>
  ${slides.map((slide, index) => `
    <div class="slide-container">
      <div class="slide" id="slide-${index}" style="${index === 0 ? '' : 'display: none;'}">
        ${slide}
      </div>
    </div>
  `).join('')}
  <script>
    let currentSlide = 0;
    const totalSlides = ${totalSlides};

    function showSlide(index) {
      document.querySelectorAll('.slide').forEach((slide, i) => {
        slide.style.display = i === index ? 'block' : 'none';
      });
      document.querySelectorAll('.slide-nav-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
      });
      currentSlide = index;
    }

    function goToSlide(index) {
      if (index >= 0 && index < totalSlides) {
        showSlide(index);
      }
    }

    function nextSlide() {
      goToSlide((currentSlide + 1) % totalSlides);
    }

    function prevSlide() {
      goToSlide((currentSlide - 1 + totalSlides) % totalSlides);
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      }
    });

    // Initialize
    showSlide(0);
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName?.replace(/\.[^/.]+$/, '') || 'presentation'}-slides.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (totalSlides === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No slides to display</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Warning message */}
      {warning && (
        <div className="max-w-4xl mx-auto mb-6 px-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Fallback Rendering Used</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>{warning}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 p-4 border-b">
        <div className="flex items-center space-x-4">
          <Button variant="default" onClick={onBack}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Back to Upload
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{fileName || 'Presentation'}</h2>
            <p className="text-sm text-muted-foreground">
              Slide {currentSlide + 1} of {slideCount || totalSlides}
              {estimatedDuration && ` • ${estimatedDuration}`}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="default" size="sm" onClick={downloadSlides}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </Button>
        </div>
      </div>

      {/* Slide Navigation */}
      <div className="flex justify-center mb-4 px-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="default"
            size="sm"
            onClick={prevSlide}
            disabled={totalSlides <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex space-x-1">
            {Array.from({ length: Math.min(totalSlides, 10) }, (_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`w-8 h-8 rounded text-sm font-medium ${
                  i === currentSlide
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {i + 1}
              </button>
            ))}
            {totalSlides > 10 && (
              <>
                <span className="px-2 text-muted-foreground">...</span>
                <button
                  onClick={() => goToSlide(totalSlides - 1)}
                  className={`w-8 h-8 rounded text-sm font-medium ${
                    totalSlides - 1 === currentSlide
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {totalSlides}
                </button>
              </>
            )}
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={nextSlide}
            disabled={totalSlides <= 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Slide Content */}
      <div className="flex justify-center px-4">
        <Card className={`w-full max-w-4xl ${isFullscreen ? 'h-full' : 'min-h-[500px]'}`}>
          <CardContent className={`p-8 ${isFullscreen ? 'h-full flex items-center justify-center' : ''}`}>
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: slides[currentSlide] }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="text-center mt-4 px-4">
        <p className="text-xs text-muted-foreground">
          Use ← → arrow keys or spacebar to navigate • Press 'F' for fullscreen • Press 'Esc' to exit fullscreen
        </p>
      </div>
    </div>
  );
}
