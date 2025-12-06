// DLC Pack definitions - what items are included in each pack

export interface DLCPackItem {
  id: string
  name: string
  description: string
  image_url: string
  type: 'vehicle' | 'accessory' | 'audio' | 'boost' | 'boss'
}

export interface DLCPack {
  code: string
  name: string
  description: string
  image_url: string | null
  items: DLCPackItem[]
}

export const DLC_PACKS: Record<string, DLCPack> = {
  DLC_VEHICLES: {
    code: 'DLC_VEHICLES',
    name: 'Vehicle Pack',
    description: 'Unlock exclusive vehicles for your parking adventures',
    image_url: '/images/dlc-sections/vehicles-dlc-section.png',
    items: [
      {
        id: 'caravan',
        name: '1999 Dodge Caravan',
        description: "Luke's trusty ride from his formative years. Surprisingly agile for a minivan, with a robust frame and a knack for causing chaos. A true all-rounder.",
        image_url: '/images/dlc-items/99-dodge-caravan-dlc-item.png',
        type: 'vehicle',
      },
      {
        id: 'swift',
        name: '2011 Suzuki Swift',
        description: 'A nimble and zippy compact car, extremely high accumulator of Drake St parking tickets. Lacks heavy armor but makes up for it with unparalleled speed and maneuverability.',
        image_url: '/images/dlc-items/11-suzuki-swift-dlc-item.png',
        type: 'vehicle',
      },
    ],
  },
  DLC_ACCESSORIES: {
    code: 'DLC_ACCESSORIES',
    name: 'Accessories Pack',
    description: 'Unlock the Washington State License Plate accessory',
    image_url: '/images/dlc-sections/accessories-dlc-section.png',
    items: [
      {
        id: 'license-plate',
        name: 'Washington State License Plate',
        description: 'Show your Washington pride with this custom license plate accessory. Displays on your vehicle in-game.',
        image_url: '/images/dlc-items/license-plate-dlc-item.png',
        type: 'accessory',
      },
    ],
  },
  DLC_AUDIO: {
    code: 'DLC_AUDIO',
    name: 'Audio Pack',
    description: 'Unlock FM Radio and Car Horn features',
    image_url: '/images/dlc-sections/audio-dlc-section.png',
    items: [
      {
        id: 'fm-radio',
        name: 'FM Radio',
        description: 'Replace the game theme music with a radio station. Switch between curated songs during gameplay. Click the "📻 Next Song" button in the top right or press R to change songs.',
        image_url: '/images/dlc-items/radio-dlc-item.png',
        type: 'audio',
      },
      {
        id: 'car-horn',
        name: 'Car Horn',
        description: 'Honk your horn during gameplay! Choose from 3 different horn sounds or set it to random. Press H to honk.',
        image_url: '/images/dlc-items/car-horn-dlc-item.png',
        type: 'audio',
      },
    ],
  },
  DLC_BOOSTS: {
    code: 'DLC_BOOSTS',
    name: 'Boosts Pack',
    description: 'Unlock stat boosts: Hawkey\'s Red Bull Minifridge, Trucoat, and Costco Membership Card',
    image_url: '/images/dlc-sections/boosts-dlc-section.png',
    items: [
      {
        id: 'red-bull-fridge',
        name: "Hawkey's Red Bull Minifridge",
        description: 'Increases your vehicle\'s speed stat with a 6:37am Hawkey Red Bull.',
        image_url: '/images/dlc-items/hawkeys-fridge-dlc-item.png',
        type: 'boost',
      },
      {
        id: 'trucoat',
        name: 'Trucoat',
        description: 'Increases your vehicle\'s armor stat by taking Gerry\'s advice and buying that Trucoat.',
        image_url: '/images/dlc-items/trucoat-dlc-item.png',
        type: 'boost',
      },
      {
        id: 'costco-card',
        name: 'Costco Membership Card',
        description: 'Increases your vehicle\'s attack stat with more affordable Kirkland Hotdogs through Costco\'s membership programme.',
        image_url: '/images/dlc-items/costco-dlc-item.png',
        type: 'boost',
      },
    ],
  },
  DLC_BOSS_BATTLE: {
    code: 'DLC_BOSS_BATTLE',
    name: 'Boss Battle',
    description: 'Unlock the Connor boss battle game mode',
    image_url: '/images/dlc-sections/connor-dlc-section.png',
    items: [
      {
        id: 'connor-boss',
        name: 'Connor Boss Battle',
        description: 'Face off against Connor in an epic boss battle! Features Connor\'s Polestar, Tracksuit Values projectiles, and educational voiceover.',
        image_url: '/images/dlc-items/boss-battle-dlc-item.png',
        type: 'boss',
      },
    ],
  },
}

