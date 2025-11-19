"use client"

import { useEffect, useRef, useState, useLayoutEffect } from "react"
import Lottie from "lottie-react"

interface ExplosionProps {
  position: { x: number; y: number }
  onComplete: () => void
}

export function Explosion({ position, onComplete }: ExplosionProps) {
  const [animationData, setAnimationData] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)
  const lottieRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    console.log("💥 Explosion component mounted at position:", position)
    
    // Try to load the .lottie file
    fetch("/lotties/explosion.lottie")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load: ${res.status}`)
        }
        return res.arrayBuffer()
      })
      .then((buffer) => {
        // Check if it's a ZIP file (starts with PK)
        const view = new Uint8Array(buffer)
        if (view[0] === 0x50 && view[1] === 0x4B) {
          // It's a ZIP file - extract it
          import('jszip').then((JSZip) => {
            JSZip.default.loadAsync(buffer).then((zip) => {
              // List all files in the ZIP to find the JSON
              const fileNames = Object.keys(zip.files)
              console.log("Files in Lottie ZIP:", fileNames)
              
              // Try common Lottie file names - the actual file is in animations/12345.json
              let jsonFile: any = zip.file('animations/12345.json') || 
                                  zip.file('data.json') || 
                                  zip.file('animation.json')
              
              // If still no file, try any JSON file (excluding manifest)
              if (!jsonFile) {
                const jsonFiles = fileNames.filter(name => name.endsWith('.json') && name !== 'manifest.json')
                if (jsonFiles.length > 0) {
                  jsonFile = zip.file(jsonFiles[0])
                }
              }
              
              if (jsonFile && typeof jsonFile.async === 'function') {
                return jsonFile.async('string').then((jsonString: string) => {
                  try {
                    const jsonData = JSON.parse(jsonString)
                    console.log("✅ Successfully extracted Lottie JSON from ZIP")
                    setAnimationData(jsonData)
                  } catch (e) {
                    console.error("Error parsing JSON:", e)
                    setTimeout(onComplete, 500)
                  }
                })
              } else {
                throw new Error(`No JSON file found in ZIP. Files: ${fileNames.join(', ')}`)
              }
            }).catch((err) => {
              console.error("Error extracting Lottie ZIP:", err)
              setTimeout(onComplete, 500)
            })
          }).catch((err) => {
            console.error("Error loading JSZip:", err)
            setTimeout(onComplete, 500)
          })
        } else {
          // It's not a ZIP, try parsing as JSON
          const text = new TextDecoder().decode(buffer)
          const jsonData = JSON.parse(text)
          console.log("Successfully loaded Lottie JSON")
          setAnimationData(jsonData)
        }
      })
      .catch((err) => {
        console.error("Error loading explosion animation:", err)
        setTimeout(onComplete, 1000)
      })
  }, [onComplete, position])

  // Wait for DOM to be ready, then mark as ready
  useLayoutEffect(() => {
    if (animationData && containerRef.current) {
      // Use requestAnimationFrame to ensure DOM is fully ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.log("💥 Explosion DOM ready, marking as ready to play")
          setIsReady(true)
        })
      })
    }
  }, [animationData])

  // Force play animation when ready
  useEffect(() => {
    if (isReady && lottieRef.current && animationData) {
      console.log("💥 Forcing Lottie animation to play")
      // Try multiple times to ensure it plays
      const playAttempts = [0, 50, 100, 200]
      playAttempts.forEach((delay) => {
        setTimeout(() => {
          if (lottieRef.current) {
            try {
              lottieRef.current.play()
              console.log(`💥 Play attempt at ${delay}ms`)
            } catch (e) {
              console.error(`Error playing at ${delay}ms:`, e)
            }
          }
        }, delay)
      })
    }
  }, [isReady, animationData])

  // Simple timeout - explosion disappears after 2 seconds
  useEffect(() => {
    if (animationData && isReady) {
      console.log("💥 Explosion started, will disappear in 2 seconds")
      const timeout = setTimeout(() => {
        console.log("💥 Explosion timeout - removing explosion")
        onComplete()
      }, 2000) // 2 seconds
      
      return () => {
        clearTimeout(timeout)
      }
    }
  }, [animationData, isReady, onComplete])

  if (!animationData) {
    return null
  }

  // Cars are 120px x 70px, so explosion should be 50% larger than the larger dimension
  // Making it 400px for a much more dramatic explosion (over 3x the car width)
  const explosionSize = 400
  const offset = explosionSize / 2 // Center the explosion on the car position

  if (!animationData) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="absolute z-50 pointer-events-none"
      style={{
        left: `${position.x - offset}px`, // Center the explosion on the car
        top: `${position.y - offset}px`,
        width: `${explosionSize}px`,
        height: `${explosionSize}px`,
      }}
    >
      {isReady && (
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={false}
          autoplay={true}
          rendererSettings={{
            preserveAspectRatio: 'xMidYMid slice',
          }}
          onComplete={() => {
            console.log("✅ Explosion animation completed - removing explosion")
            onComplete()
          }}
          onLoopComplete={() => {
            console.log("✅ Explosion loop completed - removing explosion")
            onComplete()
          }}
          onLoad={() => {
            console.log("✅ Explosion animation loaded and ready to play")
            // Force play immediately when loaded
            requestAnimationFrame(() => {
              if (lottieRef.current) {
                try {
                  lottieRef.current.play()
                  console.log("💥 Animation forced to play on load")
                } catch (e) {
                  console.error("Error forcing play on load:", e)
                }
              }
            })
          }}
          style={{ width: "100%", height: "100%" }}
        />
      )}
    </div>
  )
}

