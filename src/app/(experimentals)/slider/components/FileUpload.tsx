"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploadProps {
  onFileContent: (content: string, fileName: string) => void;
  disabled?: boolean;
}

export function FileUpload({ onFileContent, disabled }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = [
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    '.txt',
    '.md',
    '.markdown'
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);

    // Validate file type
    const isValidType = acceptedTypes.some(type =>
      file.type === type || file.name.toLowerCase().endsWith(type)
    );

    if (!isValidType) {
      setError('Please select a text file (.txt, .md, .markdown)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);

    try {
      const content = await file.text();
      onFileContent(content, file.name);
    } catch (err) {
      setError('Failed to read file content');
      console.error('File reading error:', err);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className={`border-2 border-dashed transition-colors ${
        dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary'}`}>
        <CardContent className="p-8">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className="text-center space-y-4"
          >
            <div className="flex justify-center">
              <div className={`p-4 rounded-full ${
                dragActive ? 'bg-primary/10' : 'bg-gray-100'
              }`}>
                <Upload className={`h-8 w-8 ${
                  dragActive ? 'text-primary' : 'text-gray-500'
                }`} />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">
                Upload Text Document
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your text file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports: .txt, .md, .markdown (max 10MB)
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              disabled={disabled}
              className="mt-4"
            >
              Choose File
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.markdown,text/plain,text/markdown"
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {selectedFile && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={clearFile}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
