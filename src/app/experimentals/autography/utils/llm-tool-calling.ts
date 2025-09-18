import { GoogleGenerativeAI } from '@google/generative-ai';
import { DatasetSchema, generateSchemaDescription } from './csv-schema-detection';
import { ANALYSIS_TOOLS, executeAnalysisTool, AnalysisResult } from './analysis-tools';
import { VISUALIZATION_TOOLS, executeVisualizationTool, VisualizationResult, suggestChartType } from './visualization-tools';

export interface LLMAnalysisResult {
  success: boolean;
  textResponse: string;
  chartData?: any;
  summary?: string;
  error?: string;
  toolCalls?: {
    toolName: string;
    parameters: any;
    result: AnalysisResult | VisualizationResult;
  }[];
}

export interface CSVMetadata {
  rowCount: number;
  columns: string[];
  columnTypes: { [key: string]: string };
  sampleValues: { [key: string]: string[] };
}

/**
 * Combines analysis and visualization tools for LLM function calling
 */
function getAllTools() {
  return {
    ...ANALYSIS_TOOLS,
    ...VISUALIZATION_TOOLS
  };
}

/**
 * Converts our tool definitions to Gemini function calling format
 */
function convertToGeminiFunctions() {
  const allTools = getAllTools();
  const functions: any[] = [];
  
  for (const [toolName, tool] of Object.entries(allTools)) {
    functions.push({
      name: toolName,
      description: tool.description,
      parameters: tool.parameters
    });
  }
  
  return functions;
}

/**
 * Creates a comprehensive system prompt for data analysis
 */
function createSystemPrompt(schema: DatasetSchema): string {
  const schemaDescription = generateSchemaDescription(schema);
  
  return `You are an expert data analyst with access to powerful analysis and visualization tools. Your task is to analyze CSV data and provide insights based on user queries.

**Dataset Schema:**
${schemaDescription}

**Available Tools:**
You have access to the following analysis tools:
- filter_data: Filter dataset based on column conditions
- group_by_column: Group data by column and apply aggregation
- calculate_statistics: Calculate statistical summary for numeric columns
- get_top_values: Get top N most frequent or highest values
- calculate_correlation: Calculate correlation between numeric columns
- analyze_time_series: Analyze time series data with date grouping

And visualization tools:
- create_bar_chart: Create bar charts for categorical data
- create_line_chart: Create line charts for time series data
- create_pie_chart: Create pie charts for categorical distributions
- create_scatter_plot: Create scatter plots for correlation analysis
- create_histogram: Create histograms for numeric distributions

**Instructions:**
1. Analyze the user's query to understand what they want to know
2. Use appropriate analysis tools to extract insights from the data
3. Create visualizations when they would help illustrate the findings
4. Provide clear, actionable insights based on your analysis
5. Always explain your methodology and findings in plain language
6. If you need to filter or transform data, use the analysis tools first
7. Choose the most appropriate visualization type for the data and question

**Response Format:**
Always provide:
1. A clear answer to the user's question
2. Key insights and patterns you discovered
3. Methodology explanation (what tools you used and why)
4. Recommendations or next steps if applicable

Remember: You must use the available tools to perform actual data analysis. Do not make assumptions about the data without analyzing it first.`;
}

/**
 * Processes LLM function calls and executes the requested tools
 */
async function processFunctionCalls(
  functionCalls: any[],
  csvData: any[]
): Promise<{
  results: (AnalysisResult | VisualizationResult)[];
  toolCalls: { toolName: string; parameters: any; result: AnalysisResult | VisualizationResult }[];
}> {
  const results: (AnalysisResult | VisualizationResult)[] = [];
  const toolCalls: { toolName: string; parameters: any; result: AnalysisResult | VisualizationResult }[] = [];
  
  for (const call of functionCalls) {
    const { name: toolName, args: parameters } = call;
    
    let result: AnalysisResult | VisualizationResult;
    
    // Check if it's an analysis tool
    if (ANALYSIS_TOOLS[toolName as keyof typeof ANALYSIS_TOOLS]) {
      result = executeAnalysisTool(toolName, csvData, parameters);
    }
    // Check if it's a visualization tool
    else if (VISUALIZATION_TOOLS[toolName as keyof typeof VISUALIZATION_TOOLS]) {
      result = executeVisualizationTool(toolName, parameters);
    }
    else {
      result = {
        success: false,
        error: `Unknown tool: ${toolName}`,
        description: 'Tool execution failed'
      };
    }
    
    results.push(result);
    toolCalls.push({ toolName, parameters, result });
  }
  
  return { results, toolCalls };
}

/**
 * Main function to analyze data using LLM with tool calling
 */
export async function analyzeCsvWithLLM(
  csvData: any[],
  schema: DatasetSchema,
  userQuery: string,
  apiKey: string
): Promise<LLMAnalysisResult> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      tools: [{ functionDeclarations: convertToGeminiFunctions() }]
    });
    
    const systemPrompt = createSystemPrompt(schema);
    const fullPrompt = `${systemPrompt}\n\nUser Query: ${userQuery}`;
    
    // First LLM call to get function calls
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    
    // Check if the model wants to use function calls
    const functionCalls = response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
      // Execute the function calls
      const { results, toolCalls } = await processFunctionCalls(functionCalls, csvData);
      
      // Prepare function results for the second LLM call
      const functionResults = functionCalls.map((call, index) => ({
        name: call.name,
        response: results[index]
      }));
      
      // Second LLM call with function results to generate final response
      const followUpResult = await model.generateContent([
        { text: fullPrompt },
        { functionCall: functionCalls[0] }, // Include the original function call
        { functionResponse: { name: functionCalls[0].name, response: results[0] } },
        { text: 'Based on the analysis results above, provide a comprehensive answer to the user\'s query. Include key insights, patterns, and actionable recommendations.' }
      ]);
      
      const finalResponse = followUpResult.response.text();
      
      // Extract chart data from visualization results
      let chartData = null;
      const visualizationResults = results.filter(r => 'chartData' in r) as VisualizationResult[];
      if (visualizationResults.length > 0 && visualizationResults[0].success) {
        chartData = visualizationResults[0].chartData;
      }
      
      // Generate summary from analysis results
      const analysisResults = results.filter(r => !('chartData' in r)) as AnalysisResult[];
      let summary = '';
      if (analysisResults.length > 0) {
        summary = analysisResults.map(r => r.description).join('; ');
      }
      
      return {
        success: true,
        textResponse: finalResponse,
        chartData,
        summary,
        toolCalls
      };
    } else {
      // No function calls, just return the direct response
      const textResponse = response.text();
      
      return {
        success: true,
        textResponse,
        toolCalls: []
      };
    }
  } catch (error) {
    console.error('LLM Analysis Error:', error);
    return {
      success: false,
      textResponse: 'I apologize, but I encountered an error while analyzing your data. Please try rephrasing your question or check if your data is properly formatted.',
      error: error instanceof Error ? error.message : 'Unknown error',
      toolCalls: []
    };
  }
}

/**
 * Simplified analysis function that automatically suggests and creates visualizations
 */
export async function analyzeWithAutoVisualization(
  csvData: any[],
  schema: DatasetSchema,
  userQuery: string,
  apiKey: string
): Promise<LLMAnalysisResult> {
  try {
    // First, perform the LLM analysis
    const analysisResult = await analyzeCsvWithLLM(csvData, schema, userQuery, apiKey);
    
    if (!analysisResult.success || !analysisResult.toolCalls) {
      return analysisResult;
    }
    
    // Check if we have analysis results but no visualization
    const hasVisualization = analysisResult.toolCalls.some(call => 
      VISUALIZATION_TOOLS[call.toolName as keyof typeof VISUALIZATION_TOOLS]
    );
    
    if (!hasVisualization) {
      // Find the first successful analysis result
      const analysisCall = analysisResult.toolCalls.find(call => 
        ANALYSIS_TOOLS[call.toolName as keyof typeof ANALYSIS_TOOLS] && call.result.success
      );
      
      if (analysisCall) {
        const suggestedChartType = suggestChartType(analysisCall.result as AnalysisResult, analysisCall.toolName);
        
        const analysisData = (analysisCall.result as AnalysisResult).data;
        if (suggestedChartType && analysisData) {
          // Create appropriate visualization
          let visualizationResult: VisualizationResult;
          
          switch (suggestedChartType) {
            case 'bar':
              visualizationResult = executeVisualizationTool('create_bar_chart', {
                data: analysisData,
                title: `Analysis: ${analysisCall.result.description}`,
                yAxisLabel: 'Count'
              });
              break;
            case 'line':
              visualizationResult = executeVisualizationTool('create_line_chart', {
                data: analysisData,
                title: `Time Series: ${analysisCall.result.description}`,
                xAxisLabel: 'Time Period',
                yAxisLabel: 'Value'
              });
              break;
            case 'pie':
              visualizationResult = executeVisualizationTool('create_pie_chart', {
                data: analysisData,
                title: `Distribution: ${analysisCall.result.description}`
              });
              break;
            default:
              visualizationResult = { success: false, description: 'No suitable visualization', error: 'Unsupported chart type' };
          }
          
          if (visualizationResult.success) {
            return {
              ...analysisResult,
              chartData: visualizationResult.chartData,
              toolCalls: [
                ...analysisResult.toolCalls,
                {
                  toolName: `create_${suggestedChartType}_chart`,
                  parameters: { auto_generated: true },
                  result: visualizationResult
                }
              ]
            };
          }
        }
      }
    }
    
    return analysisResult;
  } catch (error) {
    console.error('Auto-visualization Error:', error);
    return {
      success: false,
      textResponse: 'Error occurred during analysis with auto-visualization.',
      error: error instanceof Error ? error.message : 'Unknown error',
      toolCalls: []
    };
  }
}

/**
 * Analyzes CSV metadata and returns instructions for data processing
 */
export async function analyzeWithMetadata(
  csvMetadata: CSVMetadata,
  schema: any,
  userQuery: string,
  apiKey: string
): Promise<LLMAnalysisResult> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      tools: [{ functionDeclarations: convertToGeminiFunctions() }]
    });
    
    const metadataDescription = `Dataset Overview:
- Total rows: ${csvMetadata.rowCount}
- Columns (${csvMetadata.columns.length}): ${csvMetadata.columns.join(', ')}

Column Details:
${csvMetadata.columns.map(col => 
  `- ${col} (${csvMetadata.columnTypes[col]}): Sample values: ${csvMetadata.sampleValues[col]?.join(', ') || 'N/A'}`
).join('\n')}`;
    
    const systemPrompt = `You are a data analysis assistant with access to analysis and visualization tools. Based on the dataset metadata below, analyze the user's query and determine what tools to call to provide the best response.

${metadataDescription}

IMPORTANT: You have access to analysis and visualization tools. Use them when the user asks for:
- Statistical calculations (mean, sum, count, etc.)
- Data filtering or grouping
- Charts or visualizations
- Trends or patterns analysis

If you need to perform calculations or create visualizations, call the appropriate tools. The server will execute these tools on the actual CSV data.`;
    
    const result = await model.generateContent([
      { text: `${systemPrompt}\n\nUser Query: "${userQuery}"` }
    ]);
    
    const response = await result.response;
    const functionCalls = response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
      // Return the function calls as instructions for server-side processing
      return {
        success: true,
        textResponse: `I'll analyze your data using the following operations: ${functionCalls.map(fc => fc.name).join(', ')}. The server will process the actual CSV data and return the results.`,
        summary: `Prepared ${functionCalls.length} analysis operations for dataset with ${csvMetadata.rowCount} rows`,
        toolCalls: functionCalls.map(fc => ({
          toolName: fc.name,
          parameters: fc.args,
          result: { success: true, message: 'Pending server-side execution', description: 'Tool execution pending on server' } as AnalysisResult
        }))
      };
    } else {
      // Fallback to text response if no function calls
      const text = response.text();
      return {
        success: true,
        textResponse: text,
        summary: `Analyzed dataset with ${csvMetadata.rowCount} rows and ${csvMetadata.columns.length} columns`
      };
    }
  } catch (error) {
    console.error('Metadata Analysis Error:', error);
    return {
      success: false,
      textResponse: 'Failed to analyze the dataset metadata. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}