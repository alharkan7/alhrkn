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
  const [isOpen, setIsOpen] = useState(false);

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
      <div className="w-full max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted/20 hover:scrollbar-thumb-muted/40 px-2">
      <Card className="max-w-sm mx-auto relative ">
        <Button
          className="absolute top-1 right-1 p-2 bg-background border rounded-full opacity-50 hover:opacity-100 transition-opacity z-10 shadow-sm text-secondary-foreground"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
        >
          <Info className="h-4 w-4" />
        </Button>
        <CardHeader className="text-center py-6 items-center">
          {/* <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div> */}
          <CardTitle className="text-2xl font-bold">
            Finance Tracker <span className="font-thin">(Demo)</span>
          </CardTitle>
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
        </CardHeader>
        <CardContent>
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
            <AnimatePresence initial={false}>
              <TabsContent key="expense" value="expense">
                <motion.div
                  key="expense-motion"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
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
                  key="income-motion"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
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
              variant='ghost'
              className="w-1/2 gap-2"
              onClick={() => window.location.href = "https://bit.ly/pocket-tracker-sheet"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
              Sheets
            </Button>
            <Button
              type="button"
              variant='ghost'	
              className="w-1/2 gap-2"
              onClick={() => window.location.href = "https://bit.ly/pocket-tracker-dashboard"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M21 12H3" /><path d="M12 3v18" /></svg>
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-2 text-center text-xs bg-background">
        <div className="flex-none">
          <AppsFooter />
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]">
          <div className="md:max-w-md w-10/12 bg-white rounded-lg px-4 pb-4 pt-1 text-center dark:bg-gray-800">
            <div className="flex justify-end">
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-800 text-xl">
                &times;
              </button>
            </div>
            <h2 className="text-lg font-bold mb-4">About this App</h2>
            <p className="text-primary/80 text-s mb-2">
              This app saves your data directly to Google Sheets <b>so that you own your data</b> and can manage it yourself.
              <br></br><br></br>
              If you want to run your version of this app, you can{" "}
              <a
                href="https://github.com/alharkan7/simple-expense-tracker"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/90 underline"
              >
                fork the repository
              </a> and deploy it to Vercel.
              <br></br><br></br>
              Use the Google Sheets API to save your data to your own Google Sheets.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
