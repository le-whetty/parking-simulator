import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")

  console.log('🔐 [CALLBACK] OAuth callback received:', {
    origin: requestUrl.origin,
    hostname: requestUrl.hostname,
    hasCode: !!code,
    next,
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

  // Redirect to root with a flag - client-side code will check localStorage and redirect to preview if needed
  const redirectPath = next || "/"
  const redirectUrl = new URL(redirectPath, requestUrl.origin)
  redirectUrl.searchParams.set('auth_callback', 'true')
  
  console.log('🔐 [CALLBACK] Redirecting to:', {
    redirectUrl: redirectUrl.toString(),
    origin: redirectUrl.origin,
    pathname: redirectUrl.pathname,
    search: redirectUrl.search
  })
  
  return NextResponse.redirect(redirectUrl)
}

