'use client';

import 'reactflow/dist/style.css';
import { useEffect, useState, useCallback, DragEvent } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

import InputForm from './papermap/components/InputForm';
import { useMindMap } from './papermap/hooks/useMindMap';
import { AppsHeader } from '@/components/apps-header'
import AppsFooter from '@/components/apps-footer'

// Define file size limits (copied from Sidebar.tsx)
const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function PaperMap() {
  const { setTheme } = useTheme();
  const router = useRouter();
  // State to track the current input type (pdf or text)
  const [inputType, setInputType] = useState<'pdf' | 'text' | null>(null);
  // Local error state for input validation
  const [inputError, setInputError] = useState<string | null>(null);

  // Add cleanup on page unload/refresh
  useEffect(() => {
    // Function to clean up session when page is closed/refreshed
    const cleanupSession = async () => {
      try {
        const sessionId = localStorage.getItem('currentSessionId');
        if (sessionId) {
          // Use sendBeacon for reliable delivery during page unload
          const data = JSON.stringify({
            sessionId,
            cleanupSession: true
          });

          // Try to use sendBeacon first (most reliable during page unload)
          if (navigator.sendBeacon) {
            const blob = new Blob([data], { type: 'application/json' });
            navigator.sendBeacon('/api/papermap', blob);
          } else {
            // Fall back to fetch with keepalive
            fetch('/api/papermap', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: data,
              keepalive: true
            }).catch(e => console.error('Error sending cleanup request:', e));
          }
        }
      } catch (error) {
        console.error('Failed to send cleanup request:', error);
      }
    };

    // Add event listener for page unload
    window.addEventListener('beforeunload', cleanupSession);

    // Return cleanup function
    return () => {
      window.removeEventListener('beforeunload', cleanupSession);
      cleanupSession(); // Also clean up when component unmounts
    };
  }, []);

  // Get all the mindmap related state and functions from the hook
  const {
    loading,
    loadingStage,
    error,
    handleFileUpload,
    handleTextInput,
    loadExampleMindMap,
  } = useMindMap();

  // Use combined error from multiple sources
  const combinedError = inputError || error || null;

  // Handler for example badge click
  const handleExampleClick = useCallback(() => {
    loadExampleMindMap();
    setInputType('pdf'); // Example is PDF-based
  }, [loadExampleMindMap]);

  // Custom handler for input that redirects after creation
  const isTextInputObject = (input: any): input is { text: string, isTextInput?: boolean, isWebContent?: boolean, sourceUrl?: string } => {
    return typeof input === 'object' && input !== null && 'text' in input && typeof input.text === 'string';
  };

  const isFileUploadObject = (input: any): input is { file: File, blobUrl: string, originalFileName: string } => {
    return typeof input === 'object' && input !== null && 'file' in input && input.file instanceof File && 'blobUrl' in input && 'originalFileName' in input;
  };

  const handleInput = useCallback(async (input: File | { text: string, isTextInput?: boolean, isWebContent?: boolean, sourceUrl?: string } | { file: File, blobUrl: string, originalFileName: string }, blobUrl?: string) => {
    let apiResponse = null;
    if (isTextInputObject(input)) {
      if (input.isWebContent === true && input.sourceUrl) {
        setInputType('text');
        apiResponse = await handleTextInput(input.text, input.sourceUrl);
      } else if (input.isTextInput === true) {
        setInputType('text');
        apiResponse = await handleTextInput(input.text);
      } else {
        setInputError('Please upload a PDF file instead of a text file, or use the Text tab for questions.');
      }
    } else if (isFileUploadObject(input)) {
      setInputType('pdf');
      if (input.file.type === 'application/pdf') {
        apiResponse = await handleFileUpload(input.file, input.blobUrl, input.originalFileName);
      } else {
        setInputError('Only PDF files are supported for file upload.');
      }
    } else if (input instanceof File) {
      setInputType('pdf');
      if (input.type === 'application/pdf') {
        apiResponse = await handleFileUpload(input, blobUrl);
      } else {
        setInputError('Only PDF files are supported for file upload.');
      }
    }
    if (apiResponse && apiResponse.mindmapId) {
      router.push(`/papermap/${apiResponse.mindmapId}`);
    }
  }, [handleFileUpload, handleTextInput, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="fixed top-0 left-0 right-0 z-50">
        <AppsHeader />
      </div>
      <div className="text-center py-4">
        <h1 className="text-5xl md:text-6xl font-black mb-2">
          Papermap
        </h1>
        <div className="text-base md:text-lg text-muted-foreground">
          <a>
            Learn Anything with AI Mindmap
          </a>
        </div>
      </div>
      <InputForm
        onFileUpload={handleInput}
        loading={loading}
        error={combinedError}
        onExampleClick={handleExampleClick}
      />
      <div className="fixed bottom-0 left-0 right-0 py-1 px-0 text-center text-gray-600 text-xs bg-background">
        <div className="flex-none">
          <AppsFooter />
        </div>
      </div>
    </div>
  );
}
