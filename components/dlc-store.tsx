"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase"
import { getDLCItemsWithStatus, setDLCItemEnabled, isDLCItemEnabled, getSelectedHorn, setSelectedHorn, DLC_CODES } from "@/lib/dlc"
import type { DLCItem } from "@/lib/dlc"
import { DLC_PACKS } from "@/lib/dlc-packs"
import { useAudioManager } from "@/hooks/use-audio-manager"

interface DLCStoreProps {
  onBack: () => void
}

export default function DLCStore({ onBack }: DLCStoreProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [dlcItems, setDlcItems] = useState<(DLCItem & { unlocked: boolean; enabled: boolean; unlocked_at?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
  const [selectedHorn, setSelectedHornState] = useState<1 | 2 | 3 | 'random'>(1)
  const audioManager = useAudioManager()
  
  // Horn name mapping
  const hornNames: Record<1 | 2 | 3, string> = {
    1: "Toot Toot",
    2: "Old Timey",
    3: "La Cucaracha",
  }
  
  // Check if we're in dev mode (skip auth)
  const isDevMode = process.env.NEXT_PUBLIC_SKIP_AUTH === "true" || process.env.NEXT_PUBLIC_SKIP_AUTH === "1"

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
    
    // Load horn selection from localStorage
    setSelectedHornState(getSelectedHorn())
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
    // Don't auto-hide - let user dismiss manually
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

  // If a pack is selected, show pack detail view
  if (selectedPack && DLC_PACKS[selectedPack]) {
    const pack = DLC_PACKS[selectedPack]
    const packStatus = dlcItems.find(item => item.code === pack.code)
    const isUnlocked = packStatus?.unlocked || false

    return (
      <div className="flex flex-col items-center min-h-screen p-6 max-w-6xl mx-auto pt-24">
        {/* Header */}
        <div className="w-full mb-8">
          <Button onClick={() => setSelectedPack(null)} variant="outline" className="mb-4 font-chapeau">
            ← Back to Packs
          </Button>
          <h1 className="text-4xl font-bold font-chapeau text-transparent bg-clip-text bg-gradient-to-r from-tracksuit-purple-600 to-tracksuit-purple-700 mb-2">
            {pack.name}
          </h1>
          <p className="text-tracksuit-purple-700 font-quicksand">
            {pack.description}
          </p>
        </div>

        {/* Pack Items Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-6">
          {pack.items.map((item) => {
            const itemEnabled = isDLCItemEnabled(pack.code, item.id, isUnlocked)
            
            return (
              <Card
                key={item.id}
                className={`p-6 border-2 ${
                  isUnlocked && itemEnabled
                    ? 'border-tracksuit-green-300/50 bg-tracksuit-green-50/30'
                    : 'border-tracksuit-purple-200/50'
                }`}
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
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-bold font-chapeau text-tracksuit-purple-800">
                    {item.name}
                  </h3>
                  {isUnlocked && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-quicksand ${
                        itemEnabled ? 'text-tracksuit-green-700' : 'text-tracksuit-purple-500'
                      }`}>
                        {itemEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <Switch
                        checked={itemEnabled}
                        onCheckedChange={(checked) => {
                          setDLCItemEnabled(pack.code, item.id, checked)
                          // Force re-render by updating state
                          setDlcItems(prev => [...prev])
                        }}
                        disabled={!isUnlocked}
                      />
                    </div>
                  )}
                </div>
                <p className="text-sm text-tracksuit-purple-600 font-quicksand mb-4">
                  {item.description}
                </p>
                
                {/* Horn Selection (only for Car Horn item) */}
                {isUnlocked && item.id === 'car-horn' && itemEnabled && (
                  <div className="mt-4 p-4 bg-tracksuit-purple-50 rounded-lg border border-tracksuit-purple-200">
                    <h4 className="text-sm font-bold font-chapeau text-tracksuit-purple-800 mb-2">
                      Select Horn Sound
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {([1, 2, 3, 'random'] as const).map((horn) => (
                        <Button
                          key={horn}
                          onClick={() => {
                            // Play preview sound
                            if (horn !== 'random') {
                              audioManager.playHorn(horn)
                            } else {
                              // Play random horn for preview
                              const randomHorn = Math.floor(Math.random() * 3) + 1 as 1 | 2 | 3
                              audioManager.playHorn(randomHorn)
                            }
                            // Save selection
                            setSelectedHorn(horn)
                            setSelectedHornState(horn)
                          }}
                          className={`font-chapeau text-xs px-3 py-1 ${
                            selectedHorn === horn
                              ? 'bg-tracksuit-purple-600 text-white'
                              : 'bg-white text-tracksuit-purple-800 hover:bg-tracksuit-purple-100'
                          }`}
                        >
                          {horn === 'random' ? '🎲 Random' : hornNames[horn]}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>

        {/* Buy Pack Button */}
        {isUnlocked ? (
          <Card className="w-full p-6 bg-gradient-to-r from-tracksuit-green-50 via-tracksuit-green-100/50 to-tracksuit-green-50 border-2 border-tracksuit-green-300/50">
            <div className="flex items-center justify-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-tracksuit-green-200 text-tracksuit-green-800 rounded-full text-sm font-semibold font-chapeau">
                ✓ Unlocked
              </div>
              {packStatus?.unlocked_at && (
                <span className="text-xs text-tracksuit-purple-500 font-quicksand">
                  Unlocked {new Date(packStatus.unlocked_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </Card>
        ) : (
          <Card className="w-full p-6">
            <Button
              onClick={() => copyToClipboard(pack.code)}
              className="w-full font-chapeau text-lg py-6"
              disabled={copiedCode === pack.code}
            >
              {copiedCode === pack.code ? '✓ Copied!' : 'Buy DLC Pack'}
            </Button>
            {copiedCode === pack.code && (
              <div className="mt-4 p-4 bg-tracksuit-purple-50 rounded-lg border border-tracksuit-purple-200">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm text-tracksuit-purple-700 font-quicksand">
                    <strong>Message copied!</strong> Follow the instructions below to submit your Spark Spend request.
                  </p>
                  <Button
                    onClick={() => setCopiedCode(null)}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 px-2"
                  >
                    ✕
                  </Button>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-xs text-tracksuit-purple-600 font-quicksand">
                  <li>Spend at least $10 on a teammate (can't be yourself)</li>
                  <li>Keep the receipt</li>
                  <li>Submit it to <a href="https://airtable.com/appPCzcCydIa5NG3G/shrKp6ii5PWAaQDDZ" target="_blank" rel="noopener noreferrer" className="underline">Spark Spend fund</a></li>
                  <li>Paste the copied message into the "Why did you spend it?" question</li>
                  <li>Submit the form</li>
                </ol>
              </div>
            )}
          </Card>
        )}
      </div>
    )
  }

  // Main pack list view
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
          <li>Click on any pack below to view its contents</li>
          <li>Click "Buy DLC Pack" to copy the unlock message</li>
          <li>Spend at least $10 on a teammate (can't be yourself)</li>
          <li>Keep the receipt</li>
          <li>Submit it to <a href="https://airtable.com/appPCzcCydIa5NG3G/shrKp6ii5PWAaQDDZ" target="_blank" rel="noopener noreferrer" className="text-tracksuit-purple-600 underline">Spark Spend fund</a></li>
          <li>Paste the copied message into the "Why did you spend it?" question, along with details about what you bought</li>
          <li>Submit the form</li>
          <li>You'll receive a Slack notification when your DLC is unlocked!</li>
        </ol>
      </Card>

      {/* Dev Mode: Unlock All DLCs */}
      {isDevMode && (
        <Card className="w-full mb-6 p-4 bg-yellow-50 border-2 border-yellow-300">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold font-chapeau text-yellow-800 mb-1">🧪 Dev Mode: Test All DLCs</h3>
              <p className="text-sm text-yellow-700 font-quicksand">
                Click to unlock all DLC packs for testing
              </p>
            </div>
            <Button
              onClick={async () => {
                try {
                  const testEmail = userEmail || 'dev-mode@example.com'
                  const { data, error } = await supabase
                    .from('dlc_unlocks')
                    .upsert(
                      dlcItems.map(item => ({
                        user_email: testEmail,
                        dlc_code: item.code,
                        unlocked_via: 'dev_mode_test',
                      })),
                      { onConflict: 'user_email,dlc_code' }
                    )
                    .select()

                  if (error) {
                    console.error('Error unlocking DLCs:', error)
                    alert('Error unlocking DLCs. Check console for details.')
                  } else {
                    console.log('✅ Unlocked all DLCs for testing:', data)
                    // Reload DLC items
                    const items = await getDLCItemsWithStatus(testEmail)
                    setDlcItems(items)
                    alert('All DLCs unlocked! Refresh the page to see changes.')
                  }
                } catch (error) {
                  console.error('Error unlocking DLCs:', error)
                  alert('Error unlocking DLCs. Check console for details.')
                }
              }}
              className="font-chapeau bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Unlock All DLCs
            </Button>
          </div>
        </Card>
      )}

      {/* DLC Packs Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {dlcItems
          .filter(item => DLC_PACKS[item.code]) // Only show packs we have definitions for
          .map((item) => {
            const pack = DLC_PACKS[item.code]
            return (
              <Card
                key={item.id}
                className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                  item.unlocked 
                    ? 'bg-gradient-to-r from-tracksuit-green-50 via-tracksuit-green-100/50 to-tracksuit-green-50 border-2 border-tracksuit-green-300/50' 
                    : 'border-2 border-tracksuit-purple-200/50 hover:border-tracksuit-purple-300'
                }`}
                onClick={() => setSelectedPack(item.code)}
              >
                {pack.image_url && (
                  <div className="w-full h-32 mb-4 flex items-center justify-center bg-white rounded-lg border border-tracksuit-purple-200">
                    <img
                      src={pack.image_url}
                      alt={pack.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                <h3 className="text-xl font-bold font-chapeau text-tracksuit-purple-800 mb-2">
                  {pack.name}
                </h3>
                <p className="text-sm text-tracksuit-purple-600 font-quicksand mb-4">
                  {pack.description}
                </p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-tracksuit-purple-500 font-quicksand">
                    {pack.items.length} item{pack.items.length !== 1 ? 's' : ''}
                  </span>
                  {item.unlocked ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-tracksuit-green-200 text-tracksuit-green-800 rounded-full text-sm font-semibold font-chapeau">
                      ✓ Unlocked
                    </div>
                  ) : (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPack(item.code)
                      }}
                      className="font-chapeau text-sm px-4 py-1"
                    >
                      View Pack
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
      </div>

      {dlcItems.length === 0 && (
        <Card className="w-full p-8 text-center">
          <p className="text-tracksuit-purple-600 font-quicksand">No DLC packs available at this time.</p>
        </Card>
      )}
    </div>
  )
}
