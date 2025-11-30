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
 * Supabase webhook payload structure (actual):
 * The payload may come directly or wrapped in an array with headers/body structure.
 * The actual user data is in body.record or directly in payload.record
 * 
 * {
 *   "type": "INSERT",
 *   "table": "users",
 *   "schema": "auth",
 *   "record": {
 *     "id": "user-uuid",
 *     "email": "user@example.com",
 *     "created_at": "2024-01-01T00:00:00Z",
 *     "raw_user_meta_data": { ... },
 *     "raw_app_meta_data": {
 *       "provider": "email" | "google" | etc,
 *       "providers": [...]
 *     },
 *     ...
 *   },
 *   "old_record": null
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the webhook payload
    const rawPayload = await request.json()
    
    // Handle different payload structures:
    // 1. Direct payload: { type: "INSERT", record: {...} }
    // 2. Wrapped payload: [{ body: { type: "INSERT", record: {...} } }]
    let payload = rawPayload
    if (Array.isArray(rawPayload) && rawPayload.length > 0) {
      // If it's an array, extract the first element's body
      payload = rawPayload[0].body || rawPayload[0]
    } else if (rawPayload.body) {
      // If it has a body property, use that
      payload = rawPayload.body
    }
    
    // Verify this is an INSERT event for the users table
    if (payload.type !== "INSERT" || payload.table !== "users") {
      return NextResponse.json(
        { error: "Invalid webhook event type", received: { type: payload.type, table: payload.table } },
        { status: 400 }
      )
    }

    const user = payload.record
    
    if (!user || !user.id || !user.email) {
      return NextResponse.json(
        { error: "Invalid user data in webhook payload", received: { hasId: !!user?.id, hasEmail: !!user?.email } },
        { status: 400 }
      )
    }

    // Extract provider information from raw_app_meta_data
    const provider = user.raw_app_meta_data?.provider || 
                     user.raw_app_meta_data?.providers?.[0] || 
                     'unknown'
    
    // Extract user metadata
    const userMetaData = user.raw_user_meta_data || {}
    const userName = userMetaData.full_name || 
                     userMetaData.name || 
                     user.email?.split('@')[0] || 
                     'Unknown'

    // Track Sign Up event in Mixpanel using HTTP API
    try {
      // Set user properties first
      await setMixpanelUserProperties(user.id, {
        $name: userName,
        $email: user.email || '',
        created_at: user.created_at || new Date().toISOString(),
        signup_method: provider,
      })
      
      // Track the Sign Up event
      await trackMixpanelEvent('Sign Up', {
        distinct_id: user.id,
        user_id: user.id,
        email: user.email,
        signup_method: provider,
        created_at: user.created_at,
      })
      
      console.log(`✅ Tracked Sign Up event for user: ${user.email} (${user.id}) via ${provider}`)
    } catch (mixpanelError) {
      console.error("Error tracking Mixpanel event:", mixpanelError)
      // Don't fail the webhook if Mixpanel fails - log and continue
    }

    // Return success response
    return NextResponse.json(
      { 
        success: true, 
        message: "Sign Up event tracked successfully",
        user_id: user.id,
        email: user.email,
        provider: provider
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

