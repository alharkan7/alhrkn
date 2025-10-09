'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from "@/components/ui/button"
import { Bell, Settings as SettingsIcon, Zap, AlertTriangle, RefreshCw, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { UserMenu } from '@/components/user-menu'
import { AppsHeader } from '@/components/apps-header'
import AppsFooter from '@/components/apps-footer'
import { Chart } from './components/chart'
import { ExpenseForm } from './components/expense-form'
import { TransactionTable } from './components/transaction-table'
import { Settings } from './components/sheet-settings'
import { BudgetDrawer } from './components/budget-drawer'
import { LoadingSkeleton } from './components/loading-skeleton'
import { LoginScreen } from './components/login-screen'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Category } from './schema/schema'

// Types for our data (updated for PostgreSQL database structure)
interface ExpenseData {
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

interface IncomeData {
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

interface AppError {
  message: string;
  errorType: string;
  error: string;
}

// Mock data for the donut chart (will be replaced with real data)
const mockChartData = [
  { name: 'Food', value: 400, color: '#0088FE' },
  { name: 'Transport', value: 300, color: '#00C49F' },
  { name: 'Entertainment', value: 200, color: '#FFBB28' },
  { name: 'Others', value: 100, color: '#FF8042' },
]

// Cache configuration for PostgreSQL data
const CACHE_KEY_EXPENSES = 'expense_tracker_expenses_pg'
const CACHE_KEY_INCOMES = 'expense_tracker_incomes_pg'
const CACHE_KEY_BUDGETS = 'expense_tracker_budgets_pg'
const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes in milliseconds (reduced for fresher data)

interface CacheData {
  data: any[]
  timestamp: number
  version?: string // Add version to invalidate old cache
}

// Cache utilities
const getCache = (key: string): CacheData | null => {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(key)
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

const setCache = (key: string, data: any[]) => {
  if (typeof window === 'undefined') return
  try {
    const cacheData: CacheData = {
      data,
      timestamp: Date.now(),
      version: 'postgresql' // Mark as PostgreSQL data
    }
    localStorage.setItem(key, JSON.stringify(cacheData))
  } catch {
    // Ignore cache write errors
  }
}

const isCacheValid = (cache: CacheData | null): boolean => {
  if (!cache) return false
  
  // Invalidate cache if it's not PostgreSQL version
  if (cache.version !== 'postgresql') {
    return false
  }
  
  const age = Date.now() - cache.timestamp
  const isValid = age < CACHE_DURATION
  
  // Debug cache status
  console.log(`Cache age: ${Math.round(age / 1000)}s, Valid: ${isValid}, Duration: ${CACHE_DURATION / 1000}s`)
  
  return isValid
}

const clearCache = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(CACHE_KEY_EXPENSES)
    localStorage.removeItem(CACHE_KEY_INCOMES)
    localStorage.removeItem(CACHE_KEY_BUDGETS)
  } catch {
    // Ignore cache clear errors
  }
}

// CSV parsing utilities for demo mode
const parseCSV = (csvText: string): string[][] => {
  const lines = csvText.split('\n').filter(line => line.trim())
  return lines.map(line => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  })
}

const loadDemoData = async () => {
  try {
    const [expensesResponse, incomesResponse, budgetsResponse] = await Promise.all([
      fetch('/dummy_exp.csv'),
      fetch('/dummy_inc.csv'),
      fetch('/dummy_bud.csv')
    ])

    const [expensesCSV, incomesCSV, budgetsCSV] = await Promise.all([
      expensesResponse.text(),
      incomesResponse.text(),
      budgetsResponse.text()
    ])

    // Parse expenses
    const expensesLines = parseCSV(expensesCSV)
    const expensesData: ExpenseData[] = expensesLines.slice(1).map(line => ({
      date: line[0],
      amount: parseFloat(line[1]),
      category: line[2],
      description: line[3] || undefined
    })).filter(item => !isNaN(item.amount))

    // Parse incomes
    const incomesLines = parseCSV(incomesCSV)
    const incomesData: IncomeData[] = incomesLines.slice(1).map(line => ({
      date: line[0],
      amount: parseFloat(line[1]),
      category: line[2],
      description: line[3] || undefined
    })).filter(item => !isNaN(item.amount))

    // Parse budgets
    const budgetsLines = parseCSV(budgetsCSV)
    const budgetsData = budgetsLines.slice(1).map(line => ({
      timestamp: line[0],
      date: line[1],
      amount: parseFloat(line[2])
    })).filter(item => !isNaN(item.amount))

    return { expenses: expensesData, incomes: incomesData, budgets: budgetsData }
  } catch (error) {
    console.error('Error loading demo data:', error)
    throw error
  }
}

export default function MobileFinanceTracker() {
  const { data: session, status } = useSession()

  // Demo mode state
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Data state
  const [expenses, setExpenses] = useState<ExpenseData[]>([])
  const [incomes, setIncomes] = useState<IncomeData[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [chartData, setChartData] = useState(mockChartData)
  const [chartMode, setChartMode] = useState<'income' | 'expense'>('expense')
  const [chartType, setChartType] = useState<'donut' | 'line'>('donut')
  const [showTransactionTable, setShowTransactionTable] = useState(false)

  // Categories state
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([])
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerKey, setDrawerKey] = useState(0)

  // Budget drawer state
  const [isBudgetDrawerOpen, setIsBudgetDrawerOpen] = useState(false)

  // Budget data state
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0)
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [allBudgets, setAllBudgets] = useState<{[key: string]: number}>({})
  const [budgetsLoaded, setBudgetsLoaded] = useState(false)

  // Budget alert dialog state
  const [isBudgetAlertOpen, setIsBudgetAlertOpen] = useState(false)

  // Month filter state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())

  // Animation state for smooth transitions
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationDirection, setAnimationDirection] = useState<'left' | 'right'>('right')

  // Set up dynamic viewport height for mobile browsers
  useEffect(() => {
    const setVH = () => {
      if (typeof window !== 'undefined') {
        const vh = window.innerHeight * 0.01
        document.documentElement.style.setProperty('--vh', `${vh}px`)
      }
    }

    // Set initial value
    setVH()

    // Update on resize and orientation change
    window.addEventListener('resize', setVH)
    window.addEventListener('orientationchange', setVH)

    return () => {
      window.removeEventListener('resize', setVH)
      window.removeEventListener('orientationchange', setVH)
    }
  }, [])

  // Animation functions
  const showTransactionTableWithAnimation = () => {
    setAnimationDirection('left')
    setIsAnimating(true)
    // Start animation immediately
    setShowTransactionTable(true)
    // End animation after transition completes
    setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }

  const hideTransactionTableWithAnimation = () => {
    setAnimationDirection('right')
    setIsAnimating(true)
    // Wait for animation to complete before hiding
    setTimeout(() => {
      setShowTransactionTable(false)
      setIsAnimating(false)
    }, 300)
  }
  
  // DEBUG: Log the initial month state
  // console.log('DEBUG page.tsx initial state:', {
  //   currentMonth,
  //   currentYear,
  //   realCurrentMonth: new Date().getMonth(),
  //   realCurrentYear: new Date().getFullYear()
  // })
  
  // Filter data by selected month with better error handling
  const filterDataByMonth = (data: any[]) => {
    return data.filter(item => {
      if (!item || !item.date) return false
      try {
        const itemDate = new Date(item.date)
        if (isNaN(itemDate.getTime())) return false
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
      } catch (error) {
        console.warn('Invalid date format in filterDataByMonth:', item)
        return false
      }
    })
  }

  const filteredExpenses = filterDataByMonth(expenses)
  const filteredIncomes = filterDataByMonth(incomes)

  // Calculate balance from filtered data: Budget - Expenses with better error handling
  const totalIncome = filteredIncomes.reduce((sum, income) => {
    const amount = typeof income.amount === 'number' ? income.amount : parseFloat(income.amount || '0')
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)
  
  const totalExpenses = filteredExpenses.reduce((sum, expense) => {
    const amount = typeof expense.amount === 'number' ? expense.amount : parseFloat(expense.amount || '0')
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)
  
  const balance = monthlyBudget - totalExpenses

  // Month navigation functions
  const getMonthName = (month: number) => {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    return monthNames[month]
  }

  const getDateLimits = () => {
    const allDates = [...expenses, ...incomes]
      .map(item => item.date)
      .filter(date => date)
      .map(date => new Date(date))

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

  const navigateMonth = (direction: 'prev' | 'next') => {
    const { minDate, maxDate } = getDateLimits()
    const currentDate = new Date(currentYear, currentMonth, 1)

    if (direction === 'prev') {
      const prevMonth = new Date(currentYear, currentMonth - 1, 1)
      if (prevMonth >= minDate) {
        setCurrentMonth(prevMonth.getMonth())
        setCurrentYear(prevMonth.getFullYear())
      }
    } else {
      const nextMonth = new Date(currentYear, currentMonth + 1, 1)
      if (nextMonth <= maxDate) {
        setCurrentMonth(nextMonth.getMonth())
        setCurrentYear(nextMonth.getFullYear())
      }
    }
  }

  // Process budget data from the aggregated API response
  const processBudgetData = (budgets: any[]) => {
    // Group budgets by month and take the latest entry for each month
    const budgetMap: {[key: string]: number} = {}
    
    // DEBUG: Log raw budget data
    // console.log('DEBUG page.tsx processBudgetData raw data:', budgets)

    budgets.forEach((budget: any) => {
      // Fix timezone issue: parse the date and extract year-month in local timezone
      const budgetDate = new Date(budget.date)
      const monthKey = `${budgetDate.getFullYear()}-${String(budgetDate.getMonth() + 1).padStart(2, '0')}`
      
      // DEBUG: Log each budget processing in page.tsx
      // console.log('DEBUG page.tsx processing budget:', {
      //   budget,
      //   extractedMonthKey: monthKey,
      //   originalDate: budget.date,
      //   parsedDate: budgetDate,
      //   fixedMonthKey: monthKey
      // })
      
      // For comparison, we need to use the same monthKey logic for finding existing budgets
      if (!budgetMap[monthKey] || new Date(budget.timestamp) > new Date(budgets.find((b: any) => {
        const bDate = new Date(b.date)
        const bMonthKey = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}`
        return bMonthKey === monthKey
      })?.timestamp || 0)) {
        budgetMap[monthKey] = budget.amount
      }
    })

    setAllBudgets(budgetMap)
    setBudgetsLoaded(true)

    // Set current month's budget - currentMonth is 0-based, so add 1 for database month
    const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
    setMonthlyBudget(budgetMap[currentMonthKey] || 0)
  }

  // Fetch all budgets and cache them (now uses data from aggregated API)
  const fetchAllBudgets = async () => {
    try {
      setBudgetLoading(true)
      // Since we now get budgets from the aggregated API call in fetchData(),
      // we need to check if we already have budget data
      // If not, we'll make a separate call (fallback for edge cases)
      const response = await fetch('/api/finance-tracker/fetch-all-data')

      if (response.ok) {
        const data = await response.json()
        const budgets = data.budgets || []
        processBudgetData(budgets)
      } else {
        console.error('Failed to fetch budget data')
        setMonthlyBudget(0)
        setAllBudgets({})
        setBudgetsLoaded(true)
      }
    } catch (error) {
      console.error('Error fetching budget data:', error)
      setMonthlyBudget(0)
      setAllBudgets({})
      setBudgetsLoaded(true)
    } finally {
      setBudgetLoading(false)
    }
  }

  // Get budget for a specific month (from cache)
  // month parameter is 0-based (0 = January, 11 = December)
  const getBudgetForMonth = (month: number, year: number) => {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
    const budget = allBudgets[monthKey] || 0
    
    // DEBUG: Log the lookup
    // console.log('DEBUG getBudgetForMonth:', {
    //   month,
    //   year,
    //   monthKey,
    //   budget,
    //   allBudgets: Object.keys(allBudgets)
    // })
    
    return budget
  }


  // Fetch user categories
  const fetchUserCategories = async () => {
    try {
      setCategoriesLoading(true)
      const response = await fetch('/api/finance-tracker/user-categories')
      if (response.ok) {
        const data = await response.json()
        setExpenseCategories(data.expense_categories || [])
        setIncomeCategories(data.income_categories || [])
      } else {
        console.error('Failed to fetch categories')
        // Set default categories from schema
        const { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } = await import('./schema/schema')
        setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES)
        setIncomeCategories(DEFAULT_INCOME_CATEGORIES)
      }
    } catch (error) {
      console.error('Error fetching user categories:', error)
      // Set default categories on error
      const { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } = await import('./schema/schema')
      setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES)
      setIncomeCategories(DEFAULT_INCOME_CATEGORIES)
    } finally {
      setCategoriesLoading(false)
    }
  }

  // Initialize demo mode
  const initializeDemo = async () => {
    try {
      setLoading(true)
      setIsDemoMode(true)

      // Load demo data
      const demoData = await loadDemoData()

      // Set demo data
      setExpenses(demoData.expenses)
      setIncomes(demoData.incomes)

      // Process budget data from demo
      if (demoData.budgets.length > 0) {
        processBudgetData(demoData.budgets)
      }

      // Load default categories
      const { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } = await import('./schema/schema')
      setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES)
      setIncomeCategories(DEFAULT_INCOME_CATEGORIES)
      setCategoriesLoading(false)

      // Update chart data
      const filteredExpenses = filterDataByMonth(demoData.expenses)
      const filteredIncomes = filterDataByMonth(demoData.incomes)
      const dataToUse = chartMode === 'expense' ? filteredExpenses : filteredIncomes
      const categoryTotals: { [key: string]: number } = {}
      dataToUse.forEach(item => {
        if (item && item.category) {
          const amount = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || '0')
          if (!isNaN(amount)) {
            categoryTotals[item.category] = (categoryTotals[item.category] || 0) + amount
          }
        }
      })
      const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']
      const newChartData = Object.entries(categoryTotals).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }))
      setChartData(newChartData.length > 0 ? newChartData : mockChartData)

    } catch (error) {
      console.error('Error initializing demo:', error)
      setError({
        message: 'Failed to load demo data',
        errorType: 'DEMO_ERROR',
        error: 'Unable to load demo data. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch data from PostgreSQL database with caching
  const fetchData = async (forceRefresh = false) => {
    if (!session && !isDemoMode) {
      setLoading(false)
      return
    }

    try {
      // Check cache first unless force refresh is requested
      if (!forceRefresh) {
        const expensesCache = getCache(CACHE_KEY_EXPENSES)
        const incomesCache = getCache(CACHE_KEY_INCOMES)
        const budgetsCache = getCache(CACHE_KEY_BUDGETS)

        if (isCacheValid(expensesCache) && isCacheValid(incomesCache) && isCacheValid(budgetsCache)) {
          console.log('Using cached PostgreSQL data')
          const cachedExpenses = expensesCache!.data
          const cachedIncomes = incomesCache!.data
          const cachedBudgets = budgetsCache!.data
          setExpenses(cachedExpenses)
          setIncomes(cachedIncomes)
          
          // Process cached budget data
          if (cachedBudgets && cachedBudgets.length > 0) {
            processBudgetData(cachedBudgets)
          }
          // Set chart data directly from cache (with filtering) with better error handling
          const filterDataByMonthLocal = (data: any[]) => {
            return data.filter(item => {
              if (!item || !item.date) return false
              try {
                const itemDate = new Date(item.date)
                if (isNaN(itemDate.getTime())) return false
                return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
              } catch (error) {
                console.warn('Invalid date format in cached data processing:', item)
                return false
              }
            })
          }

          const filteredExpensesLocal = filterDataByMonthLocal(cachedExpenses)
          const filteredIncomesLocal = filterDataByMonthLocal(cachedIncomes)
          const dataToUse = chartMode === 'expense' ? filteredExpensesLocal : filteredIncomesLocal
          const categoryTotals: { [key: string]: number } = {}
          dataToUse.forEach(item => {
            if (item && item.category) {
              const amount = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || '0')
              if (!isNaN(amount)) {
                categoryTotals[item.category] = (categoryTotals[item.category] || 0) + amount
              }
            }
          })
          const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']
          const newChartData = Object.entries(categoryTotals).map(([name, value], index) => ({
            name,
            value,
            color: colors[index % colors.length]
          }))
          setChartData(newChartData.length > 0 ? newChartData : mockChartData)
          setLoading(false)
          return
        }
      }

      setLoading(true)
      setError(null)

      // Fetch all data (expenses, incomes, budgets) in a single API call
      const response = await fetch('/api/finance-tracker/fetch-all-data')

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 401) {
          // Authentication error - user session might have expired
          setError({
            message: 'Authentication required',
            errorType: 'AUTHENTICATION_REQUIRED',
            error: 'Your session has expired. Please sign in again.'
          })
          return
        }
        throw errorData
      }

      const data = await response.json()
      const expenses = data.expenses || []
      const incomes = data.incomes || []
      const budgets = data.budgets || []

      // Cache the data including budgets
      setCache(CACHE_KEY_EXPENSES, expenses)
      setCache(CACHE_KEY_INCOMES, incomes)
      setCache(CACHE_KEY_BUDGETS, budgets)

      setExpenses(expenses)
      setIncomes(incomes)

      // Process budget data if available
      if (budgets.length > 0) {
        processBudgetData(budgets)
      }

      // Update chart data based on current mode (using filtered data) with better error handling
      const filterDataByMonthLocal = (data: any[]) => {
        return data.filter(item => {
          if (!item || !item.date) return false
          try {
            const itemDate = new Date(item.date)
            if (isNaN(itemDate.getTime())) return false
            return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
          } catch (error) {
            console.warn('Invalid date format in fresh data processing:', item)
            return false
          }
        })
      }

      const filteredExpensesLocal = filterDataByMonthLocal(expenses)
      const filteredIncomesLocal = filterDataByMonthLocal(incomes)
      const dataToUse = chartMode === 'expense' ? filteredExpensesLocal : filteredIncomesLocal
      const categoryTotals: { [key: string]: number } = {}
      dataToUse.forEach((item: any) => {
        if (item && item.category) {
          const amount = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || '0')
          if (!isNaN(amount)) {
            categoryTotals[item.category] = (categoryTotals[item.category] || 0) + amount
          }
        }
      })
      const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']
      const newChartData = Object.entries(categoryTotals).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }))
      setChartData(newChartData.length > 0 ? newChartData : mockChartData)

    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  // Handle category switch from form
  const handleCategorySwitch = (category: 'income' | 'expense') => {
    setChartMode(category)
  }

  // Handle chart type switch
  const handleChartTypeSwitch = (type: 'donut' | 'line') => {
    setChartType(type)
  }

  // Initialize user data when authenticated or in demo mode
  useEffect(() => {
    if (status === 'authenticated' || isDemoMode) {
      if (!isDemoMode) {
        // Fetch user categories and data for authenticated users
        fetchUserCategories().then(() => {
          // Load data (will use cache if valid, otherwise fetch fresh)
          fetchData()
        })
      }
      // Demo mode initialization is handled separately
    } else if (status === 'unauthenticated' && !isDemoMode) {
      setLoading(false)
      setCategoriesLoading(false)
    }
  }, [session, status, isDemoMode])

  // Fetch all budgets when user is authenticated or in demo mode
  useEffect(() => {
    if ((status === 'authenticated' || isDemoMode) && !loading && !budgetsLoaded) {
      if (!isDemoMode) {
        fetchAllBudgets()
      }
      // Budgets are loaded in demo mode via initializeDemo
    }
  }, [status, loading, budgetsLoaded, isDemoMode])

  // Update current month's budget when month changes (from cache)
  useEffect(() => {
    if (budgetsLoaded) {
      const budget = getBudgetForMonth(currentMonth, currentYear)
      setMonthlyBudget(budget)
    }
  }, [currentMonth, currentYear, budgetsLoaded, allBudgets])

  // Update chart data when mode or month changes with better error handling
  useEffect(() => {
    if (expenses.length > 0 || incomes.length > 0) {
      // Filter data by selected month with better error handling
      const filterDataByMonthLocal = (data: any[]) => {
        return data.filter(item => {
          if (!item || !item.date) return false
          try {
            const itemDate = new Date(item.date)
            if (isNaN(itemDate.getTime())) return false
            return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
          } catch (error) {
            console.warn('Invalid date format in chart processing:', item)
            return false
          }
        })
      }

      const filteredExpensesLocal = filterDataByMonthLocal(expenses)
      const filteredIncomesLocal = filterDataByMonthLocal(incomes)

      const dataToUse = chartMode === 'expense' ? filteredExpensesLocal : filteredIncomesLocal
      const categoryTotals: { [key: string]: number } = {}
      
      dataToUse.forEach((item: any) => {
        if (item && item.category) {
          const amount = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || '0')
          if (!isNaN(amount)) {
            categoryTotals[item.category] = (categoryTotals[item.category] || 0) + amount
          }
        }
      })
      
      const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']
      const newChartData = Object.entries(categoryTotals).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }))
      setChartData(newChartData.length > 0 ? newChartData : mockChartData)
    }
  }, [chartMode, expenses, incomes, currentMonth, currentYear])


  // Handle form submission
  const handleFormSubmit = async (formData: {
    amount: number;
    category: string;
    date: string;
    note: string;
    type: 'expense' | 'income';
  }) => {
    try {
      setFormLoading(true)
      const endpoint = formData.type === 'expense' ? '/api/finance-tracker/submit-expense' : '/api/finance-tracker/submit-income'

      // Format timestamp in readable format: YYYY-MM-DD HH:MM:SS
      const now = new Date()
      const timestamp = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0')

      const payload = {
        timestamp: timestamp,
        date: formData.date,
        amount: formData.amount,
        category: formData.category,
        ...(formData.type === 'expense'
          ? { notes: formData.note || '' }
          : { description: formData.note || '' }
        )
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        // Clear cache and refresh chart data to get latest state
        clearCache()

        // Refresh data to update chart
        try {
          const response = await fetch('/api/finance-tracker/fetch-all-data')

          if (response.ok) {
            const data = await response.json()
            const newExpenses = data.expenses || []
            const newIncomes = data.incomes || []
            const newBudgets = data.budgets || []

            // Update chart data only
            // Update chart data after form submission (using filtered data) with better error handling
            const filterDataByMonthLocal = (data: any[]) => {
              return data.filter(item => {
                if (!item || !item.date) return false
                try {
                  const itemDate = new Date(item.date)
                  if (isNaN(itemDate.getTime())) return false
                  return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
                } catch (error) {
                  console.warn('Invalid date format in form submission processing:', item)
                  return false
                }
              })
            }

            const filteredNewExpenses = filterDataByMonthLocal(newExpenses)
            const filteredNewIncomes = filterDataByMonthLocal(newIncomes)
            const dataToUse = chartMode === 'expense' ? filteredNewExpenses : filteredNewIncomes
            const categoryTotals: { [key: string]: number } = {}
            dataToUse.forEach((item: any) => {
              if (item && item.category) {
                const amount = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount || '0')
                if (!isNaN(amount)) {
                  categoryTotals[item.category] = (categoryTotals[item.category] || 0) + amount
                }
              }
            })
            const colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658']
            const newChartData = Object.entries(categoryTotals).map(([name, value], index) => ({
              name,
              value,
              color: colors[index % colors.length]
            }))
            setChartData(newChartData.length > 0 ? newChartData : mockChartData)
            // Update global state for balance calculation
            setExpenses(newExpenses)
            setIncomes(newIncomes)
            // Update budget data if available
            if (newBudgets.length > 0) {
              processBudgetData(newBudgets)
            }
          }
        } catch (refreshError) {
          console.error('Error refreshing data after submission:', refreshError)
          // Still show success toast even if refresh fails
        }

        toast.success(`${formData.type === 'expense' ? 'Expense' : 'Income'} saved successfully!`)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save data')
      }
    } catch (err: any) {
      console.error('Error saving data:', err)
      toast.error(`Error saving data: ${err.message}`)
      throw err // Re-throw to let form component handle it
    } finally {
      setFormLoading(false)
    }
  }

  // Show loading skeleton when authentication status is loading and not in demo mode
  if (status === 'loading' && !isDemoMode) {
    return <LoadingSkeleton />
  }

  // Show login screen when not authenticated and not in demo mode
  if (status === 'unauthenticated' && !isDemoMode) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="z-50">
          <AppsHeader />
        </div>
        <div className="flex-1 flex flex-col justify-center items-center max-w-6xl mx-auto w-full">
          <LoginScreen onDemoClick={initializeDemo} />
        </div>
        <div className="flex-none mb-1">
          <AppsFooter />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full relative overflow-hidden" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      {/* Full-width background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600"></div>

      {/* Centered content */}
      <div className="relative z-10 h-full w-full max-w-sm mx-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 w-full flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell
                className="w-5 h-5 text-white cursor-pointer"
                onClick={() => {
                  console.log('Bell clicked, balance:', balance, 'monthlyBudget:', monthlyBudget, 'totalExpenses:', totalExpenses, 'isNaN(balance):', isNaN(balance))
                  if (balance < 0 && !isNaN(balance)) {
                    setIsBudgetAlertOpen(true)
                  } else if (!isNaN(balance)) {
                    console.log('Showing toast message')
                    toast.success("No issue. Everything is fine! 👍")
                  } else {
                    console.log('Balance is NaN, not showing anything')
                  }
                }}
              />
              {balance < 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white"></div>
              )}
            </div>
            <RefreshCw
              className="w-4 h-4 text-white cursor-pointer hover:text-white/80 transition-colors"
              onClick={async () => {
                try {
                  clearCache()
                  await Promise.all([
                    fetchData(true),
                    fetchUserCategories() // Also refresh categories
                  ])
                  // Reset budget drawer state if open to force refresh
                  if (isBudgetDrawerOpen) {
                    setBudgetsLoaded(false)
                  }
                  toast.success("Data refreshed successfully!")
                } catch (error) {
                  console.error('Error refreshing data:', error)
                  toast.error("Failed to refresh data")
                }
              }}
            />
          </div>
          <UserMenu isDemoMode={isDemoMode} />
        </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-t-3xl px-4 pt-4 pb-0 w-full overflow-hidden flex flex-col items-center relative">

        {/* Chart or Transaction Table Section */}
        <div className="w-full h-full relative overflow-hidden">
          {/* Chart Section */}
          <div 
            className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
              showTransactionTable ? 'transform -translate-x-full' : 'transform translate-x-0'
            }`}
          >
            <div className="w-full flex flex-col items-center overflow-y-auto">
              <Chart
                data={chartData}
                totalIncome={totalIncome}
                totalExpenses={totalExpenses}
                balance={balance}
                loading={loading}
                mode={chartMode}
                chartType={chartType}
                currentMonth={currentMonth}
                currentYear={currentYear}
                onNavigateMonth={navigateMonth}
                onChartTypeSwitch={handleChartTypeSwitch}
                canNavigatePrev={false}
                canNavigateNext={false}
                getMonthName={getMonthName}
                expenses={expenses}
                incomes={incomes}
                monthlyBudget={monthlyBudget}
                budgetLoading={budgetLoading}
                budgetsLoaded={budgetsLoaded}
                onOpenBudgetDrawer={() => setIsBudgetDrawerOpen(true)}
                onShowDetails={showTransactionTableWithAnimation}
              />

              {/* Form Section - Only show when chart is visible */}
              <ExpenseForm
                onSubmit={handleFormSubmit}
                loading={formLoading}
                onCategorySwitch={handleCategorySwitch}
                isDemoMode={isDemoMode}
              />
            </div>
          </div>

          {/* Transaction Table Section */}
          <div 
            className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
              showTransactionTable ? 'transform translate-x-0' : 'transform translate-x-full'
            }`}
          >
            <div className="w-full flex flex-col items-center overflow-y-auto">
              <TransactionTable
                expenses={expenses}
                incomes={incomes}
                loading={loading}
                currentMonth={currentMonth}
                currentYear={currentYear}
                onNavigateMonth={navigateMonth}
                getMonthName={getMonthName}
                onBackClick={hideTransactionTableWithAnimation}
                onRefreshData={() => fetchData(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex gap-2 p-3 mb-0 bg-white w-full flex-shrink-0 rounded-b-lg">
        <Button
          variant="neutral"
          className="rounded-full flex-1 h-8 text-xs border border-gray-300 shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0 bg-transparent"
          onClick={() => setIsBudgetDrawerOpen(true)}
        >
          <Zap className="w-3 h-3 mr-1" />
          Anggaran
        </Button>
        <Drawer open={isDrawerOpen} onOpenChange={(open) => {
          setIsDrawerOpen(open)
          // Reset drawer key to remount Settings component
          if (!open) {
            setDrawerKey(prev => prev + 1)
          }
        }}>
          <DrawerTrigger asChild>
            <Button variant="neutral" className="rounded-full flex-1 h-8 text-xs border border-gray-300 shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0 bg-transparent">
              <SettingsIcon className="w-3 h-3 mr-1" />
              Pengaturan
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[80vh] w-full max-w-sm mx-auto flex flex-col">
            <DrawerHeader className="flex-shrink-0">
              <DrawerTitle>Settings</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden">
              <Settings
                key={drawerKey}
                expenseCategories={expenseCategories}
                incomeCategories={incomeCategories}
                userEmail={session?.user?.email || ''}
                loading={loading}
                onCategoriesUpdated={fetchUserCategories}
              />
            </div>
          </DrawerContent>
        </Drawer>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 text-center mb-1">
          <span className="text-xs text-white/70">
            © {new Date().getFullYear()}
          </span>
          <button
            onClick={() => window.open('https://x.com/alhrkn')}
            className="text-xs text-white/70 hover:text-white cursor-pointer transition-colors ml-1"
          >
            alhrkn
          </button>
        </div>

        {/* Budget Alert Dialog */}
        <Dialog open={isBudgetAlertOpen} onOpenChange={setIsBudgetAlertOpen}>
          <DialogContent className="w-full max-w-sm mx-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2 text-red-600 text-lg">
                Peringatan
              </DialogTitle>
              <DialogDescription className="text-sm space-y-2 text-center">
                <p className="text-gray-700">Pengeluaranmu melebihi anggaran sebesar:</p>
                <p className="text-xl font-bold text-red-600">
                  Rp {Math.abs(balance).toLocaleString('id-ID')}
                </p>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* Budget Drawer */}
        <BudgetDrawer
          isOpen={isBudgetDrawerOpen}
          onClose={(hasChanges) => {
            setIsBudgetDrawerOpen(false)
            // Only refresh budget data if changes were actually saved
            if (hasChanges) {
              setBudgetsLoaded(false)
              fetchAllBudgets()
            }
          }}
          currentMonth={currentMonth}
          currentYear={currentYear}
        />
      </div>
    </div>
  )
}
