import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next")

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

  // Redirect to root with a flag - client-side code will check localStorage and redirect to preview if needed
  const redirectPath = next || "/"
  const redirectUrl = new URL(redirectPath, requestUrl.origin)
  redirectUrl.searchParams.set('auth_callback', 'true')
  
  return NextResponse.redirect(redirectUrl)
}

