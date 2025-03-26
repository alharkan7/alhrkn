'use client'

import React from 'react';
import { categories } from '@/lib/categories';
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DatePicker from "@/components/ui/date-picker"
import { User2, Check, X, Calendar } from 'lucide-react';

interface FormExpensesProps {
  date: string;
  setDate: (date: string) => void;
  subjectValue: string;
  setSubjectValue: (value: string) => void;
  amountValue: string;
  setAmountValue: (value: string) => void;
  categoryValue: string;
  setCategoryValue: (value: string) => void;
  descriptionValue: string;
  setDescriptionValue: (value: string) => void;
  reimburseValue: string;
  setReimburseValue: (value: string) => void;
  isSubmitting: boolean;
  showValidation: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

export function FormExpenses({
  date,
  setDate,
  subjectValue,
  setSubjectValue,
  amountValue,
  setAmountValue,
  categoryValue,
  setCategoryValue,
  descriptionValue,
  setDescriptionValue,
  reimburseValue,
  setReimburseValue,
  isSubmitting,
  showValidation,
  handleSubmit,
}: FormExpensesProps) {
  return (
    <form className="shadow-sm hover:shadow-md transition-shadow duration-200 p-6 rounded-lg" onSubmit={handleSubmit}>
      <div className="space-y-2 w-full">
        <div className="relative">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[2rem] text-secondary-foreground/50 font-medium">Rp</span>
          <input
            type="text"
            id="amount"
            placeholder="0"
            inputMode="numeric"
            required
            value={amountValue ? new Intl.NumberFormat('id-ID').format(Number(amountValue)) : ''}
            onChange={(e) => {
              const numericValue = e.target.value.replace(/\./g, '');
              if (/^\d*$/.test(numericValue)) {
                setAmountValue(numericValue);
              }
            }}
            className="text-[2rem] h-[3rem] leading-[3rem] font-medium border-0 border-b border-secondary-foreground/50 rounded-none focus:placeholder:opacity-0 focus:border-opacity-0 focus:outline-none focus:ring-0 px-0 placeholder:text-secondary-foreground/50 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full pl-[3rem] bg-transparent"
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-4 gap-4">
        <div className="space-y-2 flex flex-col items-center">
          <Label htmlFor="subject" className='text-xs text-muted-foreground'>Subject</Label>
          <Select
            value={subjectValue}
            required
            onValueChange={setSubjectValue}
          >
            <SelectTrigger
              id="subject"
              className={`w-10 h-10 p-0 flex items-center justify-center border-2 rounded-full [&>svg:last-child]:hidden ${showValidation && !subjectValue ? 'border-red-500 focus:ring-red-500' :
                  subjectValue ? '' : 'shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none'
                }`}
            >
              <User2 className="h-4 w-4" />
              <span className="sr-only"><SelectValue /></span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ayah">Ayah</SelectItem>
              <SelectItem value="Ibu">Ibu</SelectItem>
              <SelectItem value="Kakak">Kakak</SelectItem>
              <SelectItem value="Adik">Adik</SelectItem>
            </SelectContent>
          </Select>
          {showValidation && !subjectValue && (
            <p className="text-sm text-red-500 mt-1">Select</p>
          )}
        </div>
        <div className="space-y-2 flex flex-col items-center">
          <Label htmlFor="category" className='text-xs text-muted-foreground'>Category</Label>
          <Select
            value={categoryValue}
            required
            onValueChange={setCategoryValue}
          >
            <SelectTrigger
              id="category"
              className={`w-10 h-10 p-0 flex items-center justify-center border-2 rounded-full [&>svg:last-child]:hidden ${showValidation && !categoryValue ? 'border-red-500 focus:ring-red-500' :
                  categoryValue ? '' : 'shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none'
                }`}
            >
              {categoryValue ? (
                React.createElement(categories.find(cat => cat.value === categoryValue)?.icon || categories[0].icon, {
                  className: "h-4 w-4"
                })
              ) : (
                React.createElement(categories[0].icon, { className: "h-4 w-4" })
              )}
              <span className="sr-only"><SelectValue /></span>
            </SelectTrigger>
            <SelectContent position="popper">
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  <div className="flex items-center">
                    <category.icon className="mr-2 h-4 w-4" />
                    <span>{category.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showValidation && !categoryValue && (
            <p className="text-sm text-red-500 mt-1">Select</p>
          )}
        </div>
        <div className="space-y-2 flex flex-col items-center">
          <Label htmlFor="date" className='text-xs text-muted-foreground'>Date</Label>
          <DatePicker
            date={date}
            setDate={setDate}
            triggerClassName={`w-10 h-10 p-0 flex items-center justify-center border-2 rounded-full ${date ? '' : 'shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none'
              }`}
            icon={<Calendar className="h-4 w-4 flex-shrink-0" />}
          />
        </div>
        <div className="space-y-2 flex flex-col items-center">
          <Label htmlFor="reimbursed" className='text-xs text-muted-foreground'>Reimbursed</Label>
          <Select
            value={reimburseValue}
            onValueChange={setReimburseValue}
          >
            <SelectTrigger
              id="reimbursed"
              className={`w-10 h-10 p-0 flex items-center justify-center border-2 rounded-full [&>svg:last-child]:hidden ${reimburseValue === 'TRUE' ? 'border-primary text-primary' : 'border-muted-foreground/50'
                }`}
            >
              {reimburseValue === 'TRUE' ? (
                <Check className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
              <span className="sr-only"><SelectValue /></span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRUE">
                <div className="flex items-center">
                  <span>Yes</span>
                </div>
              </SelectItem>
              <SelectItem value="FALSE">
                <div className="flex items-center">
                  <span>No</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-8">
        <textarea
          id="description"
          placeholder="Notes (optional)"
          className="resize-none px-0 border-0 border-b border-secondary-foreground/50 rounded-none focus:ring-0 focus-visible:ring-0 focus:outline-none placeholder:text-secondary-foreground/50 w-full align-bottom placeholder:bottom-1 placeholder:left-0 flex h-[2rem] focus:placeholder:opacity-0 max-h-none overflow-hidden bg-transparent"
          value={descriptionValue}
          onChange={(e) => {
            e.target.style.height = '2rem';
            e.target.style.height = e.target.scrollHeight + 'px';
            setDescriptionValue(e.target.value);
          }}
        />
      </div>

      <Button className="w-full mt-8" variant="default" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Save' : 'Save'}
      </Button>
    </form>
  );
}
