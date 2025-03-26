'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormExpenses } from './components/form_expenses';
import { FormIncome } from './components/form_income';
import { Button } from "@/components/ui/button"
import { categories, categoriesIncome } from '@/lib/categories';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion";
import AppsFooter from '@/components/apps-footer'
import { AppsHeader } from '@/components/apps-header'
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function FinanceTrackerPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subjectValue, setSubjectValue] = useState('');
  const [amountValue, setAmountValue] = useState('');
  const [categoryValue, setCategoryValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [reimburseValue, setReimburseValue] = useState('FALSE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [activeTab, setActiveTab] = useState('expense');
  const [showInfoModal, setShowInfoModal] = useState(false);

  const timestamp = (() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);

    // Validate required fields
    if (!subjectValue || !categoryValue) {
      // setFeedbackMessage('Please fill in all required fields');
      setTimeout(() => {
        setFeedbackMessage('');
      }, 3000);
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(`Submitting ${activeTab === 'expense' ? 'Expense' : 'Income'}...`);

    try {
      // Find the selected category to get its label
      const categoryArray = activeTab === 'expense' ? categories : categoriesIncome;
      const selectedCategory = categoryArray.find(cat => cat.value === categoryValue);
      const description = descriptionValue.trim() || selectedCategory?.label || categoryValue;

      const response = await fetch(`/api/finance-tracker/submit-${activeTab}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp,
          date,
          subject: subjectValue,
          amount: parseFloat(amountValue),
          category: categoryValue,
          description,
          reimbursed: reimburseValue,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit ${activeTab}`);
      }

      // Reset form
      setDate(new Date().toISOString().split('T')[0]);
      setSubjectValue('');
      setAmountValue('');
      setCategoryValue('');
      setDescriptionValue('');
      setReimburseValue('FALSE');
      setShowValidation(false);
      setFeedbackMessage(`${activeTab === 'expense' ? 'Expense' : 'Income'} Submitted Successfully!`);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setFeedbackMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
      setFeedbackMessage(`Failed to submit ${activeTab}. Please try again.`);

      // Clear error message after 3 seconds
      setTimeout(() => {
        setFeedbackMessage('');
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100vh] flex flex-col items-center justify-center">
      <div className="fixed top-0 left-0 right-0 z-50">
        <AppsHeader />
      </div>
      <div className="w-full max-h-[95vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted/20 hover:scrollbar-thumb-muted/40 py-2 px-1">
        <div className="max-w-sm mx-auto relative bg-card py-6 px-0 rounded-sm">

          <div className="text-center py-6 items-center">
            <h2 className="text-2xl font-bold inline-flex items-center gap-2">
              Finance Tracker
              <button
                className="opacity-30 hover:opacity-100 transition-opacity align-top"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfoModal(true);
                }}
              >
                <Info className="h-4 w-4" />
              </button>
            </h2>
            {feedbackMessage && (
              <div className={`mt-4 px-3 py-1 text-sm font-medium rounded-md ${feedbackMessage.toLowerCase().includes('successfully')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : feedbackMessage.includes('Submitting')
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                {feedbackMessage}
              </div>
            )}
          </div>
          <div className="py-4 px-0">
            <Tabs
              defaultValue="expense"
              className="w-full"
              onValueChange={(value: string) => {
                setActiveTab(value);
                setDate(new Date().toISOString().split('T')[0]);
                setSubjectValue('');
                setAmountValue('');
                setCategoryValue('');
                setDescriptionValue('');
                if (value === 'expense') {
                  setReimburseValue('FALSE');
                }
                setShowValidation(false);
              }}
            >
              <TabsList className="grid w-full grid-cols-2 bg-bg text-text">
                <TabsTrigger
                  value="expense"
                  className="data-[state=active]:bg-main data-[state=active]:text-mtext"
                >
                  Expense
                </TabsTrigger>
                <TabsTrigger
                  value="income"
                  className="data-[state=active]:bg-main data-[state=active]:text-mtext"
                >
                  Income
                </TabsTrigger>
              </TabsList>
              <AnimatePresence initial={false}>
                <TabsContent key="expense" value="expense">
                  <motion.div
                    key="expense-motion"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-lg shadow-shadow border-2 border-border text-mtext p-0"
                  >
                    <FormExpenses
                      date={date}
                      setDate={setDate}
                      subjectValue={subjectValue}
                      setSubjectValue={setSubjectValue}
                      amountValue={amountValue}
                      setAmountValue={setAmountValue}
                      categoryValue={categoryValue}
                      setCategoryValue={setCategoryValue}
                      descriptionValue={descriptionValue}
                      setDescriptionValue={setDescriptionValue}
                      reimburseValue={reimburseValue}
                      setReimburseValue={setReimburseValue}
                      isSubmitting={isSubmitting}
                      handleSubmit={handleSubmit}
                      showValidation={showValidation}
                    />
                  </motion.div>
                </TabsContent>
                <TabsContent key="income" value="income">
                  <motion.div
                    key="expense-motion"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-lg shadow-shadow border-2 border-border text-mtext p-0"
                  >
                    <FormIncome
                      date={date}
                      setDate={setDate}
                      subjectValue={subjectValue}
                      setSubjectValue={setSubjectValue}
                      amountValue={amountValue}
                      setAmountValue={setAmountValue}
                      categoryValue={categoryValue}
                      setCategoryValue={setCategoryValue}
                      descriptionValue={descriptionValue}
                      setDescriptionValue={setDescriptionValue}
                      isSubmitting={isSubmitting}
                      handleSubmit={handleSubmit}
                      showValidation={showValidation}
                    />
                  </motion.div>
                </TabsContent>
              </AnimatePresence>
            </Tabs>
            <div className="flex justify-between mt-4 gap-4">
              <Button
                type="button"
                variant='neutral'
                className="w-1/2 gap-2"
                onClick={() => window.location.href = "https://bit.ly/pocket-tracker-sheet"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
                Sheets
              </Button>
              <Button
                type="button"
                variant='neutral'
                className="w-1/2 gap-2"
                onClick={() => window.location.href = "https://bit.ly/pocket-tracker-dashboard"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M21 12H3" /><path d="M12 3v18" /></svg>
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 py-1 text-center text-xs bg-background">
        <div className="flex-none">
          <AppsFooter />
        </div>
      </div>

      {showInfoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setShowInfoModal(false)}
        >
          <Card
            className="max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-xl text-center">About this (Demo) App</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                This app saves your data directly to Google Sheets <b>so that you own your data</b> and can manage it yourself.
              </p>
              <p>
                If you want to run your version of this app, you can{" "}
                <a
                  href="https://github.com/alharkan7/simple-expense-tracker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  fork the repository
                </a> and deploy it to Vercel.
              </p>
              <p>
                Use the Google Sheets API to save your data to your own Google Sheets.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
