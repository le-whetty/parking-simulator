"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { getDLCItemsWithStatus, DLC_CODES } from "@/lib/dlc"
import type { DLCItem } from "@/lib/dlc"

interface DLCStoreProps {
  onBack: () => void
}

export default function DLCStore({ onBack }: DLCStoreProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [dlcItems, setDlcItems] = useState<(DLCItem & { unlocked: boolean; unlocked_at?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    async function loadDLC() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        // Try multiple ways to get email
        const email = session?.user?.email || 
                     session?.user?.user_metadata?.email || 
                     session?.user?.identities?.[0]?.identity_data?.email ||
                     null
        console.log("🔍 DLC Store: Session check:", { 
          hasSession: !!session, 
          email,
          fullSession: JSON.stringify(session, null, 2)
        })
        
        if (email) {
          setUserEmail(email)
          const items = await getDLCItemsWithStatus(email)
          console.log(`📦 DLC Store: Loaded ${items.length} items`, items)
          setDlcItems(items)
        } else {
          console.warn("⚠️ DLC Store: No email found in session")
          // Still try to load items (they should be publicly readable)
          const items = await getDLCItemsWithStatus('')
          console.log(`📦 DLC Store: Loaded ${items.length} items without session`, items)
          setDlcItems(items)
        }
      } catch (error) {
        console.error("Error loading DLC:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDLC()
  }, [])

  const copyToClipboard = async (dlcCode: string) => {
    // Get email from session if not already set
    let email = userEmail
    if (!email) {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        console.log("🔍 DLC Store: Session check:", { 
          hasSession: !!session, 
          hasUser: !!session?.user, 
          email: session?.user?.email,
          sessionError,
          fullSession: JSON.stringify(session, null, 2)
        })
        
        // Try multiple ways to get email
        email = session?.user?.email || 
                session?.user?.user_metadata?.email || 
                session?.user?.identities?.[0]?.identity_data?.email ||
                null
        console.log("🔍 DLC Store: Retrieved email from session:", email)
      } catch (error) {
        console.error("Error getting email:", error)
      }
    }
    
    const message = `Parking Simulator DLC Unlock

DLC Code: ${dlcCode}

Email: ${email || 'null'}

[INSERT WHAT YOU GIFTED AND WHY HERE]`
    
    await navigator.clipboard.writeText(message)
    setCopiedCode(dlcCode)
    setTimeout(() => setCopiedCode(null), 3000)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-tracksuit-purple-500 mb-3"></div>
          <p className="font-quicksand text-tracksuit-purple-600">Loading DLC store...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-6 max-w-6xl mx-auto pt-24">
      {/* Header */}
      <div className="w-full mb-8">
        <Button onClick={onBack} variant="outline" className="mb-4 font-chapeau">
          ← Back
        </Button>
        <h1 className="text-4xl font-bold font-chapeau text-transparent bg-clip-text bg-gradient-to-r from-tracksuit-purple-600 to-tracksuit-purple-700 mb-2">
          DLC Store
        </h1>
        <p className="text-tracksuit-purple-700 font-quicksand">
          Unlock new content by spending SPARK on your teammates!
        </p>
      </div>

      {/* Instructions Card */}
      <Card className="w-full mb-6 p-6 bg-gradient-to-r from-tracksuit-purple-50 via-tracksuit-purple-100/50 to-tracksuit-purple-50 border-2 border-tracksuit-purple-300/50">
        <h2 className="text-xl font-bold font-chapeau text-tracksuit-purple-800 mb-3">How to Unlock DLC</h2>
        <ol className="list-decimal list-inside space-y-2 text-tracksuit-purple-700 font-quicksand">
          <li>Click "Buy DLC Pack" on any pack below</li>
          <li>Copy the message that appears</li>
          <li>Spend at least $10 on a teammate (can't be yourself)</li>
          <li>Keep the receipt</li>
          <li>Submit it to <a href="https://airtable.com/appPCzcCydIa5NG3G/shrKp6ii5PWAaQDDZ" target="_blank" rel="noopener noreferrer" className="text-tracksuit-purple-600 underline">Spark Spend fund</a></li>
          <li>Paste the copied message into the "Why did you spend it?" question, along with details about what you bought</li>
          <li>Submit the form</li>
          <li>You'll receive a Slack notification when your DLC is unlocked!</li>
        </ol>
      </Card>

      {/* DLC Packs Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {dlcItems.map((item) => (
          <Card
            key={item.id}
            className={`p-6 ${item.unlocked ? 'bg-gradient-to-r from-tracksuit-green-50 via-tracksuit-green-100/50 to-tracksuit-green-50 border-2 border-tracksuit-green-300/50' : 'border-2 border-tracksuit-purple-200/50'}`}
          >
            {item.image_url && (
              <div className="w-full h-32 mb-4 flex items-center justify-center bg-white rounded-lg border border-tracksuit-purple-200">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <h3 className="text-xl font-bold font-chapeau text-tracksuit-purple-800 mb-2">
              {item.name}
            </h3>
            {item.description && (
              <p className="text-sm text-tracksuit-purple-600 font-quicksand mb-4">
                {item.description}
              </p>
            )}
            {item.unlocked ? (
              <div className="mt-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-tracksuit-green-200 text-tracksuit-green-800 rounded-full text-sm font-semibold font-chapeau">
                  ✓ Unlocked
                </div>
                {item.unlocked_at && (
                  <p className="text-xs text-tracksuit-purple-500 font-quicksand mt-2">
                    Unlocked {new Date(item.unlocked_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4">
                <Button
                  onClick={() => copyToClipboard(item.code)}
                  className="w-full font-chapeau"
                  disabled={copiedCode === item.code}
                >
                  {copiedCode === item.code ? '✓ Copied!' : 'Buy DLC Pack'}
                </Button>
                {copiedCode === item.code && (
                  <div className="mt-3 p-3 bg-tracksuit-purple-50 rounded-lg border border-tracksuit-purple-200">
                    <p className="text-xs text-tracksuit-purple-700 font-quicksand mb-2">
                      <strong>Message copied!</strong> Follow the instructions above to submit your Spark Spend request.
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {dlcItems.length === 0 && (
        <Card className="w-full p-8 text-center">
          <p className="text-tracksuit-purple-600 font-quicksand">No DLC packs available at this time.</p>
        </Card>
      )}
    </div>
  )
}

