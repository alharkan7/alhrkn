'use client'

import { Bell, ChevronLeft, ChevronRight, Plus, Minus, Loader2 } from 'lucide-react'

export function LoadingSkeleton() {
  return (
    <div className="w-full relative overflow-hidden" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      {/* Full-width background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600"></div>

      {/* Centered content */}
      <div className="relative z-10 h-full w-full max-w-sm mx-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 w-full flex-shrink-0">
          <div className="relative">
            <Bell className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="w-8 h-8 bg-white/20 rounded-full animate-pulse"></div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-t-3xl p-4 w-full overflow-y-auto flex flex-col items-center">
          {/* Chart Section Skeleton */}
          <div className="text-center space-y-2 w-full max-w-sm mb-4">
            {/* Header section */}
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <button disabled className="p-1 rounded-full text-gray-300">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <button disabled className="p-1 rounded-full text-gray-300">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Balance skeleton */}
              <div className="flex items-center justify-center gap-2">
                <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>

              <div className="text-center mt-2">
                <div className="h-3 bg-gray-200 rounded w-16 animate-pulse mx-auto"></div>
              </div>
            </div>

            {/* Chart Container skeleton */}
            <div className="h-46 p-2 w-full mx-auto max-w-full relative flex items-center justify-center">
              <div className="h-40 w-40 mx-auto max-w-full relative rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto" />
                  <p className="text-gray-600 mt-2 text-sm">Loading...</p>
                </div>
              </div>
            </div>

            {/* Bottom section skeleton */}
            <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
              <div className="flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-gray-100">
                <Plus className="w-4 h-4 text-gray-400" />
                <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
              </div>
              <div className="flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-gray-100">
                <Minus className="w-4 h-4 text-gray-400" />
                <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Form Section Skeleton */}
          <div className="w-full space-y-4">
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
            <div className="h-10 bg-gray-100 rounded-lg animate-pulse"></div>
          </div>
        </div>

        {/* Bottom Navigation Skeleton */}
        <div className="flex gap-2 p-3 mb-0 bg-white w-full flex-shrink-0 rounded-b-lg">
          <div className="flex-1 h-8 bg-gray-100 rounded animate-pulse"></div>
          <div className="flex-1 h-8 bg-gray-100 rounded animate-pulse"></div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 text-center mb-1">
          <div className="h-3 bg-white/20 rounded w-32 animate-pulse mx-auto"></div>
        </div>
      </div>
    </div>
  )
}
