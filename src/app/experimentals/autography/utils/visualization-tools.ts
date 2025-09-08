import { AnalysisResult } from './analysis-tools';

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'histogram';
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string[];
      borderColor?: string;
      borderWidth?: number;
    }[];
  };
  options?: any;
}

export interface VisualizationResult {
  success: boolean;
  chartData?: ChartData;
  error?: string;
  description: string;
}

/**
 * Color palettes for charts
 */
const COLOR_PALETTES = {
  primary: [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
  ],
  pastel: [
    '#93C5FD', '#FCA5A5', '#6EE7B7', '#FDE047', '#C4B5FD',
    '#67E8F9', '#FDBA74', '#BEF264', '#F9A8D4', '#A5B4FC'
  ]
};

/**
 * Creates a bar chart from grouped data
 */
export function createBarChart(
  data: { [key: string]: number },
  title: string,
  xAxisLabel: string = '',
  yAxisLabel: string = '',
  colorPalette: 'primary' | 'pastel' = 'primary'
): VisualizationResult {
  try {
    const labels = Object.keys(data);
    const values = Object.values(data);
    
    if (labels.length === 0) {
      throw new Error('No data to visualize');
    }
    
    const chartData: ChartData = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: title,
          data: values,
          backgroundColor: COLOR_PALETTES[colorPalette].slice(0, labels.length),
          borderColor: COLOR_PALETTES.primary[0],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            title: {
              display: !!xAxisLabel,
              text: xAxisLabel
            }
          },
          y: {
            title: {
              display: !!yAxisLabel,
              text: yAxisLabel
            },
            beginAtZero: true
          }
        }
      }
    };
    
    return {
      success: true,
      chartData,
      description: `Created bar chart with ${labels.length} categories`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      description: 'Failed to create bar chart'
    };
  }
}

/**
 * Creates a line chart from time series or sequential data
 */
export function createLineChart(
  data: { [key: string]: number },
  title: string,
  xAxisLabel: string = '',
  yAxisLabel: string = '',
  color: string = COLOR_PALETTES.primary[0]
): VisualizationResult {
  try {
    const labels = Object.keys(data);
    const values = Object.values(data);
    
    if (labels.length === 0) {
      throw new Error('No data to visualize');
    }
    
    const chartData: ChartData = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: title,
          data: values,
          borderColor: color,
          backgroundColor: [color + '20'], // Add transparency
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title
          }
        },
        scales: {
          x: {
            title: {
              display: !!xAxisLabel,
              text: xAxisLabel
            }
          },
          y: {
            title: {
              display: !!yAxisLabel,
              text: yAxisLabel
            },
            beginAtZero: true
          }
        }
      }
    };
    
    return {
      success: true,
      chartData,
      description: `Created line chart with ${labels.length} data points`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      description: 'Failed to create line chart'
    };
  }
}

/**
 * Creates a pie chart from categorical data
 */
export function createPieChart(
  data: { [key: string]: number },
  title: string,
  colorPalette: 'primary' | 'pastel' = 'primary'
): VisualizationResult {
  try {
    const labels = Object.keys(data);
    const values = Object.values(data);
    
    if (labels.length === 0) {
      throw new Error('No data to visualize');
    }
    
    // Limit to top 10 categories for readability
    const sortedEntries = Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const chartData: ChartData = {
      type: 'pie',
      data: {
        labels: sortedEntries.map(([label]) => label),
        datasets: [{
          label: title,
          data: sortedEntries.map(([, value]) => value),
          backgroundColor: COLOR_PALETTES[colorPalette].slice(0, sortedEntries.length)
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title
          },
          legend: {
            position: 'right' as const
          }
        }
      }
    };
    
    return {
      success: true,
      chartData,
      description: `Created pie chart with ${sortedEntries.length} categories`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      description: 'Failed to create pie chart'
    };
  }
}

/**
 * Creates a scatter plot from two-dimensional data
 */
export function createScatterPlot(
  dataPoints: { x: number; y: number; label?: string }[],
  title: string,
  xAxisLabel: string = '',
  yAxisLabel: string = '',
  color: string = COLOR_PALETTES.primary[0]
): VisualizationResult {
  try {
    if (dataPoints.length === 0) {
      throw new Error('No data points to visualize');
    }
    
    const chartData: ChartData = {
      type: 'scatter',
      data: {
        labels: [],
        datasets: [{
          label: title,
          data: dataPoints.map(point => ({ x: point.x, y: point.y })) as any,
          backgroundColor: [color],
          borderColor: color
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title
          }
        },
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            title: {
              display: !!xAxisLabel,
              text: xAxisLabel
            }
          },
          y: {
            title: {
              display: !!yAxisLabel,
              text: yAxisLabel
            }
          }
        }
      }
    };
    
    return {
      success: true,
      chartData,
      description: `Created scatter plot with ${dataPoints.length} data points`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      description: 'Failed to create scatter plot'
    };
  }
}

/**
 * Creates a histogram from numeric data
 */
export function createHistogram(
  values: number[],
  title: string,
  bins: number = 10,
  xAxisLabel: string = '',
  yAxisLabel: string = 'Frequency'
): VisualizationResult {
  try {
    if (values.length === 0) {
      throw new Error('No values to create histogram');
    }
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;
    
    const binCounts = new Array(bins).fill(0);
    const binLabels: string[] = [];
    
    // Create bin labels
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth;
      const binEnd = min + (i + 1) * binWidth;
      binLabels.push(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`);
    }
    
    // Count values in each bin
    values.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
      binCounts[binIndex]++;
    });
    
    const chartData: ChartData = {
      type: 'bar',
      data: {
        labels: binLabels,
        datasets: [{
          label: title,
          data: binCounts,
          backgroundColor: [COLOR_PALETTES.primary[0] + '80'],
          borderColor: COLOR_PALETTES.primary[0],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            title: {
              display: !!xAxisLabel,
              text: xAxisLabel
            }
          },
          y: {
            title: {
              display: true,
              text: yAxisLabel
            },
            beginAtZero: true
          }
        }
      }
    };
    
    return {
      success: true,
      chartData,
      description: `Created histogram with ${bins} bins from ${values.length} values`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      description: 'Failed to create histogram'
    };
  }
}

/**
 * Available visualization tools that can be called by the LLM
 */
export const VISUALIZATION_TOOLS = {
  create_bar_chart: {
    name: 'create_bar_chart',
    description: 'Create a bar chart from categorical data',
    parameters: {
      type: 'object',
      properties: {
        data: { type: 'object', description: 'Key-value pairs for chart data' },
        title: { type: 'string', description: 'Chart title' },
        xAxisLabel: { type: 'string', description: 'X-axis label (optional)' },
        yAxisLabel: { type: 'string', description: 'Y-axis label (optional)' },
        colorPalette: { 
          type: 'string', 
          enum: ['primary', 'pastel'],
          description: 'Color palette to use',
          default: 'primary'
        }
      },
      required: ['data', 'title']
    },
    function: createBarChart
  },
  
  create_line_chart: {
    name: 'create_line_chart',
    description: 'Create a line chart for time series or sequential data',
    parameters: {
      type: 'object',
      properties: {
        data: { type: 'object', description: 'Key-value pairs for chart data' },
        title: { type: 'string', description: 'Chart title' },
        xAxisLabel: { type: 'string', description: 'X-axis label (optional)' },
        yAxisLabel: { type: 'string', description: 'Y-axis label (optional)' },
        color: { type: 'string', description: 'Line color (optional)' }
      },
      required: ['data', 'title']
    },
    function: createLineChart
  },
  
  create_pie_chart: {
    name: 'create_pie_chart',
    description: 'Create a pie chart from categorical data',
    parameters: {
      type: 'object',
      properties: {
        data: { type: 'object', description: 'Key-value pairs for chart data' },
        title: { type: 'string', description: 'Chart title' },
        colorPalette: { 
          type: 'string', 
          enum: ['primary', 'pastel'],
          description: 'Color palette to use',
          default: 'primary'
        }
      },
      required: ['data', 'title']
    },
    function: createPieChart
  },
  
  create_scatter_plot: {
    name: 'create_scatter_plot',
    description: 'Create a scatter plot from two-dimensional data',
    parameters: {
      type: 'object',
      properties: {
        dataPoints: { 
          type: 'array', 
          description: 'Array of {x, y, label?} objects',
          items: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              label: { type: 'string' }
            },
            required: ['x', 'y']
          }
        },
        title: { type: 'string', description: 'Chart title' },
        xAxisLabel: { type: 'string', description: 'X-axis label (optional)' },
        yAxisLabel: { type: 'string', description: 'Y-axis label (optional)' },
        color: { type: 'string', description: 'Point color (optional)' }
      },
      required: ['dataPoints', 'title']
    },
    function: createScatterPlot
  },
  
  create_histogram: {
    name: 'create_histogram',
    description: 'Create a histogram from numeric data',
    parameters: {
      type: 'object',
      properties: {
        values: { 
          type: 'array', 
          description: 'Array of numeric values',
          items: { type: 'number' }
        },
        title: { type: 'string', description: 'Chart title' },
        bins: { type: 'number', description: 'Number of bins (optional)', default: 10 },
        xAxisLabel: { type: 'string', description: 'X-axis label (optional)' },
        yAxisLabel: { type: 'string', description: 'Y-axis label (optional)', default: 'Frequency' }
      },
      required: ['values', 'title']
    },
    function: createHistogram
  }
};

/**
 * Execute a visualization tool with given parameters
 */
export function executeVisualizationTool(
  toolName: string,
  parameters: any
): VisualizationResult {
  try {
    switch (toolName) {
      case 'create_bar_chart':
        return createBarChart(
          parameters.data,
          parameters.title,
          parameters.xAxisLabel,
          parameters.yAxisLabel,
          parameters.colorPalette
        );
      case 'create_line_chart':
        return createLineChart(
          parameters.data,
          parameters.title,
          parameters.xAxisLabel,
          parameters.yAxisLabel,
          parameters.color
        );
      case 'create_pie_chart':
        return createPieChart(
          parameters.data,
          parameters.title,
          parameters.colorPalette
        );
      case 'create_scatter_plot':
        return createScatterPlot(
          parameters.dataPoints,
          parameters.title,
          parameters.xAxisLabel,
          parameters.yAxisLabel,
          parameters.color
        );
      case 'create_histogram':
        return createHistogram(
          parameters.values,
          parameters.title,
          parameters.bins,
          parameters.xAxisLabel,
          parameters.yAxisLabel
        );
      default:
        return {
          success: false,
          error: `Unknown visualization tool: ${toolName}`,
          description: 'Visualization tool execution failed'
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      description: 'Visualization tool execution failed'
    };
  }
}

/**
 * Automatically suggest the best chart type based on analysis result
 */
export function suggestChartType(
  analysisResult: AnalysisResult,
  analysisType: string
): 'bar' | 'line' | 'pie' | 'scatter' | 'histogram' | null {
  if (!analysisResult.success || !analysisResult.data) {
    return null;
  }
  
  const data = analysisResult.data;
  
  // Time series data -> line chart
  if (analysisType === 'analyze_time_series') {
    return 'line';
  }
  
  // Grouped data -> bar chart or pie chart
  if (analysisType === 'group_by_column' || analysisType === 'get_top_values') {
    const entries = Object.entries(data);
    // If few categories (<=6), suggest pie chart, otherwise bar chart
    return entries.length <= 6 ? 'pie' : 'bar';
  }
  
  // Statistical data -> histogram
  if (analysisType === 'calculate_statistics') {
    return 'histogram';
  }
  
  // Correlation data -> scatter plot
  if (analysisType === 'calculate_correlation') {
    return 'scatter';
  }
  
  // Default to bar chart for other grouped data
  if (typeof data === 'object' && !Array.isArray(data)) {
    return 'bar';
  }
  
  return null;
}