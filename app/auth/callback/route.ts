import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")
  
  // Check for preview redirect URL in query param (passed from preview deployment)
  // This works cross-domain unlike cookies/localStorage
  const previewUrl = requestUrl.searchParams.get("preview_url")

  console.log('🔐 [CALLBACK] OAuth callback received:', {
    origin: requestUrl.origin,
    hostname: requestUrl.hostname,
    hasCode: !!code,
    next,
    previewUrl,
    hasPreviewParam: !!previewUrl,
    fullUrl: requestUrl.toString()
  })

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('🔐 [CALLBACK] Session exchange:', {
      hasSession: !!session,
      hasError: !!error,
      userId: session?.user?.id,
      email: session?.user?.email
    })
    
    // Track Sign Up event on successful authentication
    if (session?.user) {
      // Note: Mixpanel tracking will happen client-side after redirect
    }
  }

  // If preview URL exists in query param, redirect there server-side
  if (previewUrl) {
    try {
      const previewUrlObj = new URL(previewUrl)
      const redirectPath = next || "/"
      const finalUrl = new URL(redirectPath, previewUrlObj.origin)
      
      // Preserve hash if present (for hash-based redirects)
      const hash = requestUrl.hash
      if (hash) {
        finalUrl.hash = hash
      } else {
        // If no hash, add auth_callback flag for client-side detection
        finalUrl.searchParams.set('auth_callback', 'true')
      }
      
      console.log('🔐 [CALLBACK] ⚡ Redirecting to preview deployment:', {
        previewUrl,
        finalUrl: finalUrl.toString(),
        hasHash: !!hash,
        redirectPath
      })
      
      return NextResponse.redirect(finalUrl)
    } catch (error) {
      console.error('🔐 [CALLBACK] Error parsing preview URL:', error)
      // Fall through to normal redirect
    }
  }

  // Normal redirect (production or no preview URL)
  const redirectPath = next || "/"
  const redirectUrl = new URL(redirectPath, requestUrl.origin)
  redirectUrl.searchParams.set('auth_callback', 'true')
  
  console.log('🔐 [CALLBACK] Redirecting to production:', {
    redirectUrl: redirectUrl.toString(),
    origin: redirectUrl.origin,
    pathname: redirectUrl.pathname,
    search: redirectUrl.search
  })
  
  return NextResponse.redirect(redirectUrl)
}

