import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") // Check for next parameter

  // Log everything for debugging
  console.log('🔐 Auth callback received:', {
    fullUrl: request.url,
    origin: requestUrl.origin,
    host: requestUrl.host,
    pathname: requestUrl.pathname,
    search: requestUrl.search,
    code: code ? 'present' : 'missing',
    next: next || 'none',
    headers: {
      host: request.headers.get('host'),
      referer: request.headers.get('referer'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
    }
  })

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

  // Preserve the origin from the request (UAT or production)
  // Use headers to get the actual host that made the request
  const host = request.headers.get('host') || request.headers.get('x-forwarded-host') || requestUrl.host
  const protocol = request.headers.get('x-forwarded-proto') || requestUrl.protocol || 'https'
  const origin = `${protocol}//${host}`
  
  // If there's a next parameter, use it; otherwise redirect to root
  const redirectPath = next || "/"
  const redirectUrl = new URL(redirectPath, origin)
  
  console.log('🔐 Auth callback redirecting to:', {
    computedOrigin: origin,
    redirectPath,
    redirectUrl: redirectUrl.toString(),
    finalUrl: redirectUrl.toString()
  })
  
  return NextResponse.redirect(redirectUrl)
}

