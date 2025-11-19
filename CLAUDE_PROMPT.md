# Lottie Animation Issue - Debugging Request

## Problem Description

I have a React/Next.js game where Lottie explosion animations are not playing correctly during gameplay. The animations appear as static/flickering circles and don't play through their full animation sequence. However, **when the victory condition is met and the game ends, all the explosion animations suddenly play perfectly**.

## Key Observations

1. **During gameplay**: When a driver is defeated (health reaches 0), an explosion component is rendered at their position. The explosion appears as a static/flickering circle - it's visible but not animating.

2. **The explosions persist**: They don't disappear and remain on screen as static circles throughout the game.

3. **Victory moment**: When the player wins (all drivers defeated + parked in spot for 3 seconds), at the exact moment `setHasWon(true)` is called, ALL the explosion animations suddenly play perfectly through their full sequence, then the game transitions to the victory screen.

4. **What this suggests**: Something about the victory state change (likely a React re-render) allows the Lottie animations to properly initialize and play.

## Technical Context

- **Framework**: Next.js with React
- **Lottie Library**: `lottie-react`
- **Animation Format**: `.lottie` files (ZIP archives containing JSON animation data)
- **Game Loop**: Uses `requestAnimationFrame` for the game loop
- **State Management**: React hooks (`useState`, `useRef`)

## Relevant Files

1. **`components/explosion.tsx`** - The explosion component that renders the Lottie animation
2. **`app/page.tsx`** - Main game component where explosions are rendered and victory is triggered
   - Look for where `explodingDrivers` state is managed
   - Look for where `setHasWon(true)` is called (around line 865)
   - Look for where explosions are rendered (around line 1668)

## What We've Tried

1. Added `useLayoutEffect` to wait for DOM readiness
2. Added multiple play attempts with delays (0ms, 50ms, 100ms, 200ms)
3. Added `onLoad` callback to force play when animation loads
4. Added conditional rendering with `isReady` state
5. Used double `requestAnimationFrame` to ensure DOM is ready
6. Added a 2-second timeout fallback to remove explosions

None of these approaches have worked. The animations still only play when victory is triggered.

## Questions to Investigate

1. **Why do the animations only work when `setHasWon(true)` is called?** What React rendering behavior changes at that moment?

2. **Is the game loop's `requestAnimationFrame` interfering with Lottie's internal `requestAnimationFrame`?** Could there be a conflict?

3. **Are React re-renders during the game loop preventing Lottie from properly initializing?** The game loop updates state frequently (drivers moving, projectiles, etc.).

4. **Is there a way to force Lottie to initialize and play immediately when the component mounts, regardless of React's render cycle?**

5. **Should we use a different approach entirely?** Perhaps:
   - Pre-load all explosion animations
   - Use a ref-based approach instead of conditional rendering
   - Render explosions outside the main game component tree
   - Use a different animation library

## Current Implementation Details

The explosion component:
- Loads the `.lottie` file asynchronously
- Extracts JSON from the ZIP archive
- Sets `animationData` state
- Waits for DOM readiness with `useLayoutEffect`
- Only renders Lottie when `isReady` is true
- Attempts to play multiple times with delays

The explosions are rendered in the main game component like this:
```tsx
{Array.from(explodingDrivers).map((driverId) => {
  const driver = drivers.find((d) => d.id === driverId)
  return (
    <Explosion
      key={`explosion-${driverId}-${driver.position.x}-${driver.position.y}`}
      position={driver.position}
      onComplete={() => {
        setExplodingDrivers((prev) => {
          const newSet = new Set(prev)
          newSet.delete(driverId)
          return newSet
        })
      }}
    />
  )
})}
```

## Request

Please analyze the codebase and provide:
1. **Root cause analysis**: Why aren't the Lottie animations playing during gameplay?
2. **Why victory works**: What specifically about the victory state change allows them to play?
3. **Solution**: A concrete fix that will make the animations play immediately when drivers are defeated, without waiting for victory.

Please examine:
- The explosion component implementation
- How it's rendered in the game component
- The game loop and state update patterns
- Any potential conflicts between React rendering and Lottie initialization
- The victory state change and what it triggers

Thank you for your help!

