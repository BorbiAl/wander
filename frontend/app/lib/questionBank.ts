// Question bank for onboarding. Each session, a random subset is picked.
// Observation values (HMM columns) are fixed per slot — only the text varies.

export type SwipeQuestion = {
  leftLabel: string;
  rightLabel: string;
  leftColor: string;
  rightColor: string;
  // left → obs even, right → obs odd (within the slot's pair)
};

export type AudioQuestion = {
  clipTitle: string;
  clipDescription: string;
};

export type EmojiQuestion = {
  scenario: string;
};

// --- Swipe questions (6 slots, obs pairs: 0/1, 2/3, 4/5, 6/7, 8/9, 10/11) ---
// Each slot has a pool; one is picked at random per session.

export const SWIPE_POOLS: SwipeQuestion[][] = [
  // Slot 0 — obs 0 (left=wilderness) vs 1 (right=social)
  [
    { leftLabel: 'Mountain wilderness', rightLabel: 'Village festival', leftColor: '#1A2A1A', rightColor: '#2A1A2A' },
    { leftLabel: 'Empty canyon at dawn', rightLabel: 'Crowded night market', leftColor: '#1A2218', rightColor: '#221A28' },
    { leftLabel: 'Solo trek above the clouds', rightLabel: 'Street food with strangers', leftColor: '#162416', rightColor: '#24162A' },
    { leftLabel: 'Remote glacier viewpoint', rightLabel: 'Harvest celebration', leftColor: '#141E14', rightColor: '#1E1428' },
  ],
  // Slot 1 — obs 2 (left=solitude) vs 3 (right=community)
  [
    { leftLabel: 'Lone hermitage', rightLabel: 'Busy market square', leftColor: '#1A1A2A', rightColor: '#2A1A1A' },
    { leftLabel: 'Sunrise meditation alone', rightLabel: 'Village communal meal', leftColor: '#181828', rightColor: '#281818' },
    { leftLabel: 'Abandoned chapel in fog', rightLabel: 'Lively town square', leftColor: '#14141E', rightColor: '#1E1414' },
    { leftLabel: 'Reading alone by a river', rightLabel: 'Dancing with locals', leftColor: '#1A1A24', rightColor: '#241A1A' },
  ],
  // Slot 2 — obs 4 (left=wild trail) vs 5 (right=open gathering)
  [
    { leftLabel: 'Dense forest trail', rightLabel: 'Open meadow gathering', leftColor: '#1A2A1A', rightColor: '#2A2A1A' },
    { leftLabel: 'Jungle path, no map', rightLabel: 'Folk music in a clearing', leftColor: '#182818', rightColor: '#282818' },
    { leftLabel: 'Overgrown ruins alone', rightLabel: 'Bonfire circle with travelers', leftColor: '#162616', rightColor: '#262616' },
    { leftLabel: 'Hidden waterfall hike', rightLabel: 'Outdoor craft fair', leftColor: '#142414', rightColor: '#242414' },
  ],
  // Slot 3 — obs 6 (left=history/stillness) vs 7 (right=living ritual)
  [
    { leftLabel: 'Ancient ruins', rightLabel: 'Living ceremony', leftColor: '#2A1A1A', rightColor: '#1A2A2A' },
    { leftLabel: 'Silent monastery walls', rightLabel: 'Fire-walking ritual', leftColor: '#281818', rightColor: '#182828' },
    { leftLabel: 'Crumbling stone archive', rightLabel: 'Harvest blessing dance', leftColor: '#261616', rightColor: '#162626' },
    { leftLabel: 'Cave paintings at dusk', rightLabel: 'Shaman drumming circle', leftColor: '#241414', rightColor: '#142424' },
  ],
  // Slot 4 — obs 8 (left=summit/achievement) vs 9 (right=valley/community)
  [
    { leftLabel: 'Summit ridge', rightLabel: 'River valley hamlet', leftColor: '#1A1A2A', rightColor: '#1A2A1A' },
    { leftLabel: 'Glacier crossing', rightLabel: 'Floating village at dusk', leftColor: '#18182A', rightColor: '#182818' },
    { leftLabel: 'Via ferrata ascent', rightLabel: 'Fishing community lunch', leftColor: '#16162A', rightColor: '#162616' },
    { leftLabel: 'Desert plateau at sunrise', rightLabel: 'Oasis village market', leftColor: '#14142A', rightColor: '#142414' },
  ],
  // Slot 5 — obs 10 (left=volunteer/impact) vs 11 (right=craft/making)
  [
    { leftLabel: 'Reforestation camp', rightLabel: 'Artisan workshop', leftColor: '#1A2A1A', rightColor: '#2A1A2A' },
    { leftLabel: 'Community well project', rightLabel: 'Weaving atelier', leftColor: '#182818', rightColor: '#281828' },
    { leftLabel: 'Wildlife sanctuary work', rightLabel: 'Pottery master class', leftColor: '#162616', rightColor: '#261626' },
    { leftLabel: 'Coral reef restoration', rightLabel: 'Natural dye workshop', leftColor: '#142414', rightColor: '#241424' },
  ],
];

// --- Audio questions (3 slots, obs 12-17, each slot → val 0/1/2 mapped within) ---
export const AUDIO_POOLS: AudioQuestion[][] = [
  // Slot 6
  [
    { clipTitle: 'Forest stream at dawn', clipDescription: 'Soft water over stones. Birdsong. No human sound.' },
    { clipTitle: 'Rain on a tin roof', clipDescription: 'Steady rhythm. Distant thunder. Complete shelter.' },
    { clipTitle: 'Wind through tall grass', clipDescription: 'Dry rustling. A hawk cry far above. Emptiness.' },
    { clipTitle: 'Cave drip echoes', clipDescription: 'Deep silence broken only by water. Ancient dark.' },
  ],
  // Slot 7
  [
    { clipTitle: 'Village festival drums', clipDescription: 'Rhythmic, communal energy. Voices joining in.' },
    { clipTitle: 'Street market at noon', clipDescription: 'Haggling, laughter, sizzling food. Life in motion.' },
    { clipTitle: 'Wedding procession music', clipDescription: 'Ululations, clapping, brass horns. Pure celebration.' },
    { clipTitle: 'Children playing in a square', clipDescription: 'Shouts, laughter, a ball bouncing on cobblestones.' },
  ],
  // Slot 8
  [
    { clipTitle: 'Mountain wind', clipDescription: 'Vast silence broken by a single distant melody.' },
    { clipTitle: 'Summit at altitude', clipDescription: 'Wind shear. No other sound. The world below.' },
    { clipTitle: 'Frozen lake cracking', clipDescription: 'Deep groans beneath ice. Otherworldly, vast.' },
    { clipTitle: 'Desert silence at 3am', clipDescription: 'Absolute stillness. One cricket. Stars overhead.' },
  ],
];

// --- Emoji scenario questions (2 slots, obs 21-23) ---
export const EMOJI_POOLS: EmojiQuestion[][] = [
  // Slot 12
  [
    { scenario: 'Your guide cancels. You have a free day in a village where no one speaks your language.' },
    { scenario: 'The only guesthouse is full. A local family offers their spare room for free.' },
    { scenario: 'You miss the last bus. The next one is tomorrow morning.' },
    { scenario: 'Heavy rain traps you in a tea house for four hours with strangers.' },
    { scenario: 'You arrive and realize you booked the wrong village entirely.' },
  ],
  // Slot 13
  [
    { scenario: 'You discover the village hosts a secret fire-walking ritual tonight. You weren\'t invited.' },
    { scenario: 'A elder invites you to a private ceremony outsiders almost never witness.' },
    { scenario: 'Locals are preparing a feast to honor their ancestors. They gesture you toward a seat.' },
    { scenario: 'You stumble on a closed-door music session in a courtyard. Someone waves you in.' },
    { scenario: 'The village holds a silent prayer walk at midnight. A child hands you a candle.' },
  ],
];

function pick<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

export type OnboardingQuestions = {
  swipes: SwipeQuestion[];   // 6 items
  audios: AudioQuestion[];   // 3 items
  emojis: EmojiQuestion[];   // 2 items
};

export function generateQuestions(): OnboardingQuestions {
  return {
    swipes: SWIPE_POOLS.map(pool => pick(pool)),
    audios: AUDIO_POOLS.map(pool => pick(pool)),
    emojis: EMOJI_POOLS.map(pool => pick(pool)),
  };
}
