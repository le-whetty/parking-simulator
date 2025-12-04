import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")
  
  // Check for preview redirect URL in cookie (set from preview deployment)
  const cookies = request.cookies
  const previewUrl = cookies.get('preview_redirect_url')?.value

  console.log('🔐 [CALLBACK] OAuth callback received:', {
    origin: requestUrl.origin,
    hostname: requestUrl.hostname,
    hasCode: !!code,
    next,
    previewUrl,
    hasPreviewCookie: !!previewUrl,
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

  // If preview URL exists in cookie, redirect there server-side (works even if production doesn't have client code)
  if (previewUrl) {
    try {
      const previewUrlObj = new URL(previewUrl)
      // Use a simple redirect page that will handle hash-based redirects client-side
      const redirectPath = next || "/preview-redirect.html"
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
      
      // Clear the cookie after use
      const response = NextResponse.redirect(finalUrl)
      response.cookies.delete('preview_redirect_url')
      return response
    } catch (error) {
      console.error('🔐 [CALLBACK] Error parsing preview URL:', error)
      // Fall through to normal redirect
    }
  }
  
  // If no preview URL but we have a hash, redirect to preview-redirect.html to check localStorage
  if (requestUrl.hash && !previewUrl) {
    const redirectUrl = new URL('/preview-redirect.html', requestUrl.origin)
    redirectUrl.hash = requestUrl.hash
    console.log('🔐 [CALLBACK] Hash present but no cookie, redirecting to redirect page:', redirectUrl.toString())
    return NextResponse.redirect(redirectUrl)
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

