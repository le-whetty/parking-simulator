"use client"

interface CarProps {
  position: { x: number; y: number }
  color: string
  width: number
  height: number
  driver: {
    name: string
    image: string
  }
  carImage?: string // Add optional carImage prop
}

export function Car({ position, color, width, height, driver, carImage }: CarProps) {
  return (
    <div
      className="absolute transition-all duration-100 ease-linear font-quicksand"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${width}px`,
        height: `${height}px`,
        zIndex: 30,
      }}
    >
      {/* Car body - use image if provided, otherwise use colored div */}
      {carImage ? (
        <img src={carImage || "/placeholder.svg"} alt="Car" className="absolute inset-0 w-full h-full object-contain" />
      ) : (
        <div className="absolute inset-0 rounded-md shadow-lg" style={{ backgroundColor: color }}>
          {/* Windows */}
          <div className="absolute top-[10px] left-[30px] right-[10px] h-[20px] bg-blue-200 rounded-sm" />

          {/* Wheels */}
          <div className="absolute bottom-[-5px] left-[10px] w-[20px] h-[10px] bg-black rounded-full" />
          <div className="absolute bottom-[-5px] right-[10px] w-[20px] h-[10px] bg-black rounded-full" />
          <div className="absolute bottom-[-5px] left-[30px] w-[20px] h-[10px] bg-black rounded-full" />
          <div className="absolute bottom-[-5px] right-[30px] w-[20px] h-[10px] bg-black rounded-full" />
        </div>
      )}

      {/* Driver */}
      <div className="absolute top-[-40px] left-[10px] w-[40px] h-[40px] rounded-full overflow-hidden border-2 border-white bg-white">
        <img
          src={driver.image || "/placeholder.svg?height=40&width=40"}
          alt={driver.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Driver name */}
      <div className="absolute top-[-60px] left-[10px] text-xs font-bold bg-black/70 px-2 py-1 rounded text-white">
        {driver.name}
      </div>
    </div>
  )
}
