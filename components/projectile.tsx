"use client"

import type { ProjectileType } from "./game-context"

interface ProjectileProps {
  type: ProjectileType
  position: { x: number; y: number }
}

export function Projectile({ type, position }: ProjectileProps) {
  return (
    <div
      className="absolute transition-all duration-50 ease-linear font-quicksand"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 20,
        transform: type === "hotdog" ? "rotate(12deg)" : type === "crutch" ? "rotate(45deg)" : "none",
      }}
    >
      {type === "hotdog" && <img src="/images/hot-dog.png" alt="Hot Dog" className="w-16 h-auto" />}

      {type === "bottle" && <img src="/images/bottle.png" alt="Baby Bottle" className="w-10 h-auto" />}

      {type === "crutch" && <img src="/images/crutches.png" alt="Crutches" className="w-12 h-auto" />}
    </div>
  )
}
