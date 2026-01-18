'use client'

import { useSession, signIn, signOut } from "next-auth/react"
import { User, LogOut, Home } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
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
  const [imageError, setImageError] = useState(false)

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U'
    const names = name.trim().split(' ')
    if (names.length === 1) return names[0].charAt(0).toUpperCase()
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
  }

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
          {/* Welcome, {user?.name?.split(' ')[0] || 'User'} */}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="p-0 w-10 h-10 rounded-full">
              {user?.image && !imageError ? (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="w-full h-full rounded-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-semibold text-sm">
                  {getInitials(user?.name)}
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 z-[9999] bg-white border border-gray-200 shadow-lg">
            {/* User info in dropdown */}
            <div className="px-3 py-2 text-sm">
              <div className="font-medium">{user?.name || 'User'}</div>
              <div className="text-muted-foreground text-xs">{user?.email}</div>
            </div>

            <DropdownMenuSeparator className="bg-gray-200" />

            {/* <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-sm bg-transparent">
              <Link href="/" className="flex items-center gap-2 w-full">
                <Home className="w-4 h-4" />
                Apps Gallery
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-gray-400" /> */}

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
      variant="secondary"
      size="sm"
      onClick={() => signIn("google")}
    >
      <User className="w-4 h-4 mr-2" />
      Sign In
    </Button>
  )
}
