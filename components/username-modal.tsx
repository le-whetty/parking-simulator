"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

interface UsernameModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export default function UsernameModal({ isOpen, onClose, onSave }: UsernameModalProps) {
  const [username, setUsername] = useState("")
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Get user info when modal opens
      async function getUserInfo() {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            setUserEmail(session.user.email || null)
            setAvatarUrl(
              session.user.user_metadata?.avatar_url || 
              session.user.user_metadata?.picture || 
              null
            )
            
            // Check if user already has a username
            const { data: existingUsername } = await supabase
              .from('usernames')
              .select('username')
              .eq('user_email', session.user.email)
              .maybeSingle()
            
            if (existingUsername?.username) {
              setUsername(existingUsername.username)
            }
          }
        } catch (error) {
          console.error("Error fetching user info:", error)
        }
      }
      getUserInfo()
    }
  }, [isOpen])

  const handleSave = async () => {
    if (!username.trim()) {
      setError("Username cannot be empty")
      return
    }

    if (!userEmail) {
      setError("User email not found")
      return
    }

    // Validate username (alphanumeric, underscore, hyphen, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
    if (!usernameRegex.test(username)) {
      setError("Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens")
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Check if username is already taken
      const { data: existing, error: checkError } = await supabase
        .from('usernames')
        .select('user_email')
        .eq('username', username.toLowerCase())
        .maybeSingle()

      // If there's an error (other than no rows found), log it
      if (checkError && checkError.code !== 'PGRST116') {
        console.error("Error checking username:", checkError)
        setError("Error checking username availability. Please try again.")
        setIsSaving(false)
        return
      }

      if (existing && existing.user_email !== userEmail) {
        setError("Username is already taken")
        setIsSaving(false)
        return
      }

      // Upsert username (insert or update) with avatar URL
      const { error: upsertError } = await supabase
        .from('usernames')
        .upsert({
          user_email: userEmail,
          username: username.toLowerCase(),
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_email'
        })

      if (upsertError) {
        console.error("Error saving username:", upsertError)
        setError("Failed to save username. Please try again.")
        setIsSaving(false)
        return
      }

      // Success - close modal and notify parent
      setIsSaving(false)
      onClose()
      onSave() // Call onSave after closing to trigger parent refresh
    } catch (error) {
      console.error("Error saving username:", error)
      setError("An error occurred. Please try again.")
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fadeIn border border-tracksuit-purple-200/50">
        <div className="flex flex-col items-center gap-6">
          {/* Profile Picture */}
          {avatarUrl ? (
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-tracksuit-purple-300 shadow-lg">
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-tracksuit-purple-500 flex items-center justify-center border-4 border-tracksuit-purple-300 shadow-lg">
              <span className="text-4xl text-white font-bold font-chapeau">
                {userEmail?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
          )}

          {/* Title */}
          <h2 className="text-2xl font-bold font-chapeau text-tracksuit-purple-800">
            Choose Your Username
          </h2>

          {/* Username Input */}
          <div className="w-full">
            <label className="block text-sm font-semibold text-tracksuit-purple-700 mb-2 font-chapeau">
              Username
            </label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-tracksuit-purple-600 font-chapeau">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSaving) {
                    handleSave()
                  }
                }}
                placeholder="username"
                className="flex-1 px-4 py-3 border-2 border-tracksuit-purple-300 rounded-lg focus:outline-none focus:border-tracksuit-purple-500 font-quicksand text-lg"
                autoFocus
                disabled={isSaving}
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 font-quicksand">{error}</p>
            )}
            <p className="mt-2 text-xs text-tracksuit-purple-600 font-quicksand">
              3-20 characters, letters, numbers, underscores, or hyphens
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 w-full">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 font-chapeau"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-tracksuit-purple-600 hover:bg-tracksuit-purple-700 text-white font-chapeau"
              disabled={isSaving || !username.trim()}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

