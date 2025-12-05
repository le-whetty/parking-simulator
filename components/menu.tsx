"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Leaderboard from "./leaderboard"
import ProfileMenu from "./profile-menu"
import { supabase } from "@/lib/supabase"
import mixpanel from "@/lib/mixpanel"

interface MenuProps {
  onLogout?: () => void
  onEditUsername?: () => void
  onVictorySimulator?: () => void
  onViewProfile?: () => void
  onViewDLCStore?: () => void
}

export default function Menu({ onLogout, onEditUsername, onVictorySimulator, onViewProfile, onViewDLCStore }: MenuProps) {
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Check authentication on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.email) {
          setUserEmail(session.user.email)
        }
      } catch (error) {
        console.error("Error checking auth:", error)
      }
    }
    checkAuth()
  }, [])

  return (
    <>
      {/* Menu Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-tracksuit-purple-200/50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logos/logo.png" alt="Tracksuit" className="h-8 w-auto" />
            <h2 className="text-xl font-bold font-chapeau text-transparent bg-clip-text bg-gradient-to-r from-tracksuit-purple-600 to-tracksuit-purple-700">
              Parking Simulator
            </h2>
          </div>
          <nav className="flex items-center gap-2">
            <Button
              onClick={() => onVictorySimulator?.()}
              variant="ghost"
              className="font-chapeau text-sm px-3 py-2 text-tracksuit-purple-700 hover:bg-tracksuit-purple-50 hover:text-tracksuit-purple-800"
            >
              🥇 Victory Simulator
            </Button>
            <Button
              onClick={() => onViewProfile?.()}
              variant="ghost"
              className="font-chapeau text-sm px-3 py-2 text-tracksuit-purple-700 hover:bg-tracksuit-purple-50 hover:text-tracksuit-purple-800"
            >
              👤 Profile
            </Button>
            <Button
              onClick={() => onViewDLCStore?.()}
              variant="ghost"
              className="font-chapeau text-sm px-3 py-2 text-tracksuit-purple-700 hover:bg-tracksuit-purple-50 hover:text-tracksuit-purple-800"
            >
              🎮 DLC Store
            </Button>
            <Button
              onClick={async () => {
                // Track Leaderboard Viewed event
                try {
                  const { data: { session } } = await supabase.auth.getSession()
                  if (session?.user) {
                    mixpanel.identify(session.user.id)
                    mixpanel.track('Leaderboard Viewed', {
                      user_id: session.user.id,
                      source: 'menu',
                    })
                  }
                } catch (error) {
                  console.error("Error tracking leaderboard viewed:", error)
                }
                setShowLeaderboard(true)
              }}
              variant="ghost"
              className="font-chapeau text-sm px-3 py-2 text-tracksuit-purple-700 hover:bg-tracksuit-purple-50 hover:text-tracksuit-purple-800"
            >
              🏆 Leaderboard
            </Button>
            <div className="flex items-center ml-2 pl-2 border-l border-tracksuit-purple-200">
              <ProfileMenu onLogout={onLogout} onEditUsername={onEditUsername} />
            </div>
          </nav>
        </div>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-[60] bg-[#faf7f0]/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowLeaderboard(false)}
              className="absolute top-6 right-6 text-tracksuit-purple-700 hover:text-tracksuit-purple-600 text-3xl font-bold z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/90 hover:bg-white shadow-lg border border-tracksuit-purple-200 transition-colors"
              aria-label="Close leaderboard"
            >
              ×
            </button>
            <Leaderboard userEmail={userEmail || undefined} />
          </div>
        </div>
      )}
    </>
  )
}

