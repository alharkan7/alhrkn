'use client'

import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ScatterController,
} from 'chart.js'
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
)

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'histogram'
  data: {
    labels: string[]
    datasets: {
      label: string
      data: number[]
      backgroundColor?: string[]
      borderColor?: string
      borderWidth?: number
    }[]
  }
  options?: any
}

interface ChartProps {
  chartData: ChartData
  className?: string
}

export function Chart({ chartData, className = '' }: ChartProps) {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    ...chartData.options,
  }

  const containerClass = `w-full h-64 ${className}`

  switch (chartData.type) {
    case 'bar':
    case 'histogram':
      return (
        <div className={containerClass}>
          <Bar data={chartData.data} options={defaultOptions} />
        </div>
      )
    case 'line':
      return (
        <div className={containerClass}>
          <Line data={chartData.data} options={defaultOptions} />
        </div>
      )
    case 'pie':
      return (
        <div className={containerClass}>
          <Pie data={chartData.data} options={defaultOptions} />
        </div>
      )
    case 'scatter':
      return (
        <div className={containerClass}>
          <Scatter data={chartData.data} options={defaultOptions} />
        </div>
      )
    default:
      return (
        <div className={`${containerClass} flex items-center justify-center bg-gray-100 rounded-lg`}>
          <p className="text-gray-500">Unsupported chart type: {chartData.type}</p>
        </div>
      )
  }
}

export default Chart