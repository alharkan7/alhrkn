'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import './sheet-chat.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle, Send, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChartData } from '../utils/visualization-tools'
import { Chart } from '@/components/ui/chart'
import { useRef, useEffect } from 'react'

interface ChatMessage {
  id: string
  content: string
  isUser: boolean
  timestamp: string
  chartData?: ChartData
  summary?: { [key: string]: number | string }
  type?: 'analysis' | 'ai'
}

interface ChatSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  chatMessages: ChatMessage[]
  currentMessage: string
  setCurrentMessage: (message: string) => void
  isChatLoading: boolean
  onSendMessage: () => void
  onKeyPress: (e: React.KeyboardEvent) => void
}

export function ChatSheet({
  isOpen,
  onOpenChange,
  chatMessages,
  currentMessage,
  setCurrentMessage,
  isChatLoading,
  onSendMessage,
  onKeyPress
}: ChatSheetProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="neutral" className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Chat with AI
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[500px] sm:w-[650px]">
        <SheetHeader>
          <SheetTitle>AI Assistant</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full mt-6">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-4">Start a conversation about your transaction data!</p>
                  
                  <div className="text-left bg-gray-50 rounded-lg p-4 mt-6">
                    <h4 className="font-semibold text-gray-700 mb-3 text-center">Try asking:</h4>
                    <div className="space-y-2 text-sm">
                      <button 
                        onClick={() => setCurrentMessage('Show me total amount by category')}
                        className="block w-full text-left p-2 hover:bg-white rounded border border-gray-200 transition-colors"
                      >
                        💰 "Show me total amount by category"
                      </button>
                      <button 
                        onClick={() => setCurrentMessage('Count transactions by payment method')}
                        className="block w-full text-left p-2 hover:bg-white rounded border border-gray-200 transition-colors"
                      >
                        💳 "Count transactions by payment method"
                      </button>
                      <button 
                        onClick={() => setCurrentMessage('Show transaction trends over time')}
                        className="block w-full text-left p-2 hover:bg-white rounded border border-gray-200 transition-colors"
                      >
                        📈 "Show transaction trends over time"
                      </button>
                      <button 
                        onClick={() => setCurrentMessage('What is the average transaction amount?')}
                        className="block w-full text-left p-2 hover:bg-white rounded border border-gray-200 transition-colors"
                      >
                        📊 "What is the average transaction amount?"
                      </button>
                      <button 
                        onClick={() => setCurrentMessage('Show me transactions by region')}
                        className="block w-full text-left p-2 hover:bg-white rounded border border-gray-200 transition-colors"
                      >
                        🌍 "Show me transactions by region"
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.isUser
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="text-sm prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                      </div>
                      
                      {/* Render chart if available */}
                      {message.chartData && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <Chart chartData={message.chartData} className="mb-2" />
                        </div>
                      )}
                      
                      {/* Render summary if available */}
                      {message.summary && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="text-sm font-semibold text-blue-800 mb-2">Summary</h4>
                          {typeof message.summary === 'string' ? (
                            <div className="text-sm text-blue-900">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.summary}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {Object.entries(message.summary).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-blue-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                  <span className="font-medium text-blue-900">
                                    {typeof value === 'number' ? value.toLocaleString() : value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <p className="text-xs opacity-70 mt-2">
                        {new Date(message.timestamp).toLocaleTimeString()}
                        {message.type === 'analysis' && (
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            Data Analysis
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <div className="border-t pt-4 mt-4 mb-10">
            <div className="flex gap-2">
              <Input
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={onKeyPress}
                placeholder="Ask about your transaction data..."
                disabled={isChatLoading}
                className="flex-1"
              />
              <Button
                onClick={onSendMessage}
                disabled={!currentMessage.trim() || isChatLoading}
                size="icon"
              >
                {isChatLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}