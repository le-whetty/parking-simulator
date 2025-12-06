// Vehicle types and stats definitions

export type VehicleType = 'corolla' | 'sedona' | 'impala' | 'caravan' | 'swift'

export interface Vehicle {
  id: VehicleType
  name: string
  nickname: string
  pace: number // Speed stat (1-10)
  armor: number // Damage resistance stat (1-10)
  impact: number // Damage dealt stat (1-10)
  description: string
  image: string
  isDLC?: boolean // Whether this vehicle requires DLC
  dlcCode?: string // DLC code required to unlock
}

export const vehicles: Vehicle[] = [
  {
    id: 'corolla',
    name: '1998 Toyota Corolla',
    nickname: '',
    pace: 9,
    armor: 4,
    impact: 7,
    description: 'Reliable compact sedan with responsive handling. Good acceleration for its class. Light body makes it easy to navigate. Minimal sound insulation. Basic safety features.',
    image: '/images/98-toyota-corolla.png',
  },
  {
    id: 'sedona',
    name: '2007 Kia Sedona',
    nickname: '',
    pace: 4,
    armor: 9,
    impact: 7,
    description: 'Spacious minivan with sturdy construction. Comfortable ride quality. Heavy frame provides stability. Slower acceleration due to weight. Excellent crash test ratings.',
    image: '/images/07-kia-sedona.png',
  },
  {
    id: 'impala',
    name: '2004 Chevrolet Impala',
    nickname: '',
    pace: 7,
    armor: 4,
    impact: 9,
    description: 'Full-size sedan with decent power. Solid build quality. Confident road presence. Moderately quick off the line. Average fuel economy for the segment.',
    image: '/images/04-chevy-impala.png',
  },
  {
    id: 'caravan',
    name: '1999 Dodge Caravan',
    nickname: '',
    pace: 4,
    armor: 7,
    impact: 9,
    description: 'Luke\'s high school car. A reliable minivan with surprising performance. Well-maintained and battle-tested. Excellent all-around stats make it a versatile choice for any parking challenge.',
    image: '/images/99-dodge-caravan.png',
    isDLC: true,
    dlcCode: 'DLC_VEHICLES',
  },
  {
    id: 'swift',
    name: '2011 Suzuki Swift',
    nickname: '',
    pace: 10,
    armor: 3,
    impact: 5,
    description: 'Lightweight compact car with exceptional speed. Quick acceleration and nimble handling. Lightweight frame means less protection but maximum agility. Perfect for hit-and-run tactics.',
    image: '/images/11-suzuki-swift.png',
    isDLC: true,
    dlcCode: 'DLC_VEHICLES',
  },
]

// Calculate stat multipliers based on stat value (1-10 scale)
export function getPaceMultiplier(pace: number): number {
  // 9/10 = 1.3x, 7/10 = 1.1x, 4/10 = 0.8x
  // Linear interpolation: base speed at 5/10 = 1.0x
  // Formula: multiplier = 0.5 + (pace / 10) * 0.8
  return 0.5 + (pace / 10) * 0.8
}

export function getArmorMultiplier(armor: number): number {
  // 9/10 = 0.5x damage (takes half damage), 7/10 = 0.8x, 4/10 = 1.3x damage
  // Linear interpolation: base at 5/10 = 1.0x
  // Formula: multiplier = 1.5 - (armor / 10) * 1.0
  return 1.5 - (armor / 10) * 1.0
}

export function getImpactMultiplier(impact: number): number {
  // 9/10 = 1.5x damage, 7/10 = 1.1x, 4/10 = 0.7x
  // Linear interpolation: base at 5/10 = 1.0x
  // Formula: multiplier = 0.2 + (impact / 10) * 1.3
  return 0.2 + (impact / 10) * 1.3
}

