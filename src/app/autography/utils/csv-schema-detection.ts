import Papa from 'papaparse';
import _ from 'lodash';
import * as ss from 'simple-statistics';

export interface ColumnSchema {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'mixed';
  nullable: boolean;
  unique: boolean;
  examples: any[];
  statistics?: {
    count: number;
    nullCount: number;
    uniqueCount: number;
    min?: number | Date;
    max?: number | Date;
    mean?: number;
    median?: number;
    mode?: any;
    standardDeviation?: number;
  };
}

export interface DatasetSchema {
  columns: ColumnSchema[];
  rowCount: number;
  summary: {
    totalColumns: number;
    numericColumns: number;
    stringColumns: number;
    dateColumns: number;
    booleanColumns: number;
    mixedColumns: number;
  };
}

/**
 * Detects the data type of a value
 */
function detectValueType(value: any): 'string' | 'number' | 'date' | 'boolean' | 'null' {
  if (value === null || value === undefined || value === '') {
    return 'null';
  }

  const stringValue = String(value).trim();
  
  // Boolean detection
  if (/^(true|false|yes|no|y|n|1|0)$/i.test(stringValue)) {
    return 'boolean';
  }

  // Number detection
  if (!isNaN(Number(stringValue)) && !isNaN(parseFloat(stringValue))) {
    return 'number';
  }

  // Date detection
  const dateValue = new Date(stringValue);
  if (!isNaN(dateValue.getTime()) && stringValue.length > 4) {
    // Additional checks for common date patterns
    if (/^\d{4}-\d{2}-\d{2}/.test(stringValue) || 
        /^\d{1,2}\/\d{1,2}\/\d{4}/.test(stringValue) ||
        /^\d{1,2}-\d{1,2}-\d{4}/.test(stringValue)) {
      return 'date';
    }
  }

  return 'string';
}

/**
 * Determines the dominant type from an array of detected types
 */
function getDominantType(types: string[]): 'string' | 'number' | 'date' | 'boolean' | 'mixed' {
  const typeCounts = _.countBy(types.filter(t => t !== 'null'));
  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  
  if (sortedTypes.length === 0) return 'string';
  if (sortedTypes.length === 1) return sortedTypes[0][0] as any;
  
  // If the dominant type represents more than 80% of non-null values, use it
  const totalNonNull = types.filter(t => t !== 'null').length;
  const dominantPercentage = sortedTypes[0][1] / totalNonNull;
  
  if (dominantPercentage > 0.8) {
    return sortedTypes[0][0] as any;
  }
  
  return 'mixed';
}

/**
 * Calculates statistics for a column based on its type
 */
function calculateColumnStatistics(values: any[], type: string): ColumnSchema['statistics'] {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  const nullCount = values.length - nonNullValues.length;
  const uniqueValues = _.uniq(nonNullValues);
  
  const modeEntry = _(nonNullValues).countBy().entries().maxBy('[1]');
  const baseStats = {
    count: values.length,
    nullCount,
    uniqueCount: uniqueValues.length,
    mode: modeEntry ? modeEntry[0] : undefined
  };

  if (type === 'number') {
    const numericValues = nonNullValues.map(v => parseFloat(v)).filter(v => !isNaN(v));
    if (numericValues.length > 0) {
      return {
        ...baseStats,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        mean: ss.mean(numericValues),
        median: ss.median(numericValues),
        standardDeviation: numericValues.length > 1 ? ss.standardDeviation(numericValues) : 0
      };
    }
  }

  if (type === 'date') {
    const dateValues = nonNullValues
      .map(v => new Date(v))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (dateValues.length > 0) {
      return {
        ...baseStats,
        min: dateValues[0],
        max: dateValues[dateValues.length - 1]
      };
    }
  }

  return baseStats;
}

/**
 * Analyzes CSV data and returns a comprehensive schema
 */
export function analyzeCSVSchema(csvData: any[]): DatasetSchema {
  if (!csvData || csvData.length === 0) {
    throw new Error('CSV data is empty or invalid');
  }

  const columnNames = Object.keys(csvData[0]);
  const columns: ColumnSchema[] = [];

  for (const columnName of columnNames) {
    const columnValues = csvData.map(row => row[columnName]);
    const detectedTypes = columnValues.map(detectValueType);
    const dominantType = getDominantType(detectedTypes);
    
    const nonNullValues = columnValues.filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = _.uniq(nonNullValues);
    
    const columnSchema: ColumnSchema = {
      name: columnName,
      type: dominantType,
      nullable: detectedTypes.includes('null'),
      unique: uniqueValues.length === nonNullValues.length,
      examples: _.sampleSize(uniqueValues, Math.min(5, uniqueValues.length)),
      statistics: calculateColumnStatistics(columnValues, dominantType)
    };

    columns.push(columnSchema);
  }

  const summary = {
    totalColumns: columns.length,
    numericColumns: columns.filter(c => c.type === 'number').length,
    stringColumns: columns.filter(c => c.type === 'string').length,
    dateColumns: columns.filter(c => c.type === 'date').length,
    booleanColumns: columns.filter(c => c.type === 'boolean').length,
    mixedColumns: columns.filter(c => c.type === 'mixed').length
  };

  return {
    columns,
    rowCount: csvData.length,
    summary
  };
}

/**
 * Parses CSV content and analyzes its schema
 */
export function parseAndAnalyzeCSV(csvContent: string): Promise<DatasetSchema> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep as strings for better type detection
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }
          const schema = analyzeCSVSchema(results.data);
          resolve(schema);
        } catch (error) {
          reject(error);
        }
      },
      error: (error: any) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      }
    });
  });
}

/**
 * Generates a human-readable description of the dataset schema
 */
export function generateSchemaDescription(schema: DatasetSchema): string {
  const { columns, rowCount, summary } = schema;
  
  let description = `Dataset contains ${rowCount} rows and ${summary.totalColumns} columns:\n\n`;
  
  // Column details
  columns.forEach(col => {
    description += `• **${col.name}** (${col.type})`;
    if (col.nullable) description += `, nullable`;
    if (col.unique) description += `, unique values`;
    
    if (col.statistics) {
      const stats = col.statistics;
      if (col.type === 'number' && stats.mean !== undefined) {
        description += ` - Range: ${stats.min} to ${stats.max}, Mean: ${stats.mean.toFixed(2)}`;
      } else if (col.type === 'date' && stats.min && stats.max) {
        description += ` - Range: ${stats.min} to ${stats.max}`;
      }
      description += ` (${stats.uniqueCount} unique values)`;
    }
    
    if (col.examples.length > 0) {
      description += ` - Examples: ${col.examples.slice(0, 3).join(', ')}`;
    }
    description += `\n`;
  });
  
  description += `\n**Summary**: ${summary.numericColumns} numeric, ${summary.stringColumns} text, ${summary.dateColumns} date, ${summary.booleanColumns} boolean columns.`;
  
  return description;
}