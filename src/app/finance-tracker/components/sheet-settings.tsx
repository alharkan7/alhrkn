'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle, Save, X, Smile, Check, Pencil, Download } from 'lucide-react'
import { Category } from '@/app/finance-tracker/schema/schema'
import { toast } from "sonner"
import * as XLSX from 'xlsx'

interface SettingsProps {
  userEmail: string;
  expenseCategories: Category[];
  incomeCategories: Category[];
  loading: boolean;
  onCategoriesUpdated?: () => void;
}

export function Settings({
  userEmail,
  expenseCategories,
  incomeCategories,
  loading,
  onCategoriesUpdated
}: SettingsProps) {
  const [editingExpenseCategories, setEditingExpenseCategories] = useState<Category[]>(expenseCategories)
  const [editingIncomeCategories, setEditingIncomeCategories] = useState<Category[]>(incomeCategories)
  const [editingEmojiIndex, setEditingEmojiIndex] = useState<number | null>(null)
  const [editingEmojiType, setEditingEmojiType] = useState<'expense' | 'income' | null>(null)
  const [editingExpenseMode, setEditingExpenseMode] = useState(false)
  const [editingIncomeMode, setEditingIncomeMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Update state when props change
  useEffect(() => {
    setEditingExpenseCategories(expenseCategories)
    setEditingIncomeCategories(incomeCategories)
  }, [expenseCategories, incomeCategories])


  // Handle category editing
  const updateCategory = (type: 'expense' | 'income', index: number, field: 'value' | 'label', value: string) => {
    const categories = type === 'expense' ? [...editingExpenseCategories] : [...editingIncomeCategories]
    const currentCategory = categories[index]

    // When updating label, also update the text part of value (keeping the emoji)
    if (field === 'label') {
      const emoji = currentCategory.value.split(' ')[0] || '' // Get emoji from current value
      const newValue = emoji ? `${emoji} ${value}` : value
      categories[index] = { ...currentCategory, label: value, value: newValue }
    } else {
      // When updating value directly, keep it as is
      categories[index] = { ...currentCategory, [field]: value }
    }

    if (type === 'expense') {
      setEditingExpenseCategories(categories)
    } else {
      setEditingIncomeCategories(categories)
    }
  }

  // Common emojis for category selection
  const commonEmojis = [
    '🍔', '🥫', '🍕', '🍜', '🥗', '🍎', '🍌', '🥑', '🍞', '🥛',
    '🚗', '⛽', '🚌', '🚕', '🚲', '🏠', '🏢', '🏪', '🏥', '🎓',
    '🍿', '🎬', '🎵', '🎮', '🎲', '📚', '✈️', '🏖️', '🎁', '💝',
    '💊', '🏥', '🦷', '👓', '💄', '🧾', '💡', '🔧', '🛠️', '💰',
    '💵', '💳', '🏦', '📊', '💼', '✍️', '🎯', '📱', '💻', '🖥️',
    '🛒', '🛍️', '👕', '👟', '⌚', '💎', '🏺', '🛋️', '🧹', '🧺',
    '🏃', '💪', '🧘', '🎨', '🎭', '📸', '🎤', '🎸', '⚽', '🏀',
    '🎾', '🏊', '🚴', '⛷️', '🏂', '🎪', '🎢', '🎨', '🎭', '🎪',
    '💻', '📱', '📺', '🎵', '📖', '✈️', '🚗', '🏠', '🍽️', '☕',
    '🍺', '🍷', '🍹', '🎂', '🍰', '🍦', '🍪', '🍩', '🍿', '🍫'
  ]

  const startEditingEmoji = (type: 'expense' | 'income', index: number) => {
    setEditingEmojiIndex(index)
    setEditingEmojiType(type)
  }

  const updateEmoji = (type: 'expense' | 'income', index: number, emoji: string) => {
    const categories = type === 'expense' ? [...editingExpenseCategories] : [...editingIncomeCategories]
    const currentCategory = categories[index]
    const currentValue = currentCategory.value

    // Update the first character (emoji) while keeping the rest of the text
    const parts = currentValue.split(' ')
    let newValue: string
    let newLabel: string

    if (parts.length > 1) {
      // Has text after emoji, keep the text part
      newValue = `${emoji} ${parts.slice(1).join(' ')}`
      newLabel = parts.slice(1).join(' ')
    } else {
      // No text after emoji, use emoji as both value and label
      newValue = emoji
      newLabel = emoji
    }

    categories[index] = { ...currentCategory, value: newValue, label: newLabel }

    if (type === 'expense') {
      setEditingExpenseCategories(categories)
    } else {
      setEditingIncomeCategories(categories)
    }

    // Close emoji picker
    setEditingEmojiIndex(null)
    setEditingEmojiType(null)
  }

  const cancelEmojiEdit = () => {
    setEditingEmojiIndex(null)
    setEditingEmojiType(null)
  }

  const toggleExpenseEditMode = () => {
    setEditingExpenseMode(!editingExpenseMode)
    // Close any open emoji pickers when toggling edit mode
    if (editingEmojiType === 'expense') {
      setEditingEmojiIndex(null)
      setEditingEmojiType(null)
    }
  }

  const toggleIncomeEditMode = () => {
    setEditingIncomeMode(!editingIncomeMode)
    // Close any open emoji pickers when toggling edit mode
    if (editingEmojiType === 'income') {
      setEditingEmojiIndex(null)
      setEditingEmojiType(null)
    }
  }

  // Export user data to XLSX
  const handleExportData = async () => {
    setExporting(true)
    try {
      // Fetch all user data
      const response = await fetch('/api/finance-tracker/fetch-all-data')

      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }

      const data = await response.json()
      const expenses = data.expenses || []
      const incomes = data.incomes || []
      const budgets = data.budgets || []

      // Create workbook
      const wb = XLSX.utils.book_new()

      // Helper functions for data formatting
      const formatDate = (dateStr: string) => {
        if (!dateStr) return ''
        try {
          const date = new Date(dateStr)
          return date.toISOString().split('T')[0] // YYYY-MM-DD format
        } catch {
          return dateStr
        }
      }

      const formatAmount = (amount: any) => {
        if (amount === null || amount === undefined) return 0
        const num = typeof amount === 'number' ? amount : parseFloat(amount.toString())
        return Math.round(num) // Remove decimals, round to nearest integer
      }

      const formatTimestamp = (timestampStr: string) => {
        if (!timestampStr) return ''
        try {
          const date = new Date(timestampStr)
          return date.toISOString().replace('T', ' ').split('.')[0] // YYYY-MM-DD HH:MM:SS format
        } catch {
          return timestampStr
        }
      }

      // Format expenses data
      const expensesData = expenses.map((expense: any) => ({
        'Date': formatDate(expense.date),
        'Amount': formatAmount(expense.amount),
        'Category': expense.category,
        'Description': expense.description || expense.notes || '',
        'Created At': formatTimestamp(expense.created_at)
      }))

      // Format incomes data
      const incomesData = incomes.map((income: any) => ({
        'Date': formatDate(income.date),
        'Amount': formatAmount(income.amount),
        'Category': income.category,
        'Description': income.description || '',
        'Created At': formatTimestamp(income.created_at)
      }))

      // Format budgets data
      const budgetsData = budgets.map((budget: any) => ({
        'Date': formatDate(budget.date),
        'Amount': formatAmount(budget.amount),
        'Created At': budget.timestamp
      }))

      // Create worksheets
      const wsExpenses = XLSX.utils.json_to_sheet(expensesData)
      const wsIncomes = XLSX.utils.json_to_sheet(incomesData)
      const wsBudgets = XLSX.utils.json_to_sheet(budgetsData)

      // Add worksheets to workbook
      XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses')
      XLSX.utils.book_append_sheet(wb, wsIncomes, 'Incomes')
      XLSX.utils.book_append_sheet(wb, wsBudgets, 'Budget')

      // Generate filename with current date
      const now = new Date()
      const filename = `expense-tracker-data-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.xlsx`

      // Save file
      XLSX.writeFile(wb, filename)

      toast.success('Data exported successfully!')
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  // Save all settings
  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/finance-tracker/user-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseCategories: editingExpenseCategories,
          incomeCategories: editingIncomeCategories
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      toast.success('Settings saved successfully!')

      // Exit edit modes after saving
      setEditingExpenseMode(false)
      setEditingIncomeMode(false)

      // Notify parent component to refresh categories
      if (onCategoriesUpdated) {
        onCategoriesUpdated()
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }


  // Main settings UI with scrollable content
  return (
    <div className="flex flex-col h-full max-h-[calc(80vh-8rem)]">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <div className="space-y-6">

          {/* Expense Categories Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Expense Categories</h3>
              <Button
                size="sm"
                variant="neutral"
                onClick={toggleExpenseEditMode}
                className={`p-1 ${editingExpenseMode ? 'bg-gray-100 text-gray-600' : 'hover:bg-gray-100'}`}
                title={editingExpenseMode ? 'Exit edit mode' : 'Edit categories'}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {editingExpenseCategories.map((category, index) => (
                <div key={index} className="flex flex-col gap-2 p-2 border border-gray-200 rounded rounded-full">
                  {/* Category Row */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditingEmoji('expense', index)}
                      className={`rounded-full text-lg hover:bg-gray-100 rounded px-1 py-0.5 transition-colors cursor-pointer ${
                        editingExpenseMode ? '' : 'pointer-events-none opacity-60'
                      }`}
                      title="Click to change emoji"
                      disabled={!editingExpenseMode}
                    >
                      {category.value.split(' ')[0]}
                    </button>
                    {editingExpenseMode ? (
                      <Input
                        value={category.label}
                        onChange={(e) => updateCategory('expense', index, 'label', e.target.value)}
                        className="flex-1 text-sm rounded-full bg-gray-50 focus:outline-none focus:ring-0 border-none"
                        placeholder="Category name"
                      />
                    ) : (
                      <span className="flex-1 text-sm">{category.label}</span>
                    )}
                  </div>

                  {/* Emoji Picker */}
                  {editingEmojiType === 'expense' && editingEmojiIndex === index && (
                    <div className="bg-gray-50 border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Smile className="w-4 h-4" />
                          <span className="text-sm font-medium">Choose an emoji:</span>
                        </div>
                        <Button size="sm" variant="neutral" onClick={cancelEmojiEdit}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-10 gap-1 max-h-32 overflow-y-auto">
                        {commonEmojis.map((emoji, emojiIndex) => (
                          <button
                            key={emojiIndex}
                            onClick={() => updateEmoji('expense', index, emoji)}
                            className="text-lg hover:bg-gray-200 rounded p-1 transition-colors"
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Income Categories Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Income Categories</h3>
              <Button
                size="sm"
                variant="neutral"
                onClick={toggleIncomeEditMode}
                className={`p-1 ${editingIncomeMode ? 'bg-gray-100 text-gray-600' : 'hover:bg-gray-100'}`}
                title={editingIncomeMode ? 'Exit edit mode' : 'Edit categories'}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {editingIncomeCategories.map((category, index) => (
                <div key={index} className="flex flex-col gap-2 p-2 border border-gray-200 rounded rounded-full">
                  {/* Category Row */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditingEmoji('income', index)}
                      className={`rounded-full text-lg hover:bg-gray-100 rounded px-1 py-0.5 transition-colors cursor-pointer ${
                        editingIncomeMode ? '' : 'pointer-events-none opacity-60'
                      }`}
                      title="Click to change emoji"
                      disabled={!editingIncomeMode}
                    >
                      {category.value.split(' ')[0]}
                    </button>
                    {editingIncomeMode ? (
                      <Input
                        value={category.label}
                        onChange={(e) => updateCategory('income', index, 'label', e.target.value)}
                        className="flex-1 text-sm rounded-full bg-gray-50 focus:outline-none focus:ring-0 border-none"
                        placeholder="Category name"
                      />
                    ) : (
                      <span className="flex-1 text-sm">{category.label}</span>
                    )}
                  </div>

                  {/* Emoji Picker */}
                  {editingEmojiType === 'income' && editingEmojiIndex === index && (
                    <div className="bg-gray-50 border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Smile className="w-4 h-4" />
                          <span className="text-sm font-medium">Choose an emoji:</span>
                        </div>
                        <Button size="sm" variant="neutral" onClick={cancelEmojiEdit}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-10 gap-1 max-h-32 overflow-y-auto">
                        {commonEmojis.map((emoji, emojiIndex) => (
                          <button
                            key={emojiIndex}
                            onClick={() => updateEmoji('income', index, emoji)}
                            className="text-lg hover:bg-gray-200 rounded p-1 transition-colors"
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Fixed Footer with Save and Export Buttons */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white pt-2 pb-2 mt-2">
        <div className="flex justify-between items-center px-4 gap-3">
          <Button
            onClick={handleExportData}
            disabled={exporting || loading}
            variant="neutral"
            className="flex items-center gap-2 rounded-full border-gray-300 text-sm"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Data'}
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-full"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
