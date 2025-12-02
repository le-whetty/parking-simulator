"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { vehicles, Vehicle, VehicleType } from "@/lib/vehicles"
import Menu from "./menu"

interface VehicleSelectionProps {
  onVehicleSelected: (vehicle: Vehicle) => void
  onLogout?: () => void
  onEditUsername?: () => void
  onVictorySimulator?: () => void
  username?: string | null
}

export default function VehicleSelection({ 
  onVehicleSelected, 
  onLogout, 
  onEditUsername, 
  onVictorySimulator,
  username 
}: VehicleSelectionProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null)

  const handleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle.id)
  }

  const handleStart = () => {
    if (selectedVehicle) {
      const vehicle = vehicles.find(v => v.id === selectedVehicle)
      if (vehicle) {
        onVehicleSelected(vehicle)
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-6xl mx-auto pt-24">
      <Menu onLogout={onLogout} onEditUsername={onEditUsername} onVictorySimulator={onVictorySimulator} />

      {/* Username Greeting */}
      {username && (
        <div className="w-full mb-6 text-center">
          <p className="text-2xl font-bold font-chapeau text-tracksuit-purple-800">
            Hey, @{username} 👋
          </p>
        </div>
      )}

      {/* Title */}
      <div className="w-full mb-8 text-center">
        <h1 className="text-4xl font-bold font-chapeau mb-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-tracksuit-purple-600 to-tracksuit-purple-700">
            Choose Your Ride
          </span>
          <span className="ml-2">🚗</span>
        </h1>
        <p className="text-tracksuit-purple-700 font-quicksand">
          Select your vehicle and hit the road!
        </p>
      </div>

      {/* Vehicle Cards Grid */}
      <div className="grid md:grid-cols-3 gap-6 w-full mb-8">
        {vehicles.map((vehicle) => {
          const isSelected = selectedVehicle === vehicle.id
          return (
            <div
              key={vehicle.id}
              onClick={() => handleSelect(vehicle)}
              className={`bg-white/80 backdrop-blur-sm rounded-xl border-2 shadow-lg cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-tracksuit-purple-500 shadow-xl scale-105'
                  : 'border-tracksuit-purple-200/50 hover:border-tracksuit-purple-300 hover:shadow-xl'
              }`}
            >
              <div className="p-6 flex flex-col items-center space-y-4">
                {/* Vehicle Image */}
                <div className="relative w-full h-32 flex items-center justify-center">
                  <img
                    src={vehicle.image}
                    alt={vehicle.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                {/* Vehicle Name */}
                <div className="text-center">
                  <h3 className="text-lg font-bold font-chapeau text-tracksuit-purple-800">
                    {vehicle.name}
                  </h3>
                  <p className="text-sm font-semibold font-chapeau text-tracksuit-purple-600 italic">
                    "{vehicle.nickname}"
                  </p>
                </div>

                {/* Stats */}
                <div className="w-full space-y-2">
                  {/* Pace */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-tracksuit-purple-700">Pace</span>
                      <span className="text-xs text-tracksuit-purple-600">{vehicle.pace}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${(vehicle.pace / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Armor */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-tracksuit-purple-700">Armor</span>
                      <span className="text-xs text-tracksuit-purple-600">{vehicle.armor}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${(vehicle.armor / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Impact */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-tracksuit-purple-700">Impact</span>
                      <span className="text-xs text-tracksuit-purple-600">{vehicle.impact}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all"
                        style={{ width: `${(vehicle.impact / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-tracksuit-purple-700 font-quicksand text-center leading-relaxed">
                  {vehicle.description}
                </p>

                {/* Select Button */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelect(vehicle)
                  }}
                  className={`w-full ${
                    isSelected
                      ? 'bg-tracksuit-purple-600 hover:bg-tracksuit-purple-700 text-white'
                      : 'bg-tracksuit-purple-200 hover:bg-tracksuit-purple-300 text-tracksuit-purple-800'
                  } font-chapeau`}
                >
                  {isSelected ? '✓ Selected' : 'Select'}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Start Game Button */}
      <div className="w-full flex justify-center">
        <Button
          size="lg"
          onClick={handleStart}
          disabled={!selectedVehicle}
          className="font-chapeau shadow-lg px-8"
          style={{ 
            backgroundColor: selectedVehicle ? '#8f80cc' : '#cccccc', 
            color: selectedVehicle ? '#f8f3ff' : '#666666',
            cursor: selectedVehicle ? 'pointer' : 'not-allowed'
          }}
          onMouseEnter={(e) => {
            if (selectedVehicle) {
              e.currentTarget.style.backgroundColor = '#7f70bc'
            }
          }}
          onMouseLeave={(e) => {
            if (selectedVehicle) {
              e.currentTarget.style.backgroundColor = '#8f80cc'
            }
          }}
        >
          🎮 Start Game
        </Button>
      </div>
    </div>
  )
}

