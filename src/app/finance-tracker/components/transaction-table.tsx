'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Filter, SortAsc, SortDesc, Calendar, Edit2, Check, X, Loader2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { convertDatabaseCategoriesToForm, FormCategory } from '../lib/icon-mapper'

interface TransactionRecord {
  id?: number;
  user_id?: number;
  timestamp?: string;
  date: string;
  amount: number;
  category: string;
  description?: string;
  source?: string;
  external_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface TransactionTableProps {
  expenses: TransactionRecord[];
  incomes: TransactionRecord[];
  loading: boolean;
  currentMonth: number;
  currentYear: number;
  onNavigateMonth: (direction: 'prev' | 'next') => void;
  getMonthName: (month: number) => string;
  onBackClick?: () => void;
  onRefreshData?: () => void;
}

type SortField = 'date' | 'amount' | 'category';
type SortDirection = 'asc' | 'desc';

export function TransactionTable({
  expenses,
  incomes,
  loading,
  currentMonth,
  currentYear,
  onNavigateMonth,
  getMonthName,
  onBackClick,
  onRefreshData
}: TransactionTableProps) {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [expenseCategories, setExpenseCategories] = useState<FormCategory[]>([])
  const [incomeCategories, setIncomeCategories] = useState<FormCategory[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    amount: '',
    category: '',
    description: ''
  })
  const [saving, setSaving] = useState(false)

  // Fetch user categories for filter options
  useEffect(() => {
    const fetchUserCategories = async () => {
      try {
        const response = await fetch('/api/finance-tracker/user-categories')
        if (response.ok) {
          const data = await response.json()
          const expenseCats = convertDatabaseCategoriesToForm(data.expense_categories || [])
          const incomeCats = convertDatabaseCategoriesToForm(data.income_categories || [])
          setExpenseCategories(expenseCats)
          setIncomeCategories(incomeCats)
        }
      } catch (error) {
        console.error('Error fetching user categories:', error)
      }
    }

    fetchUserCategories()
  }, [])

  // Calculate navigation limits
  const getDateLimits = () => {
    const allDates = [...expenses, ...incomes]
      .filter(item => item && item.date)
      .map(item => {
        try {
          const date = new Date(item.date)
          return isNaN(date.getTime()) ? null : date
        } catch {
          return null
        }
      })
      .filter(date => date !== null) as Date[]

    if (allDates.length === 0) {
      const now = new Date()
      return {
        minDate: new Date(now.getFullYear(), now.getMonth(), 1),
        maxDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
    }

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))

    return {
      minDate: new Date(minDate.getFullYear(), minDate.getMonth(), 1),
      maxDate: new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0)
    }
  }

  const { minDate, maxDate } = getDateLimits()
  const prevMonth = new Date(currentYear, currentMonth - 1, 1)
  const nextMonth = new Date(currentYear, currentMonth + 1, 1)

  const canNavigatePrev = prevMonth >= minDate
  const canNavigateNext = nextMonth <= maxDate

  // Filter and sort data
  const processedData = useMemo(() => {
    const dataToUse = activeTab === 'expense' ? expenses : incomes
    
    // Filter by current month
    const filteredByMonth = dataToUse.filter(item => {
      if (!item || !item.date) return false
      try {
        const itemDate = new Date(item.date)
        if (isNaN(itemDate.getTime())) return false
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
      } catch {
        return false
      }
    })

    // Filter by category
    const filteredByCategory = categoryFilter === 'all' 
      ? filteredByMonth 
      : filteredByMonth.filter(item => item.category === categoryFilter)

    // Sort data
    const sortedData = [...filteredByCategory].sort((a, b) => {
      let aValue, bValue

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime()
          bValue = new Date(b.date).getTime()
          break
        case 'amount':
          aValue = typeof a.amount === 'number' ? a.amount : parseFloat(String(a.amount) || '0')
          bValue = typeof b.amount === 'number' ? b.amount : parseFloat(String(b.amount) || '0')
          break
        case 'category':
          aValue = a.category.toLowerCase()
          bValue = b.category.toLowerCase()
          break
        default:
          return 0
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return sortedData
  }, [activeTab, expenses, incomes, currentMonth, currentYear, categoryFilter, sortField, sortDirection])

  // Get available categories for current tab
  const availableCategories = useMemo(() => {
    const dataToUse = activeTab === 'expense' ? expenses : incomes
    const filteredData = dataToUse.filter(item => {
      if (!item || !item.date) return false
      try {
        const itemDate = new Date(item.date)
        if (isNaN(itemDate.getTime())) return false
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
      } catch {
        return false
      }
    })
    
    const uniqueCategories = Array.from(new Set(filteredData.map(item => item.category))).filter(Boolean)
    return uniqueCategories
  }, [activeTab, expenses, incomes, currentMonth, currentYear])

  // Reset category filter when switching tabs or months
  useEffect(() => {
    setCategoryFilter('all')
  }, [activeTab, currentMonth, currentYear])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const day = date.getDate()
      const month = date.getMonth() + 1
      return `${day}/${month}`
    } catch {
      return dateString
    }
  }

  const formatAmount = (amount: number | string) => {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount?.toString() || '0')
    return `Rp ${numAmount.toLocaleString('id-ID')}`
  }

  const extractCategoryLabel = (categoryValue: string) => {
    // Remove emoji and extract the main text
    return categoryValue.replace(/^[^\w\s]+\s*/, '').trim()
  }

  const handleEdit = (transaction: TransactionRecord) => {
    const transactionId = `${transaction.id || 'temp'}-${transaction.date}-${transaction.amount}`
    setEditingId(transactionId)
    setEditForm({
      amount: parseFloat(transaction.amount.toString()).toString(), // Remove trailing decimals
      category: transaction.category,
      description: transaction.description || ''
    })
  }

  const handleSaveEdit = async (transaction: TransactionRecord) => {
    try {
      if (!transaction.id) {
        console.error('Cannot update transaction without ID')
        return
      }

      const amount = parseFloat(editForm.amount)
      if (isNaN(amount) || amount < 0) {
        console.error('Invalid amount')
        return
      }

      setSaving(true)

      const updateData = {
        id: transaction.id,
        date: transaction.date, // Keep original date for now
        amount: amount,
        category: editForm.category,
        description: editForm.description || undefined
      }

      // Determine API endpoint based on active tab
      const endpoint = activeTab === 'expense' ? '/api/finance-tracker/update-expense' : '/api/finance-tracker/update-income'

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        console.log('Transaction updated successfully')
        // Refresh data from parent component
        if (onRefreshData) {
          onRefreshData()
        }
        setEditingId(null)
        setEditForm({ amount: '', category: '', description: '' })
      } else {
        const errorData = await response.json()
        console.error('Failed to update transaction:', errorData)
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
      // You could show a toast notification here
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({ amount: '', category: '', description: '' })
  }

  if (loading) {
    return (
      <div className="space-y-4 w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <button disabled className="p-1 rounded-full text-gray-300 cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-gray-600 text-sm">Loading...</p>
          <button disabled className="p-1 rounded-full text-gray-300 cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Loading content */}
        <div className="space-y-4">
          <div className="h-12 bg-gray-100 rounded animate-pulse"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full h-full">
      {/* Header with back button and month navigation */}
      <div className="flex items-center justify-between mb-4">
        {/* Back button */}
        {onBackClick && (
          <Button
            onClick={onBackClick}
            variant="neutral"
            size="sm"
            className="p-1"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateMonth('prev')}
            disabled={!canNavigatePrev}
            className={`p-1 rounded-full transition-colors ${
              canNavigatePrev
                ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-gray-600 text-sm font-medium">
            {getMonthName(currentMonth)} {currentYear}
          </p>
          <button
            onClick={() => onNavigateMonth('next')}
            disabled={!canNavigateNext}
            className={`p-1 rounded-full transition-colors ${
              canNavigateNext
                ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Spacer for centering */}
        <div className="w-6" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'expense' | 'income')}>
        <TabsList className="grid w-full grid-cols-2 h-11">
          <TabsTrigger value="expense" className="text-xs">
            Pengeluaran
          </TabsTrigger>
          <TabsTrigger value="income" className="text-xs">
            Pemasukan
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-3 mt-4">
          {/* Filters and Sort */}
          <div className="flex gap-2 items-center">
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <div className="flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  <SelectValue placeholder="Kategori" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">Semua Kategori</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Buttons */}
            <div className="flex gap-1">
              <Button
                variant="neutral"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => handleSort('date')}
              >
                <Calendar className="w-3 h-3 mr-1" />
                {sortField === 'date' && (
                  sortDirection === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                )}
              </Button>
              <Button
                variant="neutral"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => handleSort('amount')}
              >
                Rp
                {sortField === 'amount' && (
                  sortDirection === 'asc' ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />
                )}
              </Button>
              <Button
                variant="neutral"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => handleSort('category')}
              >
                Cat
                {sortField === 'category' && (
                  sortDirection === 'asc' ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />
                )}
              </Button>
            </div>
          </div>

          {/* Transaction List */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pb-2">
            {processedData.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Tidak ada transaksi untuk bulan ini
              </div>
            ) : (
              processedData.map((transaction, index) => {
                const transactionId = `${transaction.id || index}-${transaction.date}-${transaction.amount}`
                const isEditing = editingId === transactionId
                const currentCategories = activeTab === 'expense' ? expenseCategories : incomeCategories
                
                return (
                  <div
                    key={transactionId}
                    className="relative p-3 bg-gray-50 rounded-lg border"
                  >
                    {!isEditing ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {transaction.category} <span className="text-xs text-gray-500">{formatDate(transaction.date)}</span>
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-semibold ${
                                  activeTab === 'expense' ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {activeTab === 'expense' ? '-' : '+'}
                                  {formatAmount(transaction.amount)}
                                </p>
                              </div>
                            </div>
                            {transaction.description && (
                              <p className="text-xs text-gray-600 mt-1 truncate">
                                {transaction.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Edit Button */}
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="absolute bottom-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Edit transaction"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Edit Form */}
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              value={editForm.amount}
                              onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                              placeholder="Amount"
                              className="h-8 text-xs rounded-lg flex-1"
                            />
                            <Select
                              value={editForm.category}
                              onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
                            >
                              <SelectTrigger className="h-8 text-xs flex-1">
                                <SelectValue placeholder="Category" />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                {currentCategories.map((category) => (
                                  <SelectItem key={category.value} value={category.value}>
                                    {category.value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="text"
                              value={editForm.description}
                              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Description (optional)"
                              className="h-8 text-xs rounded-lg flex-1"
                            />
                            {/* Save/Cancel Buttons */}
                            <div className="flex flex-shrink-0">
                              <button
                                onClick={() => handleSaveEdit(transaction)}
                                disabled={saving}
                                className="p-1 text-green-600 hover:text-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Save changes"
                              >
                                {saving ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1 text-red-600 hover:text-red-700 transition-colors"
                                title="Cancel edit"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Summary - Fixed at bottom */}
          {processedData.length > 0 && (
            <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-sm px-4">
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Total ({processedData.length} transaksi):
                  </span>
                  <span className={`text-sm font-bold ${
                    activeTab === 'expense' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatAmount(
                      processedData.reduce((sum, transaction) => {
                        const amount = typeof transaction.amount === 'number' 
                          ? transaction.amount 
                          : parseFloat(String(transaction.amount) || '0')
                        return sum + (isNaN(amount) ? 0 : amount)
                      }, 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
