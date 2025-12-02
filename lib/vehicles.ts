// Vehicle types and stats definitions

export type VehicleType = 'corolla' | 'sedona' | 'impala'

export interface Vehicle {
  id: VehicleType
  name: string
  nickname: string
  pace: number // Speed stat (1-10)
  armor: number // Damage resistance stat (1-10)
  impact: number // Damage dealt stat (1-10)
  description: string
  image: string
}

export const vehicles: Vehicle[] = [
  {
    id: 'corolla',
    name: '1998 Toyota Corolla',
    nickname: 'Speed Runner',
    pace: 9,
    armor: 4,
    impact: 7,
    description: 'The nimble legend. Zippy, lightweight, and ready to dart through tight spaces. Just don\'t hit anything.',
    image: '/images/98-toyota-corolla.png',
  },
  {
    id: 'sedona',
    name: '2007 Kia Sedona',
    nickname: 'Tank',
    pace: 4,
    armor: 9,
    impact: 7,
    description: 'The family fortress. Built to survive anything the parking garage throws at you. Slow and steady wins the race.',
    image: '/images/07-kia-sedona.png',
  },
  {
    id: 'impala',
    name: '2004 Chevrolet Impala',
    nickname: 'Brawler',
    pace: 7,
    armor: 4,
    impact: 9,
    description: 'The rental car destroyer. Maximum impact, moderate speed, questionable durability. Go out in a blaze of glory.',
    image: '/images/04-chevvy-impala.png',
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

