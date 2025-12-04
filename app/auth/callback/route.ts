import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")
  const previewUrl = requestUrl.searchParams.get("preview_url") // Preview deployment URL to redirect back to

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)
    
    // Track Sign Up event on successful authentication
    if (session?.user) {
      // Note: Mixpanel tracking will happen client-side after redirect
    }
  }

  // If preview URL is provided, redirect back to preview deployment
  if (previewUrl) {
    try {
      const previewUrlObj = new URL(previewUrl)
      const redirectPath = next || "/"
      const finalUrl = new URL(redirectPath, previewUrlObj.origin)
      
      // Preserve any other query params (like auth tokens in hash)
      // Note: Hash fragments aren't available server-side, but Supabase handles this client-side
      
      console.log('🔐 Redirecting back to preview deployment:', finalUrl.toString())
      return NextResponse.redirect(finalUrl)
    } catch (error) {
      console.error('Error parsing preview URL:', error)
      // Fall through to normal redirect
    }
  }

  // Normal redirect (production or no preview URL)
  const redirectPath = next || "/"
  const redirectUrl = new URL(redirectPath, requestUrl.origin)
  
  return NextResponse.redirect(redirectUrl)
}

