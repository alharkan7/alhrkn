'use client'

import { useState, useRef, useEffect } from 'react'
import { InputForm } from './components/InputForm'
import { useChatMessages } from '@/hooks/useChatMessages'
import AppsFooter from '@/components/apps-footer'
import { useFileUpload } from '@/hooks/useFileUpload';


export default function ChatPage() {
  const { messages, isLoading, isStreaming, sendMessage } = useChatMessages();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const { file, handleFileSelect, clearFile } = useFileUpload();

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ block: 'end' });
        });
      } else {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Watch for new messages and content changes
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' || lastMessage.role === 'user') {
        scrollToBottom();
      }
    }
  }, [messages, messages[messages.length - 1]?.content]);

  // Initial scroll
  useEffect(() => {
    scrollToBottom();
  }, []);

  // Update file selection handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await handleFileSelect(selectedFile);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!hasUserSentMessage) {
      setHasUserSentMessage(true);
    }
    setInput(''); // Clear input immediately after sending

    // Only send if file is uploaded or there's text
    if (text.trim() || (file && file.uploaded)) {
      await sendMessage(text, file);
      clearFile();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      <div className={`flex-1 overflow-hidden flex flex-col justify-start max-w-4xl mx-auto w-full px-1 md:px-4 ${!hasUserSentMessage ? 'mt-[20vh]' : ''}`}>
        <div className="flex-none">
          <div className="text-center py-4">
            <h1 className="text-6xl font-black mb-3">
              Papermap
            </h1>
            <div className="text-sm">
              <a>
                Explain Anything in Interactive AI Mindmap
              </a>
            </div>
          </div>
        </div>
        <div className="flex-none py-4 px-2">
          <InputForm
            input={input}
            setInput={setInput}
            isLoading={isLoading || isStreaming}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileChange}
            file={file}
            clearFile={clearFile}
            sendMessage={handleSendMessage}
            onFocusChange={setIsInputFocused}
          />
        </div>
      </div>
      {!hasUserSentMessage && (
        <div className="flex-none mb-1">
          <AppsFooter />
        </div>
      )}
    </div>
  );
}