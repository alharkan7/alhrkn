import _ from 'lodash';
import * as ss from 'simple-statistics';
import { DatasetSchema } from './csv-schema-detection';

export interface AnalysisResult {
  success: boolean;
  data?: any;
  error?: string;
  description: string;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'histogram';
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string[];
      borderColor?: string;
    }[];
  };
  options?: any;
}

/**
 * Filters dataset based on conditions
 */
export function filterData(
  data: any[], 
  column: string, 
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'starts_with' | 'in_range',
  value: any,
  value2?: any
): AnalysisResult {
  try {
    let filteredData: any[];
    
    switch (operator) {
      case 'equals':
        filteredData = data.filter(row => row[column] == value);
        break;
      case 'not_equals':
        filteredData = data.filter(row => row[column] != value);
        break;
      case 'greater_than':
        filteredData = data.filter(row => parseFloat(row[column]) > parseFloat(value));
        break;
      case 'less_than':
        filteredData = data.filter(row => parseFloat(row[column]) < parseFloat(value));
        break;
      case 'contains':
        filteredData = data.filter(row => String(row[column]).toLowerCase().includes(String(value).toLowerCase()));
        break;
      case 'starts_with':
        filteredData = data.filter(row => String(row[column]).toLowerCase().startsWith(String(value).toLowerCase()));
        break;
      case 'in_range':
        if (value2 === undefined) throw new Error('Range filter requires two values');
        filteredData = data.filter(row => {
          const val = parseFloat(row[column]);
          return val >= parseFloat(value) && val <= parseFloat(value2);
        });
        break;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
    
    return {
      success: true,
      data: filteredData,
      description: `Filtered ${data.length} rows to ${filteredData.length} rows where ${column} ${operator} ${value}${value2 ? ` and ${value2}` : ''}`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      description: 'Failed to filter data'
    };
  }
}

/**
 * Groups data by a column and applies aggregation
 */
export function groupByColumn(
  data: any[],
  groupColumn: string,
  aggregateColumn?: string,
  aggregateFunction: 'count' | 'sum' | 'average' | 'min' | 'max' = 'count'
): AnalysisResult {
  try {
    const grouped = _.groupBy(data, groupColumn);
    const result: { [key: string]: number } = {};
    
    for (const [key, rows] of Object.entries(grouped)) {
      switch (aggregateFunction) {
        case 'count':
          result[key] = rows.length;
          break;
        case 'sum':
          if (!aggregateColumn) throw new Error('Sum requires an aggregate column');
          result[key] = _.sumBy(rows, row => parseFloat(row[aggregateColumn]) || 0);
          break;
        case 'average':
          if (!aggregateColumn) throw new Error('Average requires an aggregate column');
          const values = rows.map(row => parseFloat(row[aggregateColumn])).filter(v => !isNaN(v));
          result[key] = values.length > 0 ? _.mean(values) : 0;
          break;
        case 'min':
          if (!aggregateColumn) throw new Error('Min requires an aggregate column');
          const minValues = rows.map(row => parseFloat(row[aggregateColumn])).filter(v => !isNaN(v));
          result[key] = minValues.length > 0 ? Math.min(...minValues) : 0;
          break;
        case 'max':
          if (!aggregateColumn) throw new Error('Max requires an aggregate column');
          const maxValues = rows.map(row => parseFloat(row[aggregateColumn])).filter(v => !isNaN(v));
          result[key] = maxValues.length > 0 ? Math.max(...maxValues) : 0;
          break;
      }
    }
    
    return {
      success: true,
      data: result,
      description: `Grouped by ${groupColumn} and calculated ${aggregateFunction}${aggregateColumn ? ` of ${aggregateColumn}` : ''}`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      description: 'Failed to group data'
    };
  }
}

/**
 * Calculates statistical summary for a numeric column
 */
export function calculateStatistics(
  data: any[],
  column: string
): AnalysisResult {
  try {
    const values = data
      .map(row => parseFloat(row[column]))
      .filter(v => !isNaN(v));
    
    if (values.length === 0) {
      throw new Error(`No valid numeric values found in column ${column}`);
    }
    
    const stats = {
      count: values.length,
      sum: _.sum(values),
      mean: ss.mean(values),
      median: ss.median(values),
      min: Math.min(...values),
      max: Math.max(...values),
      standardDeviation: values.length > 1 ? ss.standardDeviation(values) : 0,
      variance: values.length > 1 ? ss.variance(values) : 0,
      range: Math.max(...values) - Math.min(...values)
    };
    
    return {
      success: true,
      data: stats,
      description: `Statistical summary for ${column}: mean=${stats.mean.toFixed(2)}, median=${stats.median}, range=${stats.min}-${stats.max}`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      description: 'Failed to calculate statistics'
    };
  }
}

/**
 * Finds top N values in a column
 */
export function getTopValues(
  data: any[],
  column: string,
  n: number = 10,
  sortBy: 'count' | 'value' = 'count'
): AnalysisResult {
  try {
    const valueCounts = _.countBy(data, column);
    let sortedEntries: [string, number][];
    
    if (sortBy === 'count') {
      sortedEntries = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]);
    } else {
      sortedEntries = Object.entries(valueCounts).sort((a, b) => {
        const aNum = parseFloat(a[0]);
        const bNum = parseFloat(b[0]);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return bNum - aNum;
        }
        return b[0].localeCompare(a[0]);
      });
    }
    
    const topValues = sortedEntries.slice(0, n);
    const result = Object.fromEntries(topValues);
    
    return {
      success: true,
      data: result,
      description: `Top ${n} values in ${column} sorted by ${sortBy}`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      description: 'Failed to get top values'
    };
  }
}

/**
 * Performs correlation analysis between two numeric columns
 */
export function calculateCorrelation(
  data: any[],
  column1: string,
  column2: string
): AnalysisResult {
  try {
    const pairs = data
      .map(row => [parseFloat(row[column1]), parseFloat(row[column2])])
      .filter(([a, b]) => !isNaN(a) && !isNaN(b));
    
    if (pairs.length < 2) {
      throw new Error('Need at least 2 valid data points for correlation');
    }
    
    const values1 = pairs.map(p => p[0]);
    const values2 = pairs.map(p => p[1]);
    
    const correlation = ss.sampleCorrelation(values1, values2);
    
    let strength = 'weak';
    const absCorr = Math.abs(correlation);
    if (absCorr > 0.7) strength = 'strong';
    else if (absCorr > 0.3) strength = 'moderate';
    
    const direction = correlation > 0 ? 'positive' : 'negative';
    
    return {
      success: true,
      data: {
        correlation,
        strength,
        direction,
        sampleSize: pairs.length
      },
      description: `${strength} ${direction} correlation (${correlation.toFixed(3)}) between ${column1} and ${column2}`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      description: 'Failed to calculate correlation'
    };
  }
}

/**
 * Creates time series analysis for date columns
 */
export function analyzeTimeSeries(
  data: any[],
  dateColumn: string,
  valueColumn?: string,
  groupBy: 'day' | 'week' | 'month' | 'year' = 'month'
): AnalysisResult {
  try {
    const timeData = data
      .map(row => ({
        date: new Date(row[dateColumn]),
        value: valueColumn ? parseFloat(row[valueColumn]) : 1
      }))
      .filter(item => !isNaN(item.date.getTime()) && !isNaN(item.value));
    
    if (timeData.length === 0) {
      throw new Error('No valid date/value pairs found');
    }
    
    // Group by time period
    const grouped = _.groupBy(timeData, item => {
      const date = item.date;
      switch (groupBy) {
        case 'day':
          return date.toISOString().split('T')[0];
        case 'week':
          const week = new Date(date);
          week.setDate(date.getDate() - date.getDay());
          return week.toISOString().split('T')[0];
        case 'month':
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        case 'year':
          return String(date.getFullYear());
        default:
          return date.toISOString().split('T')[0];
      }
    });
    
    const result: { [key: string]: number } = {};
    for (const [period, items] of Object.entries(grouped)) {
      result[period] = valueColumn ? _.sumBy(items, 'value') : items.length;
    }
    
    // Sort by period
    const sortedResult = Object.fromEntries(
      Object.entries(result).sort((a, b) => a[0].localeCompare(b[0]))
    );
    
    return {
      success: true,
      data: sortedResult,
      description: `Time series analysis grouped by ${groupBy}${valueColumn ? ` summing ${valueColumn}` : ' counting occurrences'}`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      description: 'Failed to analyze time series'
    };
  }
}

/**
 * Available analysis tools that can be called by the LLM
 */
export const ANALYSIS_TOOLS = {
  filter_data: {
    name: 'filter_data',
    description: 'Filter dataset based on column conditions',
    parameters: {
      type: 'object',
      properties: {
        column: { type: 'string', description: 'Column name to filter on' },
        operator: { 
          type: 'string', 
          enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'starts_with', 'in_range'],
          description: 'Filter operator'
        },
        value: { description: 'Filter value' },
        value2: { description: 'Second value for range operations (optional)' }
      },
      required: ['column', 'operator', 'value']
    },
    function: filterData
  },
  
  group_by_column: {
    name: 'group_by_column',
    description: 'Group data by column and apply aggregation',
    parameters: {
      type: 'object',
      properties: {
        groupColumn: { type: 'string', description: 'Column to group by' },
        aggregateColumn: { type: 'string', description: 'Column to aggregate (optional for count)' },
        aggregateFunction: {
          type: 'string',
          enum: ['count', 'sum', 'average', 'min', 'max'],
          description: 'Aggregation function',
          default: 'count'
        }
      },
      required: ['groupColumn']
    },
    function: groupByColumn
  },
  
  calculate_statistics: {
    name: 'calculate_statistics',
    description: 'Calculate statistical summary for a numeric column',
    parameters: {
      type: 'object',
      properties: {
        column: { type: 'string', description: 'Numeric column name' }
      },
      required: ['column']
    },
    function: calculateStatistics
  },
  
  get_top_values: {
    name: 'get_top_values',
    description: 'Get top N most frequent or highest values in a column',
    parameters: {
      type: 'object',
      properties: {
        column: { type: 'string', description: 'Column name' },
        n: { type: 'number', description: 'Number of top values to return', default: 10 },
        sortBy: {
          type: 'string',
          enum: ['count', 'value'],
          description: 'Sort by frequency or value',
          default: 'count'
        }
      },
      required: ['column']
    },
    function: getTopValues
  },
  
  calculate_correlation: {
    name: 'calculate_correlation',
    description: 'Calculate correlation between two numeric columns',
    parameters: {
      type: 'object',
      properties: {
        column1: { type: 'string', description: 'First numeric column' },
        column2: { type: 'string', description: 'Second numeric column' }
      },
      required: ['column1', 'column2']
    },
    function: calculateCorrelation
  },
  
  analyze_time_series: {
    name: 'analyze_time_series',
    description: 'Analyze time series data with date grouping',
    parameters: {
      type: 'object',
      properties: {
        dateColumn: { type: 'string', description: 'Date column name' },
        valueColumn: { type: 'string', description: 'Value column to sum (optional, defaults to count)' },
        groupBy: {
          type: 'string',
          enum: ['day', 'week', 'month', 'year'],
          description: 'Time grouping period',
          default: 'month'
        }
      },
      required: ['dateColumn']
    },
    function: analyzeTimeSeries
  }
};

/**
 * Execute an analysis tool with given parameters
 */
export function executeAnalysisTool(
  toolName: string,
  data: any[],
  parameters: any
): AnalysisResult {
  const tool = ANALYSIS_TOOLS[toolName as keyof typeof ANALYSIS_TOOLS];
  if (!tool) {
    return {
      success: false,
      error: `Unknown analysis tool: ${toolName}`,
      description: 'Tool execution failed'
    };
  }
  
  try {
    // Call the appropriate function based on tool name
    switch (toolName) {
      case 'filter_data':
        return filterData(data, parameters.column, parameters.operator, parameters.value, parameters.value2);
      case 'group_by_column':
        return groupByColumn(data, parameters.groupColumn, parameters.aggregateColumn, parameters.aggregateFunction);
      case 'calculate_statistics':
        return calculateStatistics(data, parameters.column);
      case 'get_top_values':
        return getTopValues(data, parameters.column, parameters.n, parameters.sortBy);
      case 'calculate_correlation':
        return calculateCorrelation(data, parameters.column1, parameters.column2);
      case 'analyze_time_series':
        return analyzeTimeSeries(data, parameters.dateColumn, parameters.valueColumn, parameters.groupBy);
      default:
        return {
          success: false,
          error: `Unknown analysis tool: ${toolName}`,
          description: 'Tool execution failed'
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      description: 'Tool execution failed'
    };
  }
}