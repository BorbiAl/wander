// Question bank for onboarding. Each session gets a random, non-repeating subset.
// Content sourced from the WanderGraph Onboarding Questions design document.
// HMM Hidden States: Explorer | Connector | Restorer | Achiever | Guardian

export type SwipeQuestion = {
  id: string;
  leftLabel: string;
  leftDescription: string;
  rightLabel: string;
  rightDescription: string;
  leftImageSrc?: string;
  rightImageSrc?: string;
  leftColor: string;
  rightColor: string;
  leftState: string;
  rightState: string;
  signalAxis: string;
};

export type AudioQuestion = {
  id: string;
  clipTitle: string;
  clipDescription: string;
  clipSrc?: string;
  primaryState: string;
  sliderLabels: [string, string, string]; // Low (1-2), Mid (3), High (4-5)
};

const IP_IMAGE_FILES = [
  'IP-01.webp', 'IP-02.webp', 'IP-03.jpg', 'IP-04.jpg', 'IP-05.jpg', 'IP-06.jpg',
  'IP-07.jpg', 'IP-08.webp', 'IP-09.webp', 'IP-10.jpg', 'IP-11.jpg', 'IP-12.webp',
  'IP-13.jpg', 'IP-14.jpg', 'IP-15.webp', 'IP-16.jpg', 'IP-17.jpg', 'IP-18.jpg',
  'IP-19.jpg', 'IP-20.jpg', 'IP-21.jpg', 'IP-22.jpg', 'IP-23.jpg', 'IP-24.jpg',
  'IP-25.jpg', 'IP-26.jpg', 'IP-27.webp', 'IP-28.jpg', 'IP-29.webp', 'IP-30.webp',
];

function getSwipeImagePath(oneBasedIndex: number): string {
  const fileName = IP_IMAGE_FILES[oneBasedIndex - 1];
  return fileName ? `/assets/${fileName}` : '/assets/IP-01.webp';
}

export type ScrollCardQuestion = {
  id: string;
  title: string;
  description: string;
  primaryState: string;
  signal: string;
};

export type EmojiOption = {
  emoji: string;
  label: string;
  state: string;
};

export type EmojiQuestion = {
  id: string;
  scenario: string;
  options: [EmojiOption, EmojiOption, EmojiOption, EmojiOption, EmojiOption, EmojiOption];
};

export type BudgetQuestion = {
  id: string;
  question: string;
  low: string;
  mid: string;
  high: string;
  signal: string;
};

export const SWIPE_QUESTIONS: SwipeQuestion[] = [
  {
    id: 'IP-01',
    leftLabel: 'Unmarked forest trail',
    leftDescription: 'Unmarked forest trail disappearing into fog',
    rightLabel: 'Well-marked hiking path',
    rightDescription: 'Well-marked hiking path with wooden signs',
    leftColor: '#1A2A1A',
    rightColor: '#2A2218',
    leftState: 'Explorer',
    rightState: 'Achiever',
    signalAxis: 'Novelty vs Structure',
  },
  {
    id: 'IP-02',
    leftLabel: 'Village grandmother making bread',
    leftDescription: 'Village grandmother teaching bread-making',
    rightLabel: 'Solo tent by a mountain lake',
    rightDescription: 'Solo tent pitched by a mountain lake',
    leftColor: '#2A1A1A',
    rightColor: '#1A1A2A',
    leftState: 'Connector',
    rightState: 'Restorer',
    signalAxis: 'Social vs Solitude',
  },
  {
    id: 'IP-03',
    leftLabel: 'Volunteers planting trees',
    leftDescription: 'Volunteers planting trees on eroded hillside',
    rightLabel: 'Mountain bikes downhill',
    rightDescription: 'Group racing mountain bikes downhill',
    leftColor: '#1A2A1A',
    rightColor: '#2A1A1A',
    leftState: 'Guardian',
    rightState: 'Achiever',
    signalAxis: 'Impact vs Thrill',
  },
  {
    id: 'IP-04',
    leftLabel: 'Shepherd in alpine meadow',
    leftDescription: 'Shepherd leading flock through alpine meadow',
    rightLabel: 'Local festival crowd',
    rightDescription: 'Crowded local festival with musicians',
    leftColor: '#1A2A1A',
    rightColor: '#2A1A2A',
    leftState: 'Restorer',
    rightState: 'Connector',
    signalAxis: 'Calm vs Energy',
  },
  {
    id: 'IP-05',
    leftLabel: 'Abandoned stone monastery',
    leftDescription: 'Abandoned stone monastery in the woods',
    rightLabel: 'Eco-lodge with solar garden',
    rightDescription: 'Eco-lodge with solar panels and garden',
    leftColor: '#1A2218',
    rightColor: '#1A2A1A',
    leftState: 'Explorer',
    rightState: 'Guardian',
    signalAxis: 'Discovery vs Sustainability',
  },
  {
    id: 'IP-06',
    leftLabel: 'Kids in village square',
    leftDescription: 'Kids playing in a village square',
    rightLabel: 'Single kayak at dawn',
    rightDescription: 'Single kayak on a still river at dawn',
    leftColor: '#281818',
    rightColor: '#181828',
    leftState: 'Connector',
    rightState: 'Restorer',
    signalAxis: 'Community vs Solitude',
  },
  {
    id: 'IP-07',
    leftLabel: 'Steep rocky scramble',
    leftDescription: 'Steep rocky scramble up a ridge',
    rightLabel: 'Wildflower field, no path',
    rightDescription: 'Wildflower field with no path',
    leftColor: '#1A1A2A',
    rightColor: '#1A2A1A',
    leftState: 'Achiever',
    rightState: 'Explorer',
    signalAxis: 'Challenge vs Wandering',
  },
  {
    id: 'IP-08',
    leftLabel: 'Artisan carving wood',
    leftDescription: 'Artisan carving wood in a dim workshop',
    rightLabel: 'Village impact dashboard',
    rightDescription: 'Data dashboard showing village impact metrics',
    leftColor: '#22181A',
    rightColor: '#1A2218',
    leftState: 'Connector',
    rightState: 'Guardian',
    signalAxis: 'Craft vs Metrics',
  },
  {
    id: 'IP-09',
    leftLabel: 'Frozen waterfall gorge',
    leftDescription: 'Frozen waterfall in a remote gorge',
    rightLabel: 'Community beehive project',
    rightDescription: 'Community beehive project with locals',
    leftColor: '#1A1A28',
    rightColor: '#1A281A',
    leftState: 'Explorer',
    rightState: 'Guardian',
    signalAxis: 'Frontier vs Collective',
  },
  {
    id: 'IP-10',
    leftLabel: 'Summit cairn view',
    leftDescription: 'Summit cairn with panoramic view',
    rightLabel: 'Hammock by a stream',
    rightDescription: 'Hammock between two trees by a stream',
    leftColor: '#1A1A28',
    rightColor: '#1A281A',
    leftState: 'Achiever',
    rightState: 'Restorer',
    signalAxis: 'Goal vs Rest',
  },
  {
    id: 'IP-11',
    leftLabel: 'Milky Way over village',
    leftDescription: 'Night sky with Milky Way over a village',
    rightLabel: 'Bonfire storytelling circle',
    rightDescription: 'Bonfire circle with travelers sharing stories',
    leftColor: '#14141E',
    rightColor: '#2A1A18',
    leftState: 'Restorer',
    rightState: 'Connector',
    signalAxis: 'Contemplation vs Connection',
  },
  {
    id: 'IP-12',
    leftLabel: 'Vine-covered cave entrance',
    leftDescription: 'Cave entrance half-hidden by vines',
    rightLabel: 'Trail race finish timer',
    rightDescription: 'Trail race finish line with a timer',
    leftColor: '#181E18',
    rightColor: '#2A1818',
    leftState: 'Explorer',
    rightState: 'Achiever',
    signalAxis: 'Unknown vs Measurable',
  },
  {
    id: 'IP-13',
    leftLabel: 'Hand-drawn map',
    leftDescription: 'Hand-drawn map on yellowed paper',
    rightLabel: 'GPS elevation profile',
    rightDescription: 'GPS tracker showing elevation profile',
    leftColor: '#22201A',
    rightColor: '#1A1E28',
    leftState: 'Explorer',
    rightState: 'Achiever',
    signalAxis: 'Intuition vs Data',
  },
  {
    id: 'IP-14',
    leftLabel: 'Elderly woman weaving',
    leftDescription: 'Elderly woman weaving on a loom',
    rightLabel: 'Reforestation before/after',
    rightDescription: 'Reforestation before/after comparison',
    leftColor: '#281828',
    rightColor: '#182818',
    leftState: 'Connector',
    rightState: 'Guardian',
    signalAxis: 'Tradition vs Restoration',
  },
  {
    id: 'IP-15',
    leftLabel: 'Fog-covered lake rowboat',
    leftDescription: 'Fog-covered lake with a single rowboat',
    rightLabel: 'Buzzing village market',
    rightDescription: 'Village market buzzing with vendors',
    leftColor: '#1A1A24',
    rightColor: '#241A1A',
    leftState: 'Restorer',
    rightState: 'Connector',
    signalAxis: 'Stillness vs Social',
  },
].map((question, index) => {
  const leftImageIndex = index * 2 + 1;
  const rightImageIndex = index * 2 + 2;

  return {
    ...question,
    leftImageSrc: getSwipeImagePath(leftImageIndex),
    rightImageSrc: getSwipeImagePath(rightImageIndex),
  };
});

export const AUDIO_QUESTIONS: AudioQuestion[] = [
  {
    id: 'AU-01',
    clipTitle: 'Forest Stream with Distant Birdsong',
    clipDescription: 'Forest stream with distant birdsong, 15s',
    primaryState: 'Restorer',
    sliderLabels: ['Uncomfortable', 'Neutral', 'Deeply calmed'],
  },
  {
    id: 'AU-02',
    clipTitle: 'Bulgarian Village Festival',
    clipDescription: 'Bulgarian village festival: gadulka + kaval + laughter, 15s',
    primaryState: 'Connector',
    sliderLabels: ['Overwhelmed', 'Curious', 'Energized'],
  },
  {
    id: 'AU-03',
    clipTitle: 'Mountain Wind and Rock Crumble',
    clipDescription: 'Mountain wind with occasional rock crumble, 15s',
    primaryState: 'Explorer',
    sliderLabels: ['Anxious', 'Intrigued', 'Exhilarated'],
  },
  {
    id: 'AU-04',
    clipTitle: 'Crackling Campfire with Crickets',
    clipDescription: 'Crackling campfire with crickets, 15s',
    primaryState: 'Restorer',
    sliderLabels: ['Indifferent', 'Comfortable', 'At peace'],
  },
  {
    id: 'AU-05',
    clipTitle: 'Distant Church Bells in a Valley',
    clipDescription: 'Distant church bells echoing through a valley, 15s',
    primaryState: 'Restorer',
    sliderLabels: ['Nothing special', 'Pleasant', 'Moved'],
  },
  {
    id: 'AU-06',
    clipTitle: 'Traditional Polyphonic Singing',
    clipDescription: 'Group singing a traditional Bulgarian polyphonic song, 15s',
    primaryState: 'Connector',
    sliderLabels: ['Confused', 'Appreciating', 'Want to join'],
  },
  {
    id: 'AU-07',
    clipTitle: 'Heavy Rain on a Tin Roof',
    clipDescription: 'Heavy rain on a tin roof with thunder, 15s',
    primaryState: 'Restorer',
    sliderLabels: ['Tense', 'Cozy', 'Soothed'],
  },
  {
    id: 'AU-08',
    clipTitle: 'Footsteps in Deep Snow',
    clipDescription: 'Footsteps crunching through deep snow, silence between, 15s',
    primaryState: 'Explorer',
    sliderLabels: ['Bored', 'Alert', 'Alive'],
  },
  {
    id: 'AU-09',
    clipTitle: 'Bees in a Wildflower Meadow',
    clipDescription: 'Bees buzzing in a wildflower meadow, 15s',
    primaryState: 'Guardian',
    sliderLabels: ['Nervous', 'Neutral', 'Harmonious'],
  },
  {
    id: 'AU-10',
    clipTitle: 'Blacksmith Hammer on Anvil',
    clipDescription: 'Rhythmic blacksmith hammer on anvil in a village, 15s',
    primaryState: 'Connector',
    sliderLabels: ['Startled', 'Fascinated', 'Inspired'],
  },
].map((question): AudioQuestion => ({
  ...question,
  sliderLabels: question.sliderLabels as [string, string, string],
  clipSrc: `/assets/${question.id}.mp3`,
}));

export const SCROLL_CARD_QUESTIONS: ScrollCardQuestion[] = [
  {
    id: 'SC-01',
    title: 'The Last Bagpipe Maker of Shiroka Laka',
    description: 'Ivan is 73 and the only person left who builds kaba gaida from goatskin and cherry wood. Each instrument takes 3 months. He has no apprentice. If you visit, he will show you the reeds he tunes by ear, the workshop that smells of wood shavings and beeswax, and the songs that only 12 people alive still know how to play.',
    primaryState: 'Connector',
    signal: 'Culture preservation narrative',
  },
  {
    id: 'SC-02',
    title: 'Ridge Run: Botev Peak in Under 6 Hours',
    description: 'The fastest known time on the Botev traverse is 5h42m. Most hikers take two days. The route climbs 1,800m through dwarf pine, exposed ridgeline, and a final scramble that requires both hands. Weather changes in minutes. You carry your own water. There are no huts after Raisko Praskalo. Only your legs and your lungs decide if you finish.',
    primaryState: 'Achiever',
    signal: 'Challenge/performance framing',
  },
  {
    id: 'SC-03',
    title: 'Rewilding the Eastern Rhodopes: Vulture Return',
    description: "Since 2018, conservationists have released 47 griffon vultures into the Rhodope mountains. Feeding stations are stocked weekly. Camera traps monitor nesting. Local shepherds, initially skeptical, now report carcass cleanup they haven't seen in decades. The population is self-sustaining for the first time in 50 years. Volunteers help maintain stations and collect data.",
    primaryState: 'Guardian',
    signal: 'Impact/data-driven narrative',
  },
  {
    id: 'SC-04',
    title: 'The Silence of Trigrad Gorge',
    description: "The gorge narrows until the sky is a slit. The Trigradska River disappears into the Devil's Throat cave and doesn't resurface for 500 meters. There is no phone signal. No trail markers. The rock walls are 300 meters high and the light at noon is the color of old silver. People who come here don't talk much. They don't need to.",
    primaryState: 'Restorer',
    signal: 'Sensory/solitude narrative',
  },
  {
    id: 'SC-05',
    title: 'Mapping Unmarked Paths in the Pirin Wilderness',
    description: 'There are over 200km of shepherd trails in Pirin that appear on no map. They connect summer pastures that have been used for centuries but never formally recorded. A small team is walking them with GPS, interviewing shepherds, and creating the first open-source trail database. Some paths are being lost to scrub within a decade. Every week a trail disappears.',
    primaryState: 'Explorer',
    signal: 'Discovery/frontier narrative',
  },
  {
    id: 'SC-06',
    title: 'Kukeri: When Monsters Protect the Village',
    description: 'Every January, men in Razlog strap on 30kg of bells and hand-carved wooden masks. They become Kukeri - half-animal, half-spirit. They stomp through the village to drive out evil and guarantee a good harvest. The costumes take a year to build. The dance lasts two days. Outsiders rarely see the preparation: the painting, the arguments about whose mask is heaviest, the pride.',
    primaryState: 'Connector',
    signal: 'Cultural immersion narrative',
  },
  {
    id: 'SC-07',
    title: 'Solo Bivouac at Koncheto Ridge',
    description: 'Koncheto is a knife-edge ridge at 2,810m with drops on both sides. Most people cross it and leave. But if you stay - pitch a bivouac bag on the saddle below, cook on a pocket stove as the sun goes - you get something no hut offers: absolute silence above the clouds, and a sunrise that starts under your feet.',
    primaryState: 'Restorer',
    signal: 'Solitude/contemplation framing',
  },
  {
    id: 'SC-08',
    title: 'Building a School Garden in Dospat',
    description: 'The school in Dospat has 83 students and zero outdoor learning space. A group of volunteers is building raised beds, a small greenhouse, and a composting station. The goal: every student grows at least one vegetable from seed to plate within one school year. The local municipality has pledged to maintain it. EUR 2,400 covers everything. 40% is already funded.',
    primaryState: 'Guardian',
    signal: 'Concrete impact with numbers',
  },
  {
    id: 'SC-09',
    title: 'The Vertical Kilometer: Musala Speed Ascent',
    description: "1,000 meters of elevation gain in 5km. Start at Borovets chair lift base. Finish at Musala summit, 2,925m. Current record: 47 minutes. Most runners collapse at the false summit where the wind hits. The route passes the Ledenoto Ezero, frozen until July. There's a logbook at the top. Write your time. Or don't - you'll know either way.",
    primaryState: 'Achiever',
    signal: 'Competitive/measurable challenge',
  },
  {
    id: 'SC-10',
    title: 'Where the River Has No Name',
    description: "Deep in the Western Rhodopes, a river flows through a gorge that has no formal name on Bulgarian topographic maps. Locals call it three different things depending on which village you ask. The water is cold enough to numb your hands in August. There are crayfish under the rocks and no trail along the bank. You pick your own line. There is no wrong one.",
    primaryState: 'Explorer',
    signal: 'Mystery/uncharted territory',
  },
];

export const EMOJI_QUESTIONS: EmojiQuestion[] = [
  {
    id: 'SR-01',
    scenario: "You arrive at a village and discover the only guesthouse is full. A local family offers their spare room. What's your reaction?",
    options: [
      { emoji: '🤩', label: 'Thrilled', state: 'Connector' },
      { emoji: '😊', label: "Grateful, let's go", state: 'Connector' },
      { emoji: '🤔', label: 'Hesitant but curious', state: 'Explorer' },
      { emoji: '😬', label: 'Prefer my own space', state: 'Restorer' },
      { emoji: '⛺', label: "I'll pitch a tent instead", state: 'Explorer' },
      { emoji: '💰', label: "I'll pay them fairly", state: 'Guardian' },
    ],
  },
  {
    id: 'SR-02',
    scenario: "A local guide says: 'There's a waterfall nobody visits, but the path is unmarked and takes 4 hours.' You say:",
    options: [
      { emoji: '🚀', label: "Let's go NOW", state: 'Explorer' },
      { emoji: '🗺️', label: 'Show me on the map', state: 'Achiever' },
      { emoji: '🧘', label: "Sounds peaceful, I'm in", state: 'Restorer' },
      { emoji: '👫', label: 'Can others join?', state: 'Connector' },
      { emoji: '⏱️', label: 'Can we do it in 3?', state: 'Achiever' },
      { emoji: '🌿', label: 'Is the path damaging habitat?', state: 'Guardian' },
    ],
  },
  {
    id: 'SR-03',
    scenario: 'You have one free day. A village elder offers to teach you a traditional craft. A mountain guide offers a peak attempt. What wins?',
    options: [
      { emoji: '🎨', label: 'Craft, definitely', state: 'Connector' },
      { emoji: '⛰️', label: 'Summit, no question', state: 'Achiever' },
      { emoji: '🤷', label: 'Can I do half and half?', state: 'Explorer' },
      { emoji: '🛌', label: "Neither. I'll wander alone", state: 'Restorer' },
      { emoji: '📸', label: 'Which helps the village more?', state: 'Guardian' },
      { emoji: '🌟', label: 'Whichever is rarer', state: 'Explorer' },
    ],
  },
  {
    id: 'SR-04',
    scenario: 'A village festival starts tonight. 200 people, live music, dancing until 3am. Your move?',
    options: [
      { emoji: '💃', label: "Front row, let's dance", state: 'Connector' },
      { emoji: '👀', label: 'Watch from the edge', state: 'Restorer' },
      { emoji: '🎶', label: 'Ask to play an instrument', state: 'Connector' },
      { emoji: '🌙', label: 'Skip it, hike at dawn', state: 'Achiever' },
      { emoji: '📝', label: 'Document it for the village', state: 'Guardian' },
      { emoji: '😶', label: "I'll find a quiet spot nearby", state: 'Restorer' },
    ],
  },
  {
    id: 'SR-05',
    scenario: "You find out the popular trail is overcrowded and eroding. There's an alternative route, longer but untouched. You:",
    options: [
      { emoji: '🌿', label: 'Take the alternative, obviously', state: 'Guardian' },
      { emoji: '⚡', label: 'Popular trail but run it fast', state: 'Achiever' },
      { emoji: '🗺️', label: 'Find a third route nobody mentioned', state: 'Explorer' },
      { emoji: '👥', label: 'Take the popular one, meet people', state: 'Connector' },
      { emoji: '🛠️', label: 'Help repair the eroded trail first', state: 'Guardian' },
      { emoji: '🏕️', label: 'Skip both, camp here', state: 'Restorer' },
    ],
  },
  {
    id: 'SR-06',
    scenario: "Your host says: 'Tomorrow we slaughter a pig for the village feast. Want to help?' You:",
    options: [
      { emoji: '💪', label: "I'm in, full experience", state: 'Connector' },
      { emoji: '😳', label: 'Watch but not participate', state: 'Explorer' },
      { emoji: '🍳', label: "I'll help cook after", state: 'Connector' },
      { emoji: '🚶', label: "I'll go for a walk instead", state: 'Restorer' },
      { emoji: '📊', label: 'How does this support the village economy?', state: 'Guardian' },
      { emoji: '🏆', label: 'Is there a competition element?', state: 'Achiever' },
    ],
  },
  {
    id: 'SR-07',
    scenario: 'A storm traps you in a mountain hut for 24 hours with 6 strangers. How do you feel?',
    options: [
      { emoji: '🎉', label: 'Best thing that could happen', state: 'Connector' },
      { emoji: '😩', label: 'Claustrophobic nightmare', state: 'Restorer' },
      { emoji: '🎲', label: "Let's play cards", state: 'Connector' },
      { emoji: '📖', label: 'Finally time to read', state: 'Restorer' },
      { emoji: '🗺️', label: "Plan tomorrow's route", state: 'Achiever' },
      { emoji: '🤝', label: 'Organize supplies fairly', state: 'Guardian' },
    ],
  },
  {
    id: 'SR-08',
    scenario: 'You can fund one village project: a new trail bridge, a cultural archive, or a solar panel system. You pick:',
    options: [
      { emoji: '🌉', label: 'Trail bridge (access)', state: 'Explorer' },
      { emoji: '📚', label: 'Cultural archive', state: 'Connector' },
      { emoji: '☀️', label: 'Solar panels', state: 'Guardian' },
      { emoji: '🏅', label: 'Whichever has measurable ROI', state: 'Achiever' },
      { emoji: '🗣️', label: 'Ask the villagers what they need', state: 'Guardian' },
      { emoji: '🤔', label: 'The one nobody else funds', state: 'Explorer' },
    ],
  },
];

export const BUDGET_QUESTIONS: BudgetQuestion[] = [
  {
    id: 'BU-01',
    question: 'Daily budget for rural experience',
    low: '<EUR 30 (backpacker)',
    mid: 'EUR 30-80 (comfort)',
    high: '>EUR 80 (premium)',
    signal: 'Spending threshold correlates with Achiever (high) and Guardian (willing to pay for impact).',
  },
  {
    id: 'BU-02',
    question: 'How much extra would you pay if 100% goes to the village?',
    low: 'EUR 0 (price is price)',
    mid: 'EUR 5-15 (fair premium)',
    high: '>EUR 15 (impact first)',
    signal: 'Direct Guardian signal; indifference leans Achiever/Explorer.',
  },
  {
    id: 'BU-03',
    question: 'Acceptable travel time to reach a remote village (one-way)',
    low: '<1 hour',
    mid: '1-3 hours',
    high: '>3 hours (the further the better)',
    signal: 'Distance tolerance: Explorer/Restorer high, Connector/Achiever low.',
  },
];

function pickUnique<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function pickOne<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export type OnboardingQuestions = {
  swipes: SwipeQuestion[]; // 6 items
  audios: AudioQuestion[]; // 3 items
  scrollCards: ScrollCardQuestion[]; // 3 items
  emojis: EmojiQuestion[]; // 2 items
  budget: BudgetQuestion; // 1 item
};

export function generateQuestions(): OnboardingQuestions {
  return {
    swipes: pickUnique(SWIPE_QUESTIONS, 6),
    audios: pickUnique(AUDIO_QUESTIONS, 3),
    scrollCards: pickUnique(SCROLL_CARD_QUESTIONS, 3),
    emojis: pickUnique(EMOJI_QUESTIONS, 2),
    budget: pickOne(BUDGET_QUESTIONS),
  };
}
