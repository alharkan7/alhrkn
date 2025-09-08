import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { analyzeCsvWithLLM, analyzeWithAutoVisualization, analyzeWithMetadata, LLMAnalysisResult, CSVMetadata } from '@/app/experimentals/autography/utils/llm-tool-calling'
import { parseAndAnalyzeCSV, analyzeCSVSchema, generateSchemaDescription } from '@/app/experimentals/autography/utils/csv-schema-detection'
import { 
  performSafetyCheck, 
  sanitizeUserInput, 
  sanitizeAnalysisResult, 
  withTimeout, 
  createSafeError 
} from '@/app/experimentals/autography/utils/safety-measures'
import sanitizeHtml from 'sanitize-html'
import Joi from 'joi'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '')

// Input validation schema
const requestSchema = Joi.object({
  message: Joi.string().min(1).max(1000).required(),
  csvMetadata: Joi.object({
    rowCount: Joi.number().required(),
    columns: Joi.array().items(Joi.string()).required(),
    columnTypes: Joi.object().required(),
    sampleValues: Joi.object().required()
  }).optional(),
  hasData: Joi.boolean().optional(),
  csvContent: Joi.string().max(1000000).optional() // For raw CSV content
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received request body:', JSON.stringify(body, null, 2))
    
    // Validate and sanitize input
    const { error, value } = requestSchema.validate(body)
    if (error) {
      console.log('Validation error:', error.details[0].message)
      return NextResponse.json(
        { error: `Invalid input: ${error.details[0].message}` },
        { status: 400 }
      )
    }
    
    const { message, csvMetadata, hasData, csvContent } = value
    
    // Enhanced sanitization using safety measures
    const sanitizedMessage = sanitizeUserInput(message)
    
    // Get client identifier for rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'anonymous'
    
    // Perform basic safety check when metadata is provided
    if (csvMetadata && hasData) {
      const safetyCheck = performSafetyCheck({
        userQuery: sanitizedMessage,
        hasData,
        clientId
      })
      
      console.log('Safety check result:', safetyCheck)
      
      if (!safetyCheck.safe) {
        console.log('Safety check failed:', safetyCheck.errors)
        return NextResponse.json(
          { error: safetyCheck.errors.join('; ') },
          { status: 400 }
        )
      }
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Handle CSV metadata analysis with dynamic LLM system
    if (csvMetadata && hasData) {
      try {
        // Create a schema object from metadata
        const schema = {
          columns: csvMetadata.columns.map((col: string) => ({
            name: col,
            type: csvMetadata.columnTypes[col] || 'text',
            sampleValues: csvMetadata.sampleValues[col] || []
          })),
          rowCount: csvMetadata.rowCount
        }
        
        // Use metadata-based LLM analysis with timeout protection
        const analysisResult = await withTimeout(
          analyzeWithMetadata(
            csvMetadata,
            schema,
            sanitizedMessage,
            process.env.GOOGLE_GENERATIVE_AI_API_KEY!
          ),
          30000 // 30 second timeout
        ) as LLMAnalysisResult
        
        // If there are tool calls, execute them server-side on actual CSV data
        if (analysisResult.toolCalls && analysisResult.toolCalls.length > 0) {
          try {
            // Load the actual CSV data from the public directory
            const fs = require('fs')
            const path = require('path')
            const Papa = require('papaparse')
            
            const csvPath = path.join(process.cwd(), 'public', 'dummy_data.csv')
            const csvContent = fs.readFileSync(csvPath, 'utf8')
            const parseResult = Papa.parse(csvContent, { header: true, skipEmptyLines: true })
            
            if (parseResult.errors.length > 0) {
              throw new Error('CSV parsing failed')
            }
            
            // Import the tool execution functions
            const { executeAnalysisTool } = require('@/app/autography/utils/analysis-tools')
            const { executeVisualizationTool } = require('@/app/autography/utils/visualization-tools')
            
            // Execute each tool call on the actual data
            const executedToolCalls = []
            for (const toolCall of analysisResult.toolCalls) {
              try {
                let result
                if (toolCall.toolName.startsWith('create_')) {
                  result = await executeVisualizationTool(toolCall.toolName, toolCall.parameters)
                } else {
                  // Try analysis tools (includes calculate_statistics, filter_data, etc.)
                  result = await executeAnalysisTool(toolCall.toolName, parseResult.data, toolCall.parameters)
                }
                
                executedToolCalls.push({
                  ...toolCall,
                  result
                })
              } catch (toolError) {
                 console.error(`Tool execution failed for ${toolCall.toolName}:`, toolError)
                 executedToolCalls.push({
                   ...toolCall,
                   result: { success: false, message: `Tool execution failed: ${toolError instanceof Error ? toolError.message : String(toolError)}` }
                 })
              }
            }
            
            // Update the analysis result with executed tool calls
            analysisResult.toolCalls = executedToolCalls
            
            // Extract chart data from visualization results
            const chartResults = executedToolCalls.filter(tc => tc.result.success && tc.result.chartData)
            if (chartResults.length > 0) {
              analysisResult.chartData = chartResults[0].result.chartData
            }
            
            // Update text response to reflect actual results
            const successfulTools = executedToolCalls.filter(tc => tc.result.success)
            if (successfulTools.length > 0) {
              const resultMessages = successfulTools.map(tc => tc.result.description || tc.result.message || tc.result.summary).filter(Boolean)
              analysisResult.textResponse = `I've analyzed your data using ${successfulTools.length} operations. ${resultMessages.join(' ')}`
            }
            
          } catch (executionError) {
            console.error('Server-side tool execution failed:', executionError)
            // Keep the original analysis result if tool execution fails
          }
        }
        
        // Sanitize the result before returning
        const sanitizedResult = sanitizeAnalysisResult({
          message: analysisResult.textResponse,
          chartData: analysisResult.chartData,
          summary: analysisResult.summary,
          timestamp: new Date().toISOString(),
          type: 'dynamic_analysis',
          toolCalls: analysisResult.toolCalls || []
        })
        
        return NextResponse.json(sanitizedResult)
      } catch (analysisError) {
        console.error('Dynamic analysis failed:', analysisError)
        // Fall back to basic AI response
      }
    }
    
    // Handle raw CSV content
    if (csvContent) {
      try {
        // Parse and analyze CSV schema
        const schema = await parseAndAnalyzeCSV(csvContent)
        
        // Parse the CSV data
        const Papa = require('papaparse')
        const parseResult = Papa.parse(csvContent, { header: true, skipEmptyLines: true })
        
        if (parseResult.errors.length > 0) {
          throw new Error('CSV parsing failed')
        }
        
        // Use dynamic LLM analysis with timeout protection
        const analysisResult = await withTimeout(
          analyzeCsvWithLLM(
            parseResult.data,
            schema,
            sanitizedMessage,
            process.env.GOOGLE_GENERATIVE_AI_API_KEY!
          ),
          30000 // 30 second timeout
        )
        
        // Sanitize the result before returning
        const sanitizedResult = sanitizeAnalysisResult({
          message: analysisResult.textResponse,
          chartData: analysisResult.chartData,
          summary: analysisResult.summary,
          schema: {
            columns: schema.columns.length,
            rows: schema.rowCount,
            description: generateSchemaDescription(schema)
          },
          timestamp: new Date().toISOString(),
          type: 'dynamic_analysis',
          toolCalls: analysisResult.toolCalls || []
        })
        
        return NextResponse.json(sanitizedResult)
      } catch (csvError) {
        console.error('CSV analysis failed:', csvError)
        return NextResponse.json(
          { error: 'Failed to analyze CSV data. Please check the format and try again.' },
          { status: 400 }
        )
      }
    }

    // Fallback to basic AI response for non-data queries
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const prompt = `You are a helpful AI assistant for data analysis. The user asked: "${sanitizedMessage}". Please provide a helpful response about data analysis concepts, techniques, or general guidance.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ 
      message: sanitizeHtml(text),
      timestamp: new Date().toISOString(),
      type: 'ai_guidance'
    })

  } catch (error) {
    const safeError = createSafeError(error, 'API_ROUTE')
    return NextResponse.json(
      { error: safeError.message, code: safeError.code },
      { status: 500 }
    )
  }
}