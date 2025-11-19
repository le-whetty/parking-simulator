interface HealthBarProps {
  current: number
  max: number
}

export function HealthBar({ current, max }: HealthBarProps) {
  const percentage = (current / max) * 100

  return (
    <div className="w-[150px] h-[15px] bg-gray-700 rounded-full overflow-hidden font-quicksand">
      <div
        className="h-full rounded-full transition-all duration-300 ease-out"
        style={{
          width: `${percentage}%`,
          backgroundColor: percentage > 60 ? "green" : percentage > 30 ? "orange" : "red",
        }}
      />
    </div>
  )
}
