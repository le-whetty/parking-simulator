import { NextResponse } from "next/server"
import { readdir } from "fs/promises"
import { join } from "path"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Path to the murca music folder in the public directory
    const murcaPath = join(process.cwd(), "public", "music", "murca")
    
    // Read all files in the directory
    const files = await readdir(murcaPath)
    
    // Filter to only .mp3 files
    const mp3Files = files
      .filter(file => file.toLowerCase().endsWith(".mp3"))
      .map(file => `/music/murca/${file}`)
    
    return NextResponse.json({ songs: mp3Files })
  } catch (error) {
    console.error("Error reading murca songs:", error)
    // Return empty array if folder doesn't exist or error occurs
    return NextResponse.json({ songs: [] })
  }
}

