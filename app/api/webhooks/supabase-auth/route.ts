import { NextRequest, NextResponse } from "next/server"

const MIXPANEL_TOKEN = "c7f541cc15cc7d2454aa84b67fc5353b"
const MIXPANEL_API_URL = "https://api.mixpanel.com"

/**
 * Track an event to Mixpanel using their HTTP API
 */
async function trackMixpanelEvent(event: string, properties: Record<string, any>) {
  try {
    const eventData = {
      event,
      properties: {
        ...properties,
        token: MIXPANEL_TOKEN,
        time: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
      },
    }

    // Encode the data as base64
    const encodedData = Buffer.from(JSON.stringify(eventData)).toString("base64")

    // Send to Mixpanel's track endpoint
    const response = await fetch(`${MIXPANEL_API_URL}/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodedData}`,
    })

    if (!response.ok) {
      throw new Error(`Mixpanel API error: ${response.status} ${response.statusText}`)
    }

    return await response.text()
  } catch (error) {
    console.error("Error sending event to Mixpanel:", error)
    throw error
  }
}

/**
 * Set user properties in Mixpanel using their HTTP API
 */
async function setMixpanelUserProperties(distinctId: string, properties: Record<string, any>) {
  try {
    const updateData = {
      $token: MIXPANEL_TOKEN,
      $distinct_id: distinctId,
      $set: properties,
    }

    // Encode the data as base64
    const encodedData = Buffer.from(JSON.stringify(updateData)).toString("base64")

    // Send to Mixpanel's engage endpoint
    const response = await fetch(`${MIXPANEL_API_URL}/engage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodedData}`,
    })

    if (!response.ok) {
      throw new Error(`Mixpanel API error: ${response.status} ${response.statusText}`)
    }

    return await response.text()
  } catch (error) {
    console.error("Error setting user properties in Mixpanel:", error)
    throw error
  }
}

/**
 * Webhook endpoint to receive Supabase auth user insert events
 * 
 * Supabase webhook payload structure:
 * {
 *   "type": "INSERT",
 *   "table": "users",
 *   "record": {
 *     "id": "user-uuid",
 *     "email": "user@example.com",
 *     "created_at": "2024-01-01T00:00:00Z",
 *     "user_metadata": { ... },
 *     ...
 *   },
 *   "old_record": null
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the webhook payload
    const payload = await request.json()
    
    // Verify this is an INSERT event for the users table
    if (payload.type !== "INSERT" || payload.table !== "users") {
      return NextResponse.json(
        { error: "Invalid webhook event type" },
        { status: 400 }
      )
    }

    const user = payload.record
    
    if (!user || !user.id || !user.email) {
      return NextResponse.json(
        { error: "Invalid user data in webhook payload" },
        { status: 400 }
      )
    }

    // Track Sign Up event in Mixpanel using HTTP API
    try {
      // Set user properties first
      await setMixpanelUserProperties(user.id, {
        $name: user.user_metadata?.full_name || 
               user.user_metadata?.name || 
               user.email?.split('@')[0] || 
               'Unknown',
        $email: user.email || '',
        created_at: user.created_at || new Date().toISOString(),
        signup_method: 'google', // Assuming Google OAuth based on your setup
      })
      
      // Track the Sign Up event
      await trackMixpanelEvent('Sign Up', {
        distinct_id: user.id,
        user_id: user.id,
        email: user.email,
        signup_method: 'google',
        created_at: user.created_at,
      })
      
      console.log(`✅ Tracked Sign Up event for user: ${user.email} (${user.id})`)
    } catch (mixpanelError) {
      console.error("Error tracking Mixpanel event:", mixpanelError)
      // Don't fail the webhook if Mixpanel fails - log and continue
    }

    // Return success response
    return NextResponse.json(
      { 
        success: true, 
        message: "Sign Up event tracked successfully",
        user_id: user.id 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
}

// Optional: Add GET handler for webhook verification/testing
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      message: "Supabase Auth Webhook endpoint is active",
      method: "POST",
      description: "This endpoint receives POST requests from Supabase webhooks for user sign-ups"
    },
    { status: 200 }
  )
}

