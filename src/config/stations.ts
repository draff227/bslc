import { Config } from '@/types';

export const stationsConfig: Config = {
  stations: [
    {
      id: 'jita-iv-moon-4',
      name: 'Jita IV - Moon 4 - Caldari Navy Assembly Plant',
      system: 'Jita',
      systemId: 30000142,
    },
    {
      id: 'saminer',
      name: 'Saminer - Stain is for Stain People',
      system: 'Saminer',
      systemId: 30001721,
    },
    {
      id: 't-nnjz',
      name: 'T-NNJZ - meow meow',
      system: 'T-NNJZ',
      systemId: 30001959,
    },
    {
      id: 'z-xmuc',
      name: 'Z-XMUC - Ends of Invention',
      system: 'Z-XMUC',
      systemId: 30001929,
    },
    {
      id: 'o-fthe',
      name: 'O-FTHE - Good Sax Nightmare Dealership',
      system: 'O-FTHE',
      systemId: 30001938,
    },
    {
      id: 'y-4u62',
      name: 'Y-4U62 - Neural-Link Giga Factory',
      system: 'Y-4U62',
      systemId: 30001932,
    },
    {
      id: '37s-ko-vi-moon-14',
      name: '37S-KO VI - Moon 14 - True Creations Assembly Plant',
      system: '37S-KO',
      systemId: 30001868,
    }
  ],
  
  priceMatrix: {
    'jita-iv-moon-4': {
      'jita-iv-moon-4': 0,
      'saminer': 300,
      't-nnjz': 650,
      'z-xmuc': 650,
      'o-fthe': 650,
      'y-4u62': 650,
      '37s-ko-vi': 650
    },
    'saminer': {
      'jita-iv-moon-4': 300,
      'saminer': 0,
      't-nnjz': 650,
      'z-xmuc': 650,
      'o-fthe': 650,
      'y-4u62': 650,
      '37s-ko-vi': 650
    },
    't-nnjz': {
      'jita-iv-moon-4': 650,
      'saminer': 650,
      't-nnjz': 650,
      'z-xmuc': 650,
      'o-fthe': 650,
      'y-4u62': 650,
      '37s-ko-vi': 650
    },
    'z-xmuc': {
      'jita-iv-moon-4': 650,
      'saminer': 650,
      't-nnjz': 650,
      'z-xmuc': 650,
      'o-fthe': 650,
      'y-4u62': 650,
      '37s-ko-vi': 650
    },
    'o-fthe': {
      'jita-iv-moon-4': 650,
      'saminer': 650,
      't-nnjz': 650,
      'z-xmuc': 650,
      'o-fthe': 650,
      'y-4u62': 650,
      '37s-ko-vi': 0
    },
    'y-4u62': {
      'jita-iv-moon-4': 650,
      'saminer': 650,
      't-nnjz': 650,
      'z-xmuc': 650,
      'o-fthe': 650,
      'y-4u62': 650,
      '37s-ko-vi': 650
    },
    '37s-ko-vi': {
      'jita-iv-moon-4': 650,
      'saminer': 650,
      't-nnjz': 650,
      'z-xmuc': 650,
      'o-fthe': 650,
      'y-4u62': 650,
      '37s-ko-vi': 650
    }
  },
  
  maxVolume: 345000,
  maxCollateral: 3000000000,
  collateralPercentage: 0.01,
  defaultPickupStation: 'jita-iv-moon-4',
  defaultDestinationStation: 'y-4u62'
};