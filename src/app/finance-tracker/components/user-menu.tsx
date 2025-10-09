'use client'

import { useSession, signIn, signOut } from "next-auth/react"
import { User, LogOut } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface UserMenuProps {
  isDemoMode?: boolean
}

export function UserMenu({ isDemoMode = false }: UserMenuProps) {
  const { data: session, status } = useSession()

  if (status === "loading" && !isDemoMode) {
    return <User className="w-6 h-6 text-white animate-pulse" />
  }

  if (session || isDemoMode) {
    const demoUser = {
      name: 'User Name',
      email: 'user@youremail.com',
      image: null
    }
    const user = isDemoMode ? demoUser : session?.user
    return (
      <div className="flex items-center gap-3">
        {/* Display user name */}
        <span className="text-white text-sm font-medium hidden sm:block">
          Welcome, {user?.name?.split(' ')[0] || 'User'}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="neutral" className="p-0 w-10 h-10 rounded-full">
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-6 h-6" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 z-[9999] bg-white border border-gray-200 shadow-lg">
            {/* User info in dropdown */}
            <div className="px-3 py-2 text-sm border-b border-border">
              <div className="font-medium">{user?.name || 'User'}</div>
              <div className="text-muted-foreground text-xs">{user?.email}</div>
            </div>

            <DropdownMenuItem
              onClick={() => {
                if (isDemoMode) {
                  // Reload page to exit demo mode
                  window.location.reload()
                } else {
                  signOut()
                }
              }}
              className="flex items-center gap-2 cursor-pointer text-sm bg-transparent"
            >
              <LogOut className="w-4 h-4" />
              {isDemoMode ? 'Exit Demo' : 'Logout'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <Button
      variant="neutral"
      size="sm"
      onClick={() => signIn("google")}
    >
      <User className="w-4 h-4 mr-2" />
      Sign In
    </Button>
  )
}
