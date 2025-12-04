import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

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
  // This ensures redirects stay on the same domain
  const origin = requestUrl.origin
  const redirectUrl = new URL("/", origin)
  
  return NextResponse.redirect(redirectUrl)
}

