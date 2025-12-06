# Research Prompt for Claude: Vercel Preview Environment OAuth Redirect Issue

## Context

I'm building a Next.js 14 application deployed on Vercel with Supabase authentication (Google OAuth). I need to set up a preview/staging environment that works with authentication, but I'm running into redirect URL issues.

## The Problem

**Tech Stack:**
- Next.js 14 (React 19)
- Supabase Auth (Google OAuth provider)
- Vercel deployments (production + preview branches)
- Production URL: `https://ts-parking-simulator.vercel.app`
- Preview URLs: Random Vercel preview URLs like `https://parking-simulator-abc123.vercel.app`

**The Issue:**
1. Google OAuth doesn't allow wildcards in redirect URLs
2. Vercel preview URLs are random and unpredictable
3. When users sign in from a preview deployment, Supabase redirects them to production instead of back to the preview URL
4. We've tried several approaches but none have worked reliably

## What We've Tried

### Attempt 1: Query Parameters
- Passed preview URL as `?preview_url=...` in the `redirectTo` parameter
- **Problem**: Supabase seems to strip query parameters or use hash-based redirects that bypass our callback route

### Attempt 2: Cookies + Server-Side Redirect
- Set cookie on preview deployment with preview URL
- Callback route reads cookie and redirects server-side
- **Problem**: Cookies are domain-specific, so cookies set on `preview.vercel.app` aren't sent to `ts-parking-simulator.vercel.app`

### Attempt 3: localStorage + Client-Side Redirect
- Save preview URL to localStorage before OAuth
- After OAuth callback, client-side code checks localStorage and redirects
- **Problem**: localStorage is also domain-specific, and Supabase uses hash-based redirects (`#access_token=...`) that bypass our callback route entirely

### Attempt 4: Standalone HTML Redirect Page
- Created `/preview-redirect.html` that checks localStorage
- **Problem**: Still doesn't work because Supabase redirects directly to root with hash fragments

## Current Code

**Login Screen (`components/login-screen.tsx`):**
```typescript
const handleSignIn = async () => {
  const currentHost = window.location.hostname
  const isPreviewDeployment = currentHost.includes('vercel.app') && 
                               currentHost !== 'ts-parking-simulator.vercel.app'
  
  const productionUrl = 'https://ts-parking-simulator.vercel.app'
  let redirectUrl = `${productionUrl}/auth/callback`
  
  if (isPreviewDeployment) {
    const previewUrl = window.location.origin
    redirectUrl += `?preview_url=${encodeURIComponent(previewUrl)}`
    localStorage.setItem('preview_redirect_url', previewUrl)
  }
  
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })
}
```

**Callback Route (`app/auth/callback/route.ts`):**
```typescript
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const previewUrl = requestUrl.searchParams.get("preview_url")
  
  if (code) {
    const supabase = createClient(...)
    await supabase.auth.exchangeCodeForSession(code)
  }
  
  if (previewUrl) {
    // Redirect to preview URL
    return NextResponse.redirect(new URL("/", previewUrl))
  }
  
  return NextResponse.redirect(new URL("/", requestUrl.origin))
}
```

**Client-Side Redirect (`app/page.tsx`):**
```typescript
useEffect(() => {
  const hasAuthHash = window.location.hash.includes('access_token')
  const previewUrl = localStorage.getItem('preview_redirect_url')
  
  if (hasAuthHash && previewUrl && window.location.origin !== previewUrl) {
    window.location.replace(`${previewUrl}${window.location.hash}`)
  }
}, [])
```

## What We Need

**Research Questions:**
1. What's the best practice for handling OAuth redirects with Vercel preview deployments and Supabase?
2. How do other developers solve this problem? (Reddit threads, GitHub issues, blog posts)
3. Is there a way to force Supabase to use the authorization code flow (PKCE) instead of hash-based redirects?
4. Can we configure Supabase to preserve query parameters in redirects?
5. Are there any Supabase-specific settings or configurations we're missing?
6. Should we use a different approach entirely (e.g., separate Supabase project for staging)?

**Constraints:**
- Must work with Google OAuth (can't add wildcard URLs to Google Console)
- Must work with Vercel preview deployments (random URLs)
- Should not require manual configuration for each preview deployment
- Should work seamlessly for users (no broken auth flows)

**What We Want:**
- A reliable solution that redirects users back to the preview deployment after OAuth
- Preferably server-side (more reliable than client-side)
- Should work even if Supabase uses hash-based redirects

## Expected Output

Please provide:
1. **Research findings**: Links to Reddit threads, GitHub issues, blog posts, or documentation that discuss this problem
2. **Recommended solution**: The best approach based on your research, with code examples
3. **Alternative approaches**: If there are multiple viable solutions, list them with pros/cons
4. **Configuration changes**: Any Supabase or Vercel settings we need to change
5. **Code changes**: Specific code modifications needed to implement the solution

Please focus on solutions that have been proven to work in production by other developers, especially those documented in community forums or GitHub discussions.

