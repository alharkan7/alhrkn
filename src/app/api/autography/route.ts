import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { message, csvData } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    // Create context from CSV data if provided
    let contextPrompt = ''
    if (csvData && csvData.length > 0) {
      const sampleData = csvData.slice(0, 5) // Use first 5 rows as sample
      contextPrompt = `\n\nContext: You are analyzing transaction data with the following structure and sample entries:\n${JSON.stringify(sampleData, null, 2)}\n\nTotal records: ${csvData.length}`
    }

    const prompt = `You are a helpful AI assistant analyzing financial transaction data. Please provide insights, answer questions, and help with data analysis.${contextPrompt}\n\nUser question: ${message}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ 
      message: text,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Gemini API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    )
  }
}