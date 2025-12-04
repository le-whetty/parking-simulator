# DLC & Profile System - Implementation Plan

## Status: In Progress (Dev Branch)

### ✅ Completed
- DLC database schema and migrations
- DLC utilities (`lib/dlc.ts`)
- User stats API (`app/api/user-stats/route.ts`)
- DLC vehicles added to vehicles list (Caravan, Swift)

### 🚧 In Progress
- Profile page component
- DLC checking integration

### 📋 Remaining Tasks

#### Profile Page
- [ ] Create `components/profile-page.tsx`
- [ ] Display user stats (games played, victory %, etc.)
- [ ] Show achievements/badges
- [ ] Display title/progression system
- [ ] Add navigation to profile from menu

#### Achievements System
- [ ] Create achievements database table
- [ ] Track achievement progress in game events
- [ ] Award achievements on game completion
- [ ] Display achievements on profile

#### DLC Store
- [ ] Create `components/dlc-store.tsx`
- [ ] Display available DLC packs
- [ ] Copy-to-clipboard functionality
- [ ] Instructions for Spark Spend submission
- [ ] Add navigation to DLC store from menu

#### DLC Integration
- [ ] Filter DLC vehicles in vehicle selection
- [ ] Check DLC unlocks before showing vehicles
- [ ] License plate overlay on cars
- [ ] FM Radio DLC integration
- [ ] Car Horn DLC integration
- [ ] Stat boosts DLC integration
- [ ] Boss battle game mode

#### Title/Progression System
- [ ] Create progression points calculation
- [ ] Implement title levels (L1-L7)
- [ ] Display current title on profile
- [ ] Show progression to next level

## Implementation Order

1. **Profile Page** (Foundation)
2. **DLC Store** (User-facing feature)
3. **DLC Vehicle Filtering** (Quick win)
4. **Achievements System** (Core feature)
5. **Title/Progression** (Core feature)
6. **DLC Features** (Audio, Boosts, Accessories)
7. **Boss Battle** (Complex feature)

## Notes

- All DLC checking should use `hasDLCUnlocked()` from `lib/dlc.ts`
- User stats are available via `/api/user-stats?user_email=...`
- DLC unlocks are tracked in `dlc_unlocks` table
- Game events are tracked in `game_events` table for achievements

