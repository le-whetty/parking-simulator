"use client"

import { useEffect, useRef } from "react"
import type React from "react"
import lottie from "lottie-web"

interface Explosion {
  id: string
  x: number
  y: number
}

interface ExplosionManagerProps {
  explosions: Explosion[]
  onExplosionComplete: (id: string) => void
  gameContainerRef?: React.RefObject<HTMLDivElement>
}

export function ExplosionManager({ explosions, onExplosionComplete, gameContainerRef }: ExplosionManagerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const animationDataRef = useRef<any>(null)
  const lottieInstancesRef = useRef<Map<string, any>>(new Map())
  const isLoadingRef = useRef(false)

  // Load animation data once on mount
  useEffect(() => {
    if (isLoadingRef.current || animationDataRef.current) return
    
    isLoadingRef.current = true
    console.log("💥 ExplosionManager: Loading animation data...")
    
    fetch("/lotties/explosion.lottie")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load: ${res.status}`)
        }
        return res.arrayBuffer()
      })
      .then((buffer) => {
        const view = new Uint8Array(buffer)
        if (view[0] === 0x50 && view[1] === 0x4B) {
          // It's a ZIP file - extract it
          import('jszip').then((JSZip) => {
            JSZip.default.loadAsync(buffer).then((zip) => {
              const fileNames = Object.keys(zip.files)
              console.log("💥 ExplosionManager: Files in Lottie ZIP:", fileNames)
              
              let jsonFile: any = zip.file('animations/12345.json') || 
                                  zip.file('data.json') || 
                                  zip.file('animation.json')
              
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
                    console.log("✅ ExplosionManager: Successfully extracted Lottie JSON from ZIP")
                    animationDataRef.current = jsonData
                  } catch (e) {
                    console.error("❌ ExplosionManager: Error parsing JSON:", e)
                  }
                })
              } else {
                throw new Error(`No JSON file found in ZIP. Files: ${fileNames.join(', ')}`)
              }
            }).catch((err) => {
              console.error("❌ ExplosionManager: Error extracting Lottie ZIP:", err)
            })
          }).catch((err) => {
            console.error("❌ ExplosionManager: Error loading JSZip:", err)
          })
        } else {
          // It's not a ZIP, try parsing as JSON
          const text = new TextDecoder().decode(buffer)
          const jsonData = JSON.parse(text)
          console.log("✅ ExplosionManager: Successfully loaded Lottie JSON")
          animationDataRef.current = jsonData
        }
      })
      .catch((err) => {
        console.error("❌ ExplosionManager: Error loading explosion animation:", err)
      })
  }, [])

  // Create portal container inside game container (so coordinates are relative to game container)
  useEffect(() => {
    if (containerRef.current) return
    
    // Wait for game container to be available
    if (!gameContainerRef?.current) {
      console.warn("⚠️ ExplosionManager: gameContainerRef not available yet")
      return
    }

    const container = document.createElement("div")
    container.id = "explosion-portal-container"
    container.style.position = "absolute" // Absolute relative to game container
    container.style.top = "0"
    container.style.left = "0"
    container.style.width = "100%"
    container.style.height = "100%"
    container.style.pointerEvents = "none"
    container.style.zIndex = "50"
    
    // Append to game container instead of document.body
    gameContainerRef.current.appendChild(container)
    containerRef.current = container

    return () => {
      // Cleanup: destroy all Lottie instances
      lottieInstancesRef.current.forEach((instance) => {
        try {
          instance.destroy()
        } catch (e) {
          console.error("Error destroying Lottie instance:", e)
        }
      })
      lottieInstancesRef.current.clear()
      
      // Remove container from game container
      if (containerRef.current && gameContainerRef?.current) {
        gameContainerRef.current.removeChild(containerRef.current)
        containerRef.current = null
      }
    }
  }, [gameContainerRef])

  // Handle explosions array changes
  useEffect(() => {
    if (!containerRef.current || !animationDataRef.current) return

    const container = containerRef.current
    const instances = lottieInstancesRef.current

    // Create explosions for new entries
    explosions.forEach((explosion) => {
      // Skip if already exists
      if (instances.has(explosion.id)) return

      // Use the coordinates that were captured when the driver was defeated
      // (They were already calculated relative to game container at that time)
      const actualX = explosion.x
      const actualY = explosion.y
      
      console.log(`💥 ExplosionManager: Using captured coords for ${explosion.id}: (${actualX}, ${actualY})`)

      // Create container div
      const explosionSize = 400
      const offset = explosionSize / 2
      const explosionDiv = document.createElement("div")
      explosionDiv.id = `explosion-${explosion.id}`
      explosionDiv.style.position = "absolute"
      explosionDiv.style.left = `${actualX - offset}px`
      explosionDiv.style.top = `${actualY - offset}px`
      explosionDiv.style.width = `${explosionSize}px`
      explosionDiv.style.height = `${explosionSize}px`
      explosionDiv.style.pointerEvents = "none"
      explosionDiv.style.zIndex = "50"
      
      console.log(`💥 ExplosionManager: Setting explosion div position: left=${actualX - offset}px, top=${actualY - offset}px`)

      container.appendChild(explosionDiv)

      // Create Lottie instance
      try {
        const lottieInstance = lottie.loadAnimation({
          container: explosionDiv,
          renderer: "svg",
          loop: false,
          autoplay: true,
          animationData: animationDataRef.current,
          rendererSettings: {
            preserveAspectRatio: "xMidYMid slice",
          },
        })

        // Handle completion
        lottieInstance.addEventListener("complete", () => {
          console.log(`✅ ExplosionManager: Explosion ${explosion.id} completed`)
          onExplosionComplete(explosion.id)
        })

        // Store instance
        instances.set(explosion.id, lottieInstance)

        // Fallback timeout (2 seconds)
        setTimeout(() => {
          if (instances.has(explosion.id)) {
            console.log(`⏰ ExplosionManager: Fallback timeout for ${explosion.id}`)
            onExplosionComplete(explosion.id)
          }
        }, 2000)
      } catch (error) {
        console.error(`❌ ExplosionManager: Error creating Lottie instance for ${explosion.id}:`, error)
        // Clean up div if Lottie fails
        container.removeChild(explosionDiv)
      }
    })

    // Remove explosions that are no longer in the array
    instances.forEach((instance, id) => {
      if (!explosions.find((e) => e.id === id)) {
        console.log(`🗑️ ExplosionManager: Removing explosion ${id}`)
        try {
          instance.destroy()
          const div = container.querySelector(`#explosion-${id}`)
          if (div) {
            container.removeChild(div)
          }
        } catch (e) {
          console.error(`Error removing explosion ${id}:`, e)
        }
        instances.delete(id)
      }
    })
  }, [explosions, onExplosionComplete])

  // This component doesn't render anything through React
  return null
}

