"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"

interface ProfileMenuProps {
  onLogout?: () => void
  onEditUsername?: () => void
}

export default function ProfileMenu({ onLogout, onEditUsername }: ProfileMenuProps) {
  const [user, setUser] = useState<{ email: string; avatar_url?: string } | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check for user session
    async function checkUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser({
            email: session.user.email || "",
            avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
          })
        }
      } catch (error) {
        console.error("Error checking user:", error)
      }
    }

    checkUser()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email || "",
          avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
        })
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showMenu])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setShowMenu(false)
      onLogout?.()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Don't render if no user
  if (!user) {
    return null
  }

  return (
    <div className="relative flex items-center" ref={menuRef}>
      {/* Profile Circle */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-10 h-10 rounded-full overflow-hidden border-2 border-tracksuit-purple-300 hover:border-tracksuit-purple-500 transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-tracksuit-purple-500 focus:ring-offset-2 flex-shrink-0"
        aria-label="User profile menu"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.email}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-tracksuit-purple-500 flex items-center justify-center text-white font-bold font-chapeau">
            {user.email.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute right-0 top-12 mt-2 w-48 bg-white rounded-lg shadow-xl border-2 border-tracksuit-purple-200/50 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-tracksuit-purple-100">
            <p className="text-sm font-semibold text-tracksuit-purple-800 font-chapeau truncate">
              {user.email}
            </p>
          </div>
          {onEditUsername && (
            <button
              onClick={() => {
                setShowMenu(false)
                onEditUsername()
              }}
              className="w-full text-left px-4 py-3 text-sm text-tracksuit-purple-700 hover:bg-tracksuit-purple-50 font-quicksand transition-colors border-b border-tracksuit-purple-100"
            >
              Edit username
            </button>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 text-sm text-tracksuit-purple-700 hover:bg-tracksuit-purple-50 font-quicksand transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

