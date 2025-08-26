'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle, Send, Loader2 } from 'lucide-react'

interface ChatMessage {
  id: string
  content: string
  isUser: boolean
  timestamp: string
}

interface TransactionData {
  TransactionID: string
  Date: string
  Category: string
  Amount: string
  Currency: string
  Description: string
  AccountType: string
  Status: string
  Quantity: string
  PricePerUnit: string
  IsRecurring: string
  CustomerID: string
  EmployeeID: string
  Region: string
  PaymentMethod: string
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
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="neutral" className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Chat with AI
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>AI Assistant</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full mt-6">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Start a conversation about your transaction data!</p>
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
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
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