'use client'

import { signIn } from 'next-auth/react'
import { Button } from "@/components/ui/button"
import { Wallet, LogIn } from 'lucide-react'

export function LoginScreen({ onDemoClick }: { onDemoClick?: () => void }) {
  return (
    <div className="w-full relative overflow-hidden min-h-full">
      {/* Full-width background */}
      <div className="absolute inset-0"></div>

      {/* Centered content */}
      <div className="relative z-10 flex-1 w-full max-w-sm mx-auto flex flex-col">
        {/* Header Space */}
        <div className="p-3 w-full flex-shrink-0"></div>

        {/* Login Content */}
        <div className="flex-1 bg-white rounded-t-3xl p-4 flex flex-col items-center justify-center space-y-4 overflow-y-auto">
          <div className="text-center space-y-3 max-w-md">
            <Wallet className="w-12 h-12 text-blue-500 mx-auto" />
            <h1 className="text-xl font-bold text-gray-900">
              Welcome to Finance Tracker
            </h1>
            {/* <p className="text-gray-600 text-sm">
              Please sign in with your Google account to access your personal expense data and connect to your Google Sheets.
            </p> */}
          </div>

          <div className="w-full max-w-sm flex flex-col items-center space-y-2">
            <Button
              onClick={() => signIn('google')}
              className="w-80 h-10 text-base font-medium"
            >
              <LogIn className="w-4 h-4" />
              Sign in with Google
            </Button>

            <div className="text-center text-sm text-gray-400">
              or
            </div>

            <Button
              onClick={onDemoClick}
              variant="secondary"
              className="w-80 h-10"
            >
              <Wallet className="w-4 h-4" />
              Open Demo
            </Button>

            <div className="text-center text-xs text-gray-500 max-w-xs !mt-4">
              <p>
                Need help? Reach out to <a href="mailto:alharkan7@gmail.com" className="text-blue-500 hover:text-blue-600 underline">Admin</a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-2 flex-shrink-0"></div>
      </div>
    </div>
  )
}
