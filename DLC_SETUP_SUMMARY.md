# DLC Unlock System - Setup Summary

## Quick Start

### 1. Run Database Migration

Execute the SQL migration file in Supabase:
```
supabase/migrations/create_dlc_system.sql
```

This creates:
- `dlc_items` table (stores available DLCs)
- `dlc_unlocks` table (tracks user unlocks)
- Helper functions and RLS policies
- Sample DLC items (DLC_001, DLC_002, DLC_003)

### 2. Configure n8n Workflow

Follow the step-by-step guide in `DLC_N8N_QUICK_REFERENCE.md`:

**Key Steps:**
1. Slack webhook receives message
2. Extract `dlc_code` and `username` from message
3. Query `usernames` table to get `user_email` from `username`
4. Insert into `dlc_unlocks` table
5. Handle duplicates with `ON CONFLICT DO NOTHING`

### 3. Test the System

Run the test queries in `scripts/test-dlc-unlock.sql` to verify:
- DLC items exist
- Username → email lookup works
- Insert succeeds
- Duplicate prevention works

## Database Schema Overview

```
dlc_items
├── id (UUID)
├── code (TEXT, UNIQUE) ← "DLC_001"
├── name (TEXT)
├── description (TEXT)
├── image_url (TEXT)
└── is_active (BOOLEAN)

dlc_unlocks
├── id (UUID)
├── user_email (TEXT) ← Links to usernames.user_email
├── dlc_code (TEXT) ← Links to dlc_items.code
├── unlocked_at (TIMESTAMPTZ)
├── unlocked_via (TEXT)
├── slack_user_id (TEXT)
└── slack_message_ts (TEXT)
└── UNIQUE(user_email, dlc_code) ← Prevents duplicates
```

## n8n Workflow Data Flow

```
Slack Message
  ↓
Extract: dlc_code, username
  ↓
Query: username → user_email
  ↓
Insert: dlc_unlocks (user_email, dlc_code, ...)
  ↓
Success / Error Handling
```

## Key Points

1. **Username → Email Mapping**: n8n receives `username`, but database uses `user_email`. You must query `usernames` table first.

2. **Duplicate Prevention**: Database has unique constraint. Use `ON CONFLICT DO NOTHING` in n8n to handle gracefully.

3. **RLS Policies**: Service role can insert unlocks. Users can only read their own unlocks.

4. **Testing**: Use `scripts/test-dlc-unlock.sql` to verify each step works.

## Files Created

- `supabase/migrations/create_dlc_system.sql` - Database schema
- `DLC_SYSTEM_GUIDE.md` - Complete integration guide
- `DLC_N8N_QUICK_REFERENCE.md` - n8n node configurations
- `scripts/test-dlc-unlock.sql` - Test queries

## Next Steps

1. ✅ Run migration in Supabase
2. ✅ Configure n8n workflow using quick reference
3. ✅ Test with manual SQL queries
4. ✅ Test n8n workflow with Slack message
5. ✅ Verify unlock appears in database
6. 🔄 Integrate DLC checking into game code

## Game Integration Example

```typescript
// Check if user has DLC unlocked
async function checkUserDLC(userEmail: string, dlcCode: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('dlc_unlocks')
    .select('id')
    .eq('user_email', userEmail)
    .eq('dlc_code', dlcCode)
    .maybeSingle();
  
  return !!data;
}

// Get all unlocked DLCs
async function getUserUnlockedDLCs(userEmail: string) {
  const { data, error } = await supabase
    .from('dlc_unlocks')
    .select(`
      dlc_code,
      unlocked_at,
      dlc_items (
        name,
        description,
        image_url
      )
    `)
    .eq('user_email', userEmail)
    .order('unlocked_at', { ascending: false });
  
  return data;
}
```

