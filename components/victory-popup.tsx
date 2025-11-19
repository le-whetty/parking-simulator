"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useSound } from "@/hooks/use-sound"

interface VictoryPopupProps {
  onRestart: () => void
  isOpen: boolean
}

export default function VictoryPopup({ onRestart, isOpen }: VictoryPopupProps) {
  const anthemSound = useSound("/music/anthem.mp3")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!isOpen) return

    // Try to play sound when popup opens
    anthemSound.play()

    // Animate the flag
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Create a simple flag animation without relying on external images
    let frame = 0

    const animate = () => {
      frame++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw US flag background (blue rectangle)
      ctx.fillStyle = "#002868"
      ctx.fillRect(0, 0, canvas.width * 0.4, canvas.height * 0.5)

      // Draw stars
      ctx.fillStyle = "white"
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 6; j++) {
          ctx.beginPath()
          const x = (canvas.width * 0.4 * (j + 0.5)) / 6
          const y = (canvas.height * 0.5 * (i + 0.5)) / 5
          const size = 5
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Draw stripes
      const stripeHeight = canvas.height / 13
      for (let i = 0; i < 13; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#BF0A30" : "white"

        // Create wave effect
        for (let x = 0; x < canvas.width; x++) {
          const xOffset = Math.sin(frame / 20 + x / 30) * 5
          const y = i * stripeHeight + xOffset

          ctx.fillRect(i < 7 ? canvas.width * 0.4 : 0, y, i < 7 ? canvas.width * 0.6 : canvas.width, stripeHeight)
        }
      }

      // Draw Luke with opacity
      ctx.fillStyle = "rgba(255, 0, 0, 0.2)"
      ctx.fillRect(canvas.width / 2 - 50, canvas.height / 2 - 50, 100, 100)

      // Draw Luke's name
      ctx.fillStyle = "white"
      ctx.font = "20px Arial"
      ctx.textAlign = "center"
      ctx.fillText("LUKE", canvas.width / 2, canvas.height / 2 + 80)

      requestAnimationFrame(animate)
    }

    const animationId = requestAnimationFrame(animate)

    return () => {
      anthemSound.stop()
      cancelAnimationFrame(animationId)
    }
  }, [isOpen, anthemSound])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/70">
      <div className="bg-gray-900 rounded-lg shadow-lg p-8 max-w-2xl w-full mx-4 animate-fadeIn">
        <div className="flex flex-col items-center justify-center gap-8 text-center">
          <h1 className="text-4xl font-bold text-green-500">VICTORY!</h1>

          <div className="relative w-full h-[300px]">
            <canvas ref={canvasRef} width={500} height={300} className="w-full h-full" />
          </div>

          <div className="space-y-4">
            <p className="text-2xl font-bold">Luke has secured the alpha parking spot!</p>

            <p>
              Another day, another victory in the dog-eat-dog world of office parking. The vulnerable and impaired
              colleagues have been defeated, and Luke's dominance is unchallenged.
            </p>

            <p className="text-lg font-semibold text-yellow-400">
              "It's not about the parking, it's about sending a message." - Luke Amundson
            </p>
          </div>

          <Button size="lg" onClick={onRestart} className="bg-blue-600 hover:bg-blue-700">
            Play Again
          </Button>
        </div>
      </div>
    </div>
  )
}
