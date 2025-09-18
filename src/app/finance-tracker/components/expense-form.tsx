'use client'

import { useState, useEffect } from 'react'
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, TrendingUp, TrendingDown, Wallet, Loader2 } from 'lucide-react'
import { convertDatabaseCategoriesToForm, FormCategory } from '../lib/icon-mapper'
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Indonesian month names
const indonesianMonths = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
]

// Format date in Indonesian format: "D MMM YYYY" (e.g., "7 Agu 2025")
function formatIndonesianDate(date: Date): string {
  const day = date.getDate()
  const month = indonesianMonths[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

interface ExpenseFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  loading: boolean;
  onCategorySwitch?: (category: 'income' | 'expense') => void;
  isDemoMode?: boolean;
}

interface FormData {
  amount: number;
  category: string;
  date: string;
  note: string;
  type: 'expense' | 'income';
}

export function ExpenseForm({ onSubmit, loading, onCategorySwitch, isDemoMode = false }: ExpenseFormProps) {
  const [activeCategory, setActiveCategory] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [date, setDate] = useState<Date>(new Date()) // Initialize with today's date
  const [note, setNote] = useState('')
  const [expenseCategories, setExpenseCategories] = useState<FormCategory[]>([])
  const [incomeCategories, setIncomeCategories] = useState<FormCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [validationErrors, setValidationErrors] = useState({
    amount: false,
    category: false,
    date: false
  })

  // Fetch user categories
  const fetchUserCategories = async () => {
    // In demo mode, load default categories directly
    if (isDemoMode) {
      await setDefaultCategories()
      return
    }

    try {
      const response = await fetch('/api/finance-tracker/user-categories')
      if (response.ok) {
        const data = await response.json()
        const expenseCats = convertDatabaseCategoriesToForm(data.expense_categories || [])
        const incomeCats = convertDatabaseCategoriesToForm(data.income_categories || [])
        setExpenseCategories(expenseCats)
        setIncomeCategories(incomeCats)
      } else {
        console.error('Failed to fetch user categories, using defaults')
        // Set default categories on API failure
        await setDefaultCategories()
      }
    } catch (error) {
      console.error('Error fetching user categories, using defaults:', error)
      // Set default categories on error
      await setDefaultCategories()
    } finally {
      setCategoriesLoading(false)
    }
  }

  // Set default categories
  const setDefaultCategories = async () => {
    try {
      const { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } = await import('@/app/finance-tracker/schema/schema')
      const expenseCats = convertDatabaseCategoriesToForm(DEFAULT_EXPENSE_CATEGORIES)
      const incomeCats = convertDatabaseCategoriesToForm(DEFAULT_INCOME_CATEGORIES)
      setExpenseCategories(expenseCats)
      setIncomeCategories(incomeCats)
    } catch (error) {
      console.error('Error setting default categories:', error)
      // Fallback to empty arrays if import fails
      setExpenseCategories([])
      setIncomeCategories([])
    } finally {
      setCategoriesLoading(false)
    }
  }

  useEffect(() => {
    fetchUserCategories()
  }, [])

  // Notify parent component when category switches
  useEffect(() => {
    if (onCategorySwitch) {
      onCategorySwitch(activeCategory)
    }
  }, [activeCategory, onCategorySwitch])

  const handleSave = async () => {
    if (categoriesLoading) {
      toast.warning('Please wait for categories to load')
      return
    }

    const currentCategories = activeCategory === 'expense' ? expenseCategories : incomeCategories
    if (currentCategories.length === 0 && !categoriesLoading) {
      toast.error('No categories available. Please try refreshing the page.')
      return
    }

    // Clear previous validation errors
    setValidationErrors({ amount: false, category: false, date: false })

    // Validate required fields
    const errors = { amount: false, category: false, date: false }
    const missingFields = []

    // Validate amount
    const amountValue = parseFloat(amount)
    if (!amount.trim() || isNaN(amountValue) || amountValue <= 0) {
      errors.amount = true
      missingFields.push('Amount (must be greater than 0)')
    }

    // Validate category
    if (!selectedCategory) {
      errors.category = true
      missingFields.push('Category')
    }

    // Validate date
    if (!date) {
      errors.date = true
      missingFields.push('Date')
    }

    // Set validation errors
    setValidationErrors(errors)

    if (missingFields.length > 0) {
      toast.warning(`Please fill in the required fields: ${missingFields.join(', ')}`)
      return
    }

    const formData: FormData = {
      amount: amountValue,
      category: selectedCategory,
      date: format(date, 'yyyy-MM-dd'),
      note: note || '',
      type: activeCategory
    }

    try {
      await onSubmit(formData)

      // Reset form after successful submission
      setAmount('')
      setSelectedCategory('')
      setDate(new Date()) // Reset to today's date
      setNote('')
      setValidationErrors({ amount: false, category: false, date: false })
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Form submission error:', error)
    }
  }

  return (
    <div className="space-y-4 w-full max-w-sm flex flex-col mt-2">
      {/* Category Buttons */}
      <div className="flex gap-2 w-full">
        <Button
          variant={activeCategory === 'expense' ? "default" : "neutral"}
          className="flex-1 h-8 text-xs rounded-full"
          onClick={() => {
            setActiveCategory('expense')
            setSelectedCategory('') // Clear selected category when switching
            setDate(new Date()) // Set date to today when switching to expense
            // Clear validation errors when switching categories
            setValidationErrors({ amount: false, category: false, date: false })
          }}
        >
          <TrendingDown className="w-3 h-3 mr-1" />
          Pengeluaran
        </Button>
        <Button
          variant={activeCategory === 'income' ? "default" : "neutral"}
          className="flex-1 h-8 text-xs rounded-full"
          onClick={() => {
            setActiveCategory('income')
            setSelectedCategory('') // Clear selected category when switching
            setDate(new Date()) // Set date to today when switching to income
            // Clear validation errors when switching categories
            setValidationErrors({ amount: false, category: false, date: false })
          }}
        >
          <TrendingUp className="w-3 h-3 mr-1" />
          Pemasukan
        </Button>


      </div>

      {/* Input Form */}
      <div className="space-y-4 w-full">
        {/* Amount Input */}
        <div className="px-4 space-y-4 w-full">
          <div className="w-full">
            <div className="relative w-full">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xl text-secondary-foreground/50 font-medium">
                Rp
              </span>
              <input
                type="text"
                id="amount"
                placeholder="0"
                inputMode="numeric"
                required
                value={amount ? new Intl.NumberFormat('id-ID').format(Number(amount)) : ''}
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/\./g, '');
                  if (/^\d*$/.test(numericValue)) {
                    setAmount(numericValue);
                    // Clear amount validation error when user starts typing or clears the field
                    if (validationErrors.amount) {
                      setValidationErrors(prev => ({ ...prev, amount: false }))
                    }
                  }
                }}
                onBlur={() => {
                  // Validate amount on blur - ensure it's not zero or negative
                  const numValue = parseFloat(amount);
                  if (amount && (isNaN(numValue) || numValue <= 0)) {
                    setValidationErrors(prev => ({ ...prev, amount: true }))
                  }
                }}
                className={cn(
                  "text-xl h-[3rem] leading-[3rem] font-medium border-0 border-b rounded-none focus:placeholder:opacity-0 focus:border-opacity-0 focus:outline-none focus:ring-0 px-0 placeholder:text-secondary-foreground/50 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full pl-[3rem] bg-transparent transition-colors",
                  validationErrors.amount
                    ? "border-red-500 focus:border-red-500"
                    : "border-secondary-foreground/50"
                )}
              />
            </div>
          </div>

          {/* Category & Date Row */}
          <div className="flex gap-4 w-full">
            {/* Category Select */}
            <div className="flex-1">
              <Select
                value={selectedCategory}
                onValueChange={(value) => {
                  setSelectedCategory(value)
                  // Clear category validation error when user selects a category
                  if (validationErrors.category) {
                    setValidationErrors(prev => ({ ...prev, category: false }))
                  }
                }}
                disabled={categoriesLoading}
              >
                <SelectTrigger className={cn(
                  "flex items-center gap-2 w-full px-0 py-2 text-sm text-left bg-transparent border-0 border-b rounded-none focus:outline-none focus:ring-0 hover:bg-transparent disabled:opacity-50 transition-colors",
                  validationErrors.category
                    ? "border-red-500 focus:border-red-500"
                    : "border-secondary-foreground/50 focus:border-secondary-foreground"
                )}>
                  <div className="flex items-center gap-2">
                    {selectedCategory ? (
                      (() => {
                        const category = (activeCategory === 'expense' ? expenseCategories : incomeCategories)
                          .find(cat => cat.value === selectedCategory);
                        return category ? (
                          <span className="truncate">{category.value}</span>
                        ) : null;
                      })()
                    ) : (
                      <>
                        {categoriesLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 text-secondary-foreground/50" />
                        ) : null}
                        <span className="text-secondary-foreground/50">
                          {categoriesLoading ? 'Loading...' : 'Kategori'}
                        </span>
                      </>
                    )}
                  </div>
                </SelectTrigger>
                <SelectContent className="w-full bg-white">
                  {(() => {
                    const currentCategories = activeCategory === 'expense' ? expenseCategories : incomeCategories
                    if (currentCategories.length === 0) {
                      return (
                        <div className="p-2 text-center text-sm text-secondary-foreground/50">
                          {categoriesLoading ? 'Loading categories...' : 'No categories available'}
                        </div>
                      )
                    }
                    return currentCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        <span className="truncate">{category.value}</span>
                      </SelectItem>
                    ))
                  })()}
                </SelectContent>
              </Select>
            </div>

            {/* Date Picker */}
            <div className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "flex items-center gap-2 w-full h-10 px-0 py-2 text-sm text-left bg-transparent border-0 border-b rounded-none focus:outline-none focus:ring-0 hover:bg-transparent transition-colors",
                    validationErrors.date
                      ? "border-red-500 focus:border-red-500"
                      : "border-secondary-foreground/50 focus:border-secondary-foreground"
                  )}>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                      <span className={cn("truncate", !date && "text-secondary-foreground/50")}>
                        {date ? formatIndonesianDate(date) : "Tanggal"}
                      </span>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-lg border-0 shadow-lg" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(day) => {
                      if (day) {
                        setDate(day)
                        // Clear date validation error when user selects a date
                        if (validationErrors.date) {
                          setValidationErrors(prev => ({ ...prev, date: false }))
                        }
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Note Input */}
          <div className="w-full">
            <textarea
              id="note"
              placeholder="Catatan..."
              className="resize-none px-0 border-0 border-b border-secondary-foreground/50 rounded-none focus:ring-0 focus-visible:ring-0 focus:outline-none placeholder:text-secondary-foreground/50 w-full align-bottom placeholder:bottom-1 placeholder:left-0 flex h-[2rem] focus:placeholder:opacity-0 max-h-none overflow-hidden bg-transparent"
              value={note}
              onChange={(e) => {
                e.target.style.height = '2rem';
                e.target.style.height = e.target.scrollHeight + 'px';
                setNote(e.target.value);
              }}
            />
          </div>
        </div>

        {/* Save Button */}
        <Button
          variant="noShadow"
          onClick={handleSave}
          disabled={loading}
          className="w-full h-8 text-sm font-medium rounded-full"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Wallet className="w-3 h-3 mr-1" />
          )}
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
