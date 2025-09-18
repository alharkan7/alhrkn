'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Edit3, Save, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface BudgetData {
  timestamp: string;
  date: string;
  amount: number;
  notes: string;
}

interface MonthlyBudget {
  month: string; // YYYY-MM format
  amount: number;
  notes: string;
  lastUpdated: string;
}

interface BudgetDrawerProps {
  isOpen: boolean;
  onClose: (hasChanges?: boolean) => void;
  currentMonth?: number;
  currentYear?: number;
}

export function BudgetDrawer({ isOpen, onClose, currentMonth: propCurrentMonth, currentYear: propCurrentYear }: BudgetDrawerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [budgetAmount, setBudgetAmount] = useState<number>(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editingAmount, setEditingAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [allBudgets, setAllBudgets] = useState<MonthlyBudget[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [dataSaved, setDataSaved] = useState(false)

  // Format month and year for display
  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  }

  // Get the first and last day of the current month
  const getMonthRange = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    return {
      firstDay: `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`,
      lastDay: `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
    }
  }

  // Navigate to previous month
  const goToPreviousMonth = () => {
    // Reset editing state when changing months
    setIsEditing(false)
    setEditingAmount('')
    setHasChanges(false)
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  // Navigate to next month
  const goToNextMonth = () => {
    // Reset editing state when changing months
    setIsEditing(false)
    setEditingAmount('')
    setHasChanges(false)
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  // Fetch all budget data from aggregated API
  const fetchAllBudgetData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/finance-tracker/fetch-all-data')

      if (response.ok) {
        const data = await response.json()
        const budgets: BudgetData[] = data.budgets || []
        
        // DEBUG: Log raw budget data from API
        // console.log('DEBUG raw budget data from API:', budgets)

        // Group budgets by month
        const monthlyBudgets: MonthlyBudget[] = []
        const monthMap = new Map<string, BudgetData[]>()

        budgets.forEach(budget => {
          // Fix timezone issue: parse the date and extract year-month in local timezone
          const budgetDate = new Date(budget.date)
          const month = `${budgetDate.getFullYear()}-${String(budgetDate.getMonth() + 1).padStart(2, '0')}`
          
          // DEBUG: Log each budget processing
          // console.log('DEBUG processing budget:', {
          //   budget,
          //   extractedMonth: month,
          //   originalDate: budget.date,
          //   parsedDate: budgetDate,
          //   fixedMonth: month
          // })
          
          if (!monthMap.has(month)) {
            monthMap.set(month, [])
          }
          monthMap.get(month)!.push(budget)
        })

        // For each month, use the latest budget entry
        monthMap.forEach((monthBudgets, month) => {
          const latestBudget = monthBudgets.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
          monthlyBudgets.push({
            month,
            amount: latestBudget.amount,
            notes: latestBudget.notes || '',
            lastUpdated: latestBudget.timestamp
          })
        })

        setAllBudgets(monthlyBudgets)
        setDataLoaded(true)
      } else {
        console.error('Failed to fetch budget data')
        setAllBudgets([])
        setDataLoaded(true)
      }
    } catch (error) {
      console.error('Error fetching budget data:', error)
      setAllBudgets([])
      setDataLoaded(true)
    } finally {
      setLoading(false)
    }
  }

  // Get current month's budget from local data
  const getCurrentMonthBudget = () => {
    // currentMonth is a Date object, getMonth() returns 0-based month, so add 1 for database format
    const currentMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
    const monthBudget = allBudgets.find(budget => budget.month === currentMonthKey)
    
    // DEBUG: Log the lookup
    // console.log('DEBUG getCurrentMonthBudget:', {
    //   currentMonth,
    //   currentMonthJS: currentMonth.getMonth(),
    //   currentMonthDisplay: currentMonth.getMonth() + 1,
    //   currentMonthKey,
    //   availableBudgets: allBudgets.map(b => b.month),
    //   foundBudget: monthBudget
    // })

    if (monthBudget) {
      setBudgetAmount(monthBudget.amount)
      setNotes(monthBudget.notes)
    } else {
      setBudgetAmount(0)
      setNotes('')
    }
    setHasChanges(false)
  }

  // Save budget data
  const saveBudget = async () => {
    const amount = parseFloat(editingAmount)
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid budget amount')
      return
    }

    try {
      setLoading(true)
      const { firstDay } = getMonthRange(currentMonth)
      
      // DEBUG: Log the values being used
      // console.log('DEBUG saveBudget:', {
      //   currentMonth,
      //   currentMonthJS: currentMonth.getMonth(),
      //   currentMonthDisplay: currentMonth.getMonth() + 1,
      //   firstDay,
      //   propCurrentMonth,
      //   propCurrentYear
      // })

      const response = await fetch('/api/finance-tracker/submit-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: firstDay,
          amount: amount,
          notes: notes
        })
      })

      if (response.ok) {
        // Update local data - currentMonth is Date object, getMonth() is 0-based, add 1 for DB format
        const currentMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
        const existingIndex = allBudgets.findIndex(budget => budget.month === currentMonthKey)

        const updatedBudget: MonthlyBudget = {
          month: currentMonthKey,
          amount: amount,
          notes: notes,
          lastUpdated: new Date().toISOString()
        }

        if (existingIndex >= 0) {
          const updatedBudgets = [...allBudgets]
          updatedBudgets[existingIndex] = updatedBudget
          setAllBudgets(updatedBudgets)
        } else {
          setAllBudgets(prev => [...prev, updatedBudget])
        }

        setBudgetAmount(amount)
        setIsEditing(false)
        setHasChanges(false)
        setDataSaved(true)
        toast.success('Budget saved successfully!')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save budget')
      }
    } catch (error: any) {
      console.error('Error saving budget:', error)
      toast.error(`Error saving budget: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Start editing
  const startEditing = () => {
    setEditingAmount(Math.floor(budgetAmount).toString())
    setIsEditing(true)
    setHasChanges(false)
  }


  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false)
    setEditingAmount('')
    setHasChanges(false)
  }

  // Update notes
  const updateNotes = (value: string) => {
    setNotes(value)
    if (isEditing) {
      setHasChanges(true)
    }
  }

  // Handle drawer close
  const handleClose = () => {
    onClose(dataSaved)
    // Reset the dataSaved flag for next time
    setDataSaved(false)
  }

  // Update current month when props change
  // propCurrentMonth is 0-based (0 = January, 11 = December) from page.tsx
  useEffect(() => {
    if (propCurrentMonth !== undefined && propCurrentYear !== undefined) {
      // console.log('DEBUG budget drawer props update:', {
      //   propCurrentMonth,
      //   propCurrentYear,
      //   newDateObject: new Date(propCurrentYear, propCurrentMonth, 1)
      // })
      setCurrentMonth(new Date(propCurrentYear, propCurrentMonth, 1))
    }
  }, [propCurrentMonth, propCurrentYear])

  // Handle visibility with animation timing
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      // Small delay to ensure component is rendered before animation starts
      const timer = setTimeout(() => {
        setIsAnimating(true)
      }, 10)
      // Only fetch data if not already loaded
      if (!dataLoaded) {
        fetchAllBudgetData()
      }
      return () => clearTimeout(timer)
    } else {
      setIsAnimating(false)
      // Delay hiding to allow exit animation to complete
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 300) // Match the CSS transition duration
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Update current month budget when month changes or data loads
  useEffect(() => {
    if (dataLoaded) {
      getCurrentMonthBudget()
    }
  }, [currentMonth, dataLoaded, allBudgets])

  if (!isVisible) return null

  return (
    <div className={`fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={handleClose}>
      <div className={`w-full max-w-sm mx-auto bg-white rounded-t-3xl shadow-lg transform transition-transform duration-300 ease-in-out ${isAnimating ? 'translate-y-0' : 'translate-y-full'}`} onClick={(e) => e.stopPropagation()}>
        {/* Header with month navigation */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
          <Button
            variant="neutral"
            size="sm"
            onClick={goToPreviousMonth}
            className="p-1"
            disabled={loading}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <h2 className="text-lg font-semibold text-gray-900">
            {formatMonthYear(currentMonth)}
          </h2>

          <Button
            variant="neutral"
            size="sm"
            onClick={goToNextMonth}
            className="p-1"
            disabled={loading}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Budget display/edit section */}
        <div className="p-6 space-y-6">
          {/* Budget Amount */}
          <div className="text-center">
            <div className="flex items-center justify-center">
              <p className="text-sm text-gray-600">Monthly Budget</p>
              {loading && <Loader2 className="w-4 h-4 ml-2 animate-spin text-blue-500" />}
            </div>
            {isEditing ? (
              <div className="space-y-4">
                <div className="w-full">
                  <div className="relative w-full">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xl text-gray-500 font-medium">
                      Rp
                    </span>
                    <input
                      type="text"
                      placeholder="0"
                      inputMode="numeric"
                      value={editingAmount ? Math.floor(Number(editingAmount)).toLocaleString('id-ID') : ''}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/\./g, '');
                        if (/^\d*$/.test(numericValue)) {
                          setEditingAmount(numericValue);
                          setHasChanges(numericValue !== Math.floor(budgetAmount).toString());
                        }
                      }}
                      className="text-2xl h-[3rem] leading-[3rem] font-medium border-0 border-b border-gray-300 rounded-none focus:placeholder:opacity-0 focus:border-gray-600 focus:outline-none focus:ring-0 px-0 placeholder:text-gray-400 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full pl-[3rem] bg-transparent"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <div className="relative w-full">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl text-gray-600 font-medium">
                    Rp
                  </span>
                  <div className="text-4xl h-[4rem] leading-[4rem] font-medium border-0 border-b border-gray-300 rounded-none text-center w-full pl-[3rem] bg-transparent">
                    {budgetAmount > 0 ? Math.floor(budgetAmount).toLocaleString('id-ID') : '0'}
                  </div>
                  <span 
                    onClick={loading ? undefined : startEditing}
                    className={`absolute right-1 bottom-4 transition-colors ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                    title="Edit budget"
                  >
                    <Edit3 className={`w-4 h-4 text-gray-400 transition-colors ${loading ? '' : 'hover:text-gray-600'}`} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notes section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => updateNotes(e.target.value)}
              placeholder="Add notes about your budget..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>
        </div>

        {/* Action buttons */}
        {isEditing && (

        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            {isEditing && hasChanges && (
              <Button
                onClick={saveBudget}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-full"
              >
                <Save className="w-4 h-4" />
                Save
              </Button>
            )}
              <Button
                onClick={cancelEditing}
                variant="neutral"
                className="flex-1 rounded-full"
                disabled={loading}
              >
                Cancel
              </Button>
            
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
