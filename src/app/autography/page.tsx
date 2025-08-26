'use client'

import { useState, useEffect } from 'react'
import { ReactGrid, Column, Row, Cell, HeaderCell, TextCell } from '@silevis/reactgrid'
import '@silevis/reactgrid/styles.css'
import { ChatSheet } from './components/sheet-chat'

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

interface ChatMessage {
  id: string
  content: string
  isUser: boolean
  timestamp: string
}

function parseCSV(csvText: string): TransactionData[] {
  const lines = csvText.trim().split('\n')
  const headers = lines[0].split(',')
  
  return lines.slice(1).map(line => {
    const values = line.split(',')
    const obj: any = {}
    headers.forEach((header, index) => {
      obj[header] = values[index] || ''
    })
    return obj as TransactionData
  })
}

function createColumns(headers: string[]): Column[] {
  return headers.map(header => ({
    columnId: header,
    width: header === 'Description' ? 200 : 
           header === 'Date' ? 120 : 
           header === 'Amount' ? 100 : 150
  }))
}

function createRows(data: TransactionData[], headers: string[]): Row[] {
  const headerRow: Row = {
    rowId: 'header',
    cells: headers.map(header => ({
      type: 'header',
      text: header
    } as HeaderCell))
  }

  const dataRows: Row[] = data.map((item, index) => ({
    rowId: `row-${index}`,
    cells: headers.map(header => ({
      type: 'text',
      text: item[header as keyof TransactionData] || ''
    } as TextCell))
  }))

  return [headerRow, ...dataRows]
}

export default function AutographyPage() {
  const [data, setData] = useState<TransactionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  useEffect(() => {
    const loadCSVData = async () => {
      try {
        const response = await fetch('/dummy_data.csv')
        if (!response.ok) {
          throw new Error('Failed to fetch CSV data')
        }
        const csvText = await response.text()
        const parsedData = parseCSV(csvText)
        setData(parsedData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadCSVData()
  }, [])

  const sendMessage = async () => {
    if (!currentMessage.trim() || isChatLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: currentMessage,
      isUser: true,
      timestamp: new Date().toISOString()
    }

    setChatMessages(prev => [...prev, userMessage])
    setCurrentMessage('')
    setIsChatLoading(true)

    try {
      const response = await fetch('/api/autography', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          csvData: data
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const result = await response.json()
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: result.message,
        isUser: false,
        timestamp: result.timestamp
      }

      setChatMessages(prev => [...prev, aiMessage])
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date().toISOString()
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading CSV data...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Data</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    )
  }

  const headers = Object.keys(data[0]) as string[]
  const columns = createColumns(headers)
  const rows = createRows(data, headers)

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Transaction Data</h1>
          <p className="text-gray-600">Displaying {data.length} transactions from dummy_data.csv</p>
        </div>
        
        <ChatSheet
          isOpen={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          chatMessages={chatMessages}
          currentMessage={currentMessage}
          setCurrentMessage={setCurrentMessage}
          isChatLoading={isChatLoading}
          onSendMessage={sendMessage}
          onKeyPress={handleKeyPress}
        />
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-auto">
          <ReactGrid 
            rows={rows} 
            columns={columns}
            enableRangeSelection
            enableRowSelection
            enableFillHandle
          />
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Use Ctrl+Click to select multiple cells, Shift+Click to select ranges</p>
      </div>
    </div>
  )
}