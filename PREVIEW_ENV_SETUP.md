# Preview Environment Setup Guide

This guide explains how to set up a preview environment for testing with authentication enabled, using Vercel Preview deployments.

## The Problem

- Google OAuth doesn't allow wildcards in redirect URLs
- Vercel preview URLs are random (e.g., `my-app-git-feature-abc123.vercel.app`)
- You can't add wildcard URLs to Google Console

## The Solution

We use a client-side workaround that:
1. Detects preview deployments and saves the URL to localStorage
2. Uses production URL for OAuth (which is configured in Google Console)
3. After OAuth callback, redirects back to the preview URL with auth data

## How It Works

### Flow:

1. **User visits preview deployment**: `https://my-app-git-feature-abc123.vercel.app/`
2. **App detects preview**: Saves URL to `localStorage` as `preview_redirect_url`
3. **User clicks "Sign in with Google"**: OAuth redirects to production URL (configured in Google Console)
4. **Production callback**: Receives auth code, exchanges for session, then redirects with `auth_callback=true` flag
5. **Client-side redirect**: Checks localStorage, sees preview URL, redirects back to preview with auth data
6. **User stays on preview**: Authentication complete, user remains on preview deployment

## Configuration

### Vercel Environment Variables

**Production Environment:**
```
NEXT_PUBLIC_SITE_URL=https://ts-parking-simulator.vercel.app
```

**Preview Environment:**
```
NEXT_PUBLIC_SITE_URL=https://ts-parking-simulator.vercel.app
```
(Keep production URL - OAuth will redirect there, then we redirect back)

### Google Console

- **Authorized JavaScript origins**: `https://ts-parking-simulator.vercel.app`
- **Authorized redirect URIs**: `https://ts-parking-simulator.vercel.app/auth/callback`

**Do NOT add preview URLs** - the client-side redirect handles this.

### Supabase

- **Site URL**: `https://ts-parking-simulator.vercel.app`
- **Redirect URLs**: 
  - `https://ts-parking-simulator.vercel.app/auth/callback`
  - (Optional: Add specific preview URLs if you want, but not required)

## Testing

1. Deploy a branch to Vercel (creates preview URL)
2. Visit the preview URL
3. Click "Sign in with Google"
4. Complete OAuth flow
5. You should be redirected back to the preview URL, authenticated

## Code Implementation

The implementation includes:

1. **Preview Detection** (`components/login-screen.tsx`):
   - Detects Vercel preview URLs (contains `vercel.app` but not production domain)
   - Saves preview URL to localStorage before OAuth

2. **Auth Callback** (`app/auth/callback/route.ts`):
   - Exchanges OAuth code for session
   - Redirects with `auth_callback=true` flag

3. **Client Redirect** (`app/page.tsx`):
   - Checks for `auth_callback` param
   - Reads preview URL from localStorage
   - Redirects back to preview if needed

## Benefits

- ✅ No Google Console changes needed
- ✅ Works with any preview deployment URL
- ✅ Users stay on preview deployment throughout
- ✅ Falls back gracefully if localStorage unavailable
- ✅ Production auth flow unchanged

## Troubleshooting

### Auth redirects to production instead of preview?

- Check browser console for preview detection logs
- Verify localStorage has `preview_redirect_url` set
- Check that preview URL detection logic is working

### Auth doesn't work on preview?

- Verify Google Console has production URL configured
- Check Supabase redirect URLs include production callback
- Ensure `NEXT_PUBLIC_SITE_URL` is set correctly in Vercel

### Multiple redirects?

- Check that `auth_callback` param is being cleaned up
- Verify localStorage is cleared after successful redirect

