export interface TransactionData {
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

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'table'
  title: string
  data: Array<{ label: string; value: number; [key: string]: any }>
  xAxis?: string
  yAxis?: string
}

export interface AnalysisResult {
  textResponse: string
  chartData?: ChartData
  summary?: { [key: string]: number | string }
}

// Basic statistical functions
export function count(data: TransactionData[], field?: keyof TransactionData): number {
  if (!field) return data.length
  return data.filter(item => item[field] && item[field].trim() !== '').length
}

export function sum(data: TransactionData[], field: keyof TransactionData): number {
  return data.reduce((total, item) => {
    const value = parseFloat(item[field] as string)
    return total + (isNaN(value) ? 0 : value)
  }, 0)
}

export function average(data: TransactionData[], field: keyof TransactionData): number {
  const total = sum(data, field)
  const validCount = data.filter(item => {
    const value = parseFloat(item[field] as string)
    return !isNaN(value)
  }).length
  return validCount > 0 ? total / validCount : 0
}

export function min(data: TransactionData[], field: keyof TransactionData): number {
  const values = data.map(item => parseFloat(item[field] as string)).filter(v => !isNaN(v))
  return values.length > 0 ? Math.min(...values) : 0
}

export function max(data: TransactionData[], field: keyof TransactionData): number {
  const values = data.map(item => parseFloat(item[field] as string)).filter(v => !isNaN(v))
  return values.length > 0 ? Math.max(...values) : 0
}

// Group by functions
export function groupBy(data: TransactionData[], field: keyof TransactionData): { [key: string]: TransactionData[] } {
  return data.reduce((groups, item) => {
    const key = item[field] || 'Unknown'
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
    return groups
  }, {} as { [key: string]: TransactionData[] })
}

export function groupByWithSum(data: TransactionData[], groupField: keyof TransactionData, sumField: keyof TransactionData): ChartData {
  const groups = groupBy(data, groupField)
  const chartData: ChartData = {
    type: 'bar',
    title: `Total ${sumField} by ${groupField}`,
    data: [],
    xAxis: groupField as string,
    yAxis: sumField as string
  }

  Object.entries(groups).forEach(([key, items]) => {
    const total = sum(items, sumField)
    chartData.data.push({ label: key, value: total, count: items.length })
  })

  // Sort by value descending
  chartData.data.sort((a, b) => b.value - a.value)
  return chartData
}

export function groupByWithCount(data: TransactionData[], field: keyof TransactionData): ChartData {
  const groups = groupBy(data, field)
  const chartData: ChartData = {
    type: 'pie',
    title: `Count by ${field}`,
    data: [],
    xAxis: field as string,
    yAxis: 'Count'
  }

  Object.entries(groups).forEach(([key, items]) => {
    chartData.data.push({ label: key, value: items.length })
  })

  // Sort by value descending
  chartData.data.sort((a, b) => b.value - a.value)
  return chartData
}

// Time-based analysis
export function groupByMonth(data: TransactionData[], sumField?: keyof TransactionData): ChartData {
  const monthGroups: { [key: string]: TransactionData[] } = {}
  
  data.forEach(item => {
    const date = new Date(item.Date)
    if (!isNaN(date.getTime())) {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!monthGroups[monthKey]) monthGroups[monthKey] = []
      monthGroups[monthKey].push(item)
    }
  })

  const chartData: ChartData = {
    type: 'line',
    title: sumField ? `${sumField} by Month` : 'Transaction Count by Month',
    data: [],
    xAxis: 'Month',
    yAxis: sumField ? sumField as string : 'Count'
  }

  Object.entries(monthGroups)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([month, items]) => {
      const value = sumField ? sum(items, sumField) : items.length
      chartData.data.push({ label: month, value, count: items.length })
    })

  return chartData
}

// Advanced analysis functions
export function topCategories(data: TransactionData[], limit: number = 10): ChartData {
  return {
    ...groupByWithSum(data, 'Category', 'Amount'),
    data: groupByWithSum(data, 'Category', 'Amount').data.slice(0, limit)
  }
}

export function paymentMethodAnalysis(data: TransactionData[]): ChartData {
  return groupByWithCount(data, 'PaymentMethod')
}

export function regionAnalysis(data: TransactionData[]): ChartData {
  return groupByWithSum(data, 'Region', 'Amount')
}

export function statusAnalysis(data: TransactionData[]): ChartData {
  return groupByWithCount(data, 'Status')
}

// Query parser to detect analysis intent
export function parseAnalysisQuery(query: string, data: TransactionData[]): AnalysisResult {
  const lowerQuery = query.toLowerCase()
  
  // Count queries
  if (lowerQuery.includes('count') || lowerQuery.includes('how many')) {
    if (lowerQuery.includes('category') || lowerQuery.includes('categories')) {
      const chartData = groupByWithCount(data, 'Category')
      return {
        textResponse: `There are ${chartData.data.length} different categories with a total of ${count(data)} transactions.`,
        chartData,
        summary: { totalTransactions: count(data), uniqueCategories: chartData.data.length }
      }
    }
    if (lowerQuery.includes('region')) {
      const chartData = groupByWithCount(data, 'Region')
      return {
        textResponse: `Transactions are distributed across ${chartData.data.length} regions.`,
        chartData
      }
    }
    return {
      textResponse: `Total number of transactions: ${count(data)}`
    }
  }

  // Sum/Total queries
  if (lowerQuery.includes('total') || lowerQuery.includes('sum')) {
    if (lowerQuery.includes('category') || lowerQuery.includes('categories')) {
      const chartData = topCategories(data)
      const totalAmount = sum(data, 'Amount')
      return {
        textResponse: `Total transaction amount: $${totalAmount.toLocaleString()}. Here's the breakdown by category:`,
        chartData,
        summary: { totalAmount, categoryCount: chartData.data.length }
      }
    }
    if (lowerQuery.includes('region')) {
      const chartData = regionAnalysis(data)
      return {
        textResponse: `Here's the total transaction amount by region:`,
        chartData
      }
    }
    const totalAmount = sum(data, 'Amount')
    return {
      textResponse: `Total transaction amount: $${totalAmount.toLocaleString()}`
    }
  }

  // Average queries
  if (lowerQuery.includes('average') || lowerQuery.includes('mean')) {
    const avgAmount = average(data, 'Amount')
    return {
      textResponse: `Average transaction amount: $${avgAmount.toFixed(2)}`
    }
  }

  // Time-based queries
  if (lowerQuery.includes('month') || lowerQuery.includes('time') || lowerQuery.includes('trend')) {
    const chartData = groupByMonth(data, 'Amount')
    return {
      textResponse: `Here's the transaction trend over time:`,
      chartData
    }
  }

  // Payment method queries
  if (lowerQuery.includes('payment') || lowerQuery.includes('method')) {
    const chartData = paymentMethodAnalysis(data)
    return {
      textResponse: `Here's the breakdown of transactions by payment method:`,
      chartData
    }
  }

  // Status queries
  if (lowerQuery.includes('status')) {
    const chartData = statusAnalysis(data)
    return {
      textResponse: `Here's the breakdown of transactions by status:`,
      chartData
    }
  }

  // Default: return basic statistics
  const totalAmount = sum(data, 'Amount')
  const avgAmount = average(data, 'Amount')
  const transactionCount = count(data)
  
  return {
    textResponse: `Dataset Summary:\n- Total Transactions: ${transactionCount}\n- Total Amount: $${totalAmount.toLocaleString()}\n- Average Amount: $${avgAmount.toFixed(2)}\n\nTry asking about categories, regions, payment methods, or time trends for more detailed analysis.`,
    summary: {
      totalTransactions: transactionCount,
      totalAmount,
      averageAmount: avgAmount
    }
  }
}