# Parking Simulator 🚗🌭

A fun, competitive browser game where players help Luke Amundson secure the coveted priority parking spot by defeating other drivers with hot dogs!

## 🎮 About

**Parking Simulator** is an action-packed game where you play as Luke, Head of Sales ANZ at Tracksuit, in his daily battle for the priority parking space. Navigate through obstacles, defeat competing drivers (pregnant moms and injured colleagues), and secure your spot before your 8:30 AM meeting!

## ✨ Features

- **Authentic Gameplay**: Drive with WASD keys, throw hot dogs with SPACE
- **Competitive Leaderboard**: Compete for top scores and win merch prizes
- **User Profiles**: Set custom usernames and see your rank
- **Victory Screen**: Celebrate wins with fireworks, music, and confetti
- **Analytics**: Comprehensive Mixpanel tracking for game events
- **Responsive Design**: Works across different screen sizes

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (React 19)
- **Database & Auth**: Supabase
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Analytics**: Mixpanel
- **Deployment**: Vercel
- **Audio**: Custom audio manager with sound effects and background music

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- A Supabase account
- A Mixpanel account (optional, for analytics)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/le-whetty/parking-simulator.git
   cd parking-simulator
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_SKIP_AUTH=false  # Set to "true" to skip auth in development
   ```

   **Environments:**
   - **Dev** (`localhost`): `NEXT_PUBLIC_SKIP_AUTH=true` - Skip auth, use production DB (read-only)
   - **UAT** (`uat` branch): `NEXT_PUBLIC_SKIP_AUTH=false` - Full auth, use production DB (read/write)
   - **Production** (`main` branch): `NEXT_PUBLIC_SKIP_AUTH=false` - Full auth, production DB
   
   See `UAT_SETUP.md` for UAT environment configuration.

4. **Set up Supabase Database**
   
   You'll need to create the following tables in your Supabase database:
   
   - **`scores`**: Stores game scores
     - `user_email` (text)
     - `username` (text, nullable)
     - `score` (integer)
     - `created_at` (timestamp)
   
   - **`usernames`**: Stores user profiles
     - `user_email` (text, primary key)
     - `username` (text, unique)
     - `avatar_url` (text, nullable)
     - `display_name` (text, nullable)
     - `created_at` (timestamp)
     - `updated_at` (timestamp)
   
   - **`auth.users`**: Managed by Supabase Auth (automatic)

5. **Configure Supabase Auth**
   
   - Enable Google OAuth provider in Supabase Dashboard
   - Add your redirect URL: `http://localhost:3000/auth/callback` (for local dev)
   - Set up webhook for sign-up tracking (optional): `https://your-domain.com/api/webhooks/supabase-auth`

6. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 How to Play

1. **Sign in** with your Google account
2. **Set your username** (first time only)
3. **Read the instructions** on the start screen
4. **Start the game** and:
   - Use **WASD** keys to drive Luke's car
   - Press **SPACE** to throw hot dogs at competing drivers
   - Avoid enemy projectiles (bottles, crutches)
   - Defeat all drivers AND park in the green spot for 3 seconds to win
   - Don't let your health reach zero!

## 📊 Analytics

The game tracks various events via Mixpanel:
- Game Started
- Hot Dog Fired
- Driver Defeated
- Victory/Defeat (with time spent)
- Leaderboard Viewed
- Increase Murca button presses
- Song listening time on victory screen
- Sign Up / Sign In events

## 🗂️ Project Structure

```
parking-simulator/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── leaderboard/   # Leaderboard endpoint
│   │   ├── save-score/    # Score saving endpoint
│   │   └── webhooks/      # Supabase webhook handler
│   ├── auth/              # Auth callback route
│   └── page.tsx           # Main game page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── victory-screen.tsx # Victory screen
│   ├── defeat-screen.tsx  # Defeat screen
│   ├── leaderboard.tsx    # Leaderboard component
│   └── ...
├── lib/                  # Utility libraries
│   ├── supabase.ts       # Supabase client
│   └── mixpanel.ts       # Mixpanel initialization
├── public/               # Static assets
│   ├── images/           # Game images
│   └── music/            # Audio files
└── hooks/                # Custom React hooks
```

## 🚢 Deployment

The project is configured for deployment on Vercel:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

The project includes:
- `vercel.json` for build configuration
- Automatic deployments on push to `master` branch

## 🎨 Customization

- **Game difficulty**: Adjust in `app/page.tsx` (attack frequencies, speeds, etc.)
- **Drivers**: Add/modify drivers in the `drivers` array in `app/page.tsx`
- **Music**: Add songs to `public/music/murca/` for victory screen playlist
- **Styling**: Modify Tailwind classes throughout components

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |
| `NEXT_PUBLIC_SKIP_AUTH` | Skip authentication in dev mode | No |

## 🤝 Contributing

This is a private project, but feel free to fork and create your own version!

## 📄 License

Private project - All rights reserved

## 🙏 Acknowledgments

- Built for Tracksuit team
- Inspired by real parking lot battles
- Special thanks to Luke Amundson for the inspiration

---

**Made with 🌭 and determination**

