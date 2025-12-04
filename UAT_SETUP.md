# UAT Environment Setup Guide

This guide explains how to set up and use the UAT (User Acceptance Testing) environment for Parking Simulator.

## Overview

The UAT environment is a separate deployment that:
- ✅ Has **authentication enabled** (unlike dev mode)
- ✅ Uses the **production Supabase database** (read/write access)
- ✅ Deploys to a separate URL (e.g., `parking-simulator-uat.vercel.app`)
- ✅ Allows testing with real user accounts and data

## Vercel Setup

### 1. Create UAT Environment in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Git**
3. Under **Production Branch**, ensure `main` or `master` is set
4. Under **Preview Branches**, add `uat` to automatically deploy

### 2. Configure Environment Variables

In Vercel dashboard, go to **Settings** → **Environment Variables**:

#### For UAT Environment:
- Select **Environment**: `Preview` (or create a custom `UAT` environment)
- Add/Update these variables:

```
NEXT_PUBLIC_SUPABASE_URL=<production_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production_supabase_anon_key>
NEXT_PUBLIC_SKIP_AUTH=false
```

**Important**: Use the **same Supabase credentials as production** so UAT uses the production database.

### 3. Deploy UAT Branch

```bash
# Create and push the uat branch
git checkout -b uat
git push origin uat
```

Vercel will automatically deploy the `uat` branch to a preview URL.

### 4. Assign Custom Domain (Optional)

If you want a dedicated UAT URL:
1. Go to **Settings** → **Domains**
2. Add a custom domain like `parking-simulator-uat.vercel.app`
3. Assign it to the `uat` branch

## Usage

### Testing in UAT

1. **Access the UAT URL** (provided by Vercel after deployment)
2. **Login with real credentials** (auth is enabled)
3. **Test all features** - changes will affect production database
4. **Verify DLC unlocks** - test the full DLC unlock flow
5. **Test achievements** - verify achievement system works
6. **Test leaderboards** - see real production leaderboard data

### Important Notes

⚠️ **UAT writes to production database** - be careful when testing destructive operations

✅ **Safe to test**:
- Playing games
- Saving scores
- Unlocking DLCs
- Earning achievements
- Viewing profiles

⚠️ **Be cautious with**:
- Mass data operations
- Testing edge cases that might create bad data
- Performance testing (affects production DB)

## Environment Comparison

| Environment | Auth | Database | URL | Use Case |
|------------|------|----------|-----|----------|
| **Dev** | ❌ Disabled | Production (read-only) | `localhost:3000` | Local development |
| **UAT** | ✅ Enabled | Production (read/write) | `parking-simulator-uat.vercel.app` | Testing with real auth & data |
| **Production** | ✅ Enabled | Production (read/write) | `parking-simulator.vercel.app` | Live app |

## Troubleshooting

### UAT not deploying?
- Check Vercel project settings → Git → Preview Branches includes `uat`
- Verify branch is pushed to GitHub
- Check Vercel deployment logs

### Auth not working in UAT?
- Verify `NEXT_PUBLIC_SKIP_AUTH=false` in Vercel environment variables
- Check Supabase URL and keys are correct
- Ensure Supabase project allows the UAT domain in auth settings

### Can't access production data?
- Verify Supabase credentials match production
- Check RLS policies allow your user
- Ensure you're logged in with a valid account

## Updating UAT

To deploy changes to UAT:

```bash
git checkout uat
git merge dev  # or merge from main
git push origin uat
```

Vercel will automatically redeploy.

