export type FriendProfile = {
  userId: string;
  displayName: string;
  vector: [number, number, number, number, number];
  dominant: string;
  addedAt: number;
};

export type TravelGroup = {
  id: string;
  name: string;
  memberIds: string[]; // includes the local user's userId
  createdAt: number;
};

export type GroupScoredExperience = Experience & {
  score: number;            // dot(groupVector, personalityWeights)
  memberScores: number[];   // per-member dot products, same order as group.memberIds
  minMemberScore: number;   // worst-satisfied member's score
};

export type Village = {
  id: string; name: string; lat: number; lng: number;
  region: string; cws: number; population: number;
  description: string; nearby: string[]; country?: string;
}

export type Experience = {
  id: string; villageId: string; name: string;
  type: 'craft'|'hike'|'homestay'|'ceremony'|'cooking'|'volunteer'|'folklore'|'sightseeing';
  price: number; duration: string; hostId: string;
  description: string; personalityWeights: [number,number,number,number,number];
  isFree?: boolean; isActive?: boolean; spotsRemaining?: number;
  startDate?: string; endDate?: string;
}

export type Host = {
  id: string; villageId: string; name: string;
  bio: string; rating: number; experienceIds: string[];
}

export const PERSONALITIES = ['Explorer','Connector','Restorer','Achiever','Guardian'] as const;
export type PersonalityType = typeof PERSONALITIES[number];

export const PERSONALITY_INFO: Record<PersonalityType, {color:string, emoji:string, description:string}> = {
  Explorer:  { color:'#C8F55A', emoji:'🧭', description:'You seek the unmarked path. Unknown ruins, dense forests, zero tourists.' },
  Connector: { color:'#F5A623', emoji:'🤝', description:'You travel for people. Festivals, communal meals, shared stories.' },
  Restorer:  { color:'#60A5FA', emoji:'🌿', description:'You need stillness. Ancient houses, slow mornings, nature without noise.' },
  Achiever:  { color:'#F87171', emoji:'⛰️', description:'You want the summit. Difficulty, elevation, physical challenge.' },
  Guardian:  { color:'#34D399', emoji:'♻️', description:'You travel to give back. Volunteering, restoration, low-footprint.' },
}

// These arrays are mutable so DataProvider can patch them with live API data at runtime.
// All components should read via getVillage() / getExperience() from utils.ts.
export const VILLAGES: Village[] = [
  { id:'shiroka-laka', name:'Shiroka Laka', lat:41.75, lng:24.54, region:'Rhodopes', cws:72, population:300,
    description:'Famous for its gaida tradition and layered stone architecture. One of Bulgaria\'s most musical villages.',
    nearby:['kovachevitsa','leshten'] },
  { id:'kovachevitsa', name:'Kovachevitsa', lat:41.77, lng:23.85, region:'Rhodopes', cws:58, population:120,
    description:'An entirely preserved 18th-century mountain village. Time stopped here and no one minds.',
    nearby:['shiroka-laka','leshten'] },
  { id:'zheravna', name:'Zheravna', lat:42.87, lng:26.49, region:'Stara Planina', cws:65, population:450,
    description:'Largest collection of Bulgarian National Revival houses. Cobblestone streets unchanged since 1870.',
    nearby:['bozhentsi','cherni-osam'] },
  { id:'bozhentsi', name:'Bozhentsi', lat:42.77, lng:25.34, region:'Stara Planina', cws:61, population:200,
    description:'Medieval settlement untouched since the 18th century. Goats outnumber residents.',
    nearby:['zheravna','beli-osam'] },
  { id:'leshten', name:'Leshten', lat:41.71, lng:23.94, region:'Rhodopes', cws:44, population:80,
    description:'Remote Rhodope village with dramatic views. One road in. Silence guaranteed.',
    nearby:['shiroka-laka','zlatolist'] },
  { id:'staro-stefanovo', name:'Staro Stefanovo', lat:43.28, lng:23.75, region:'Vratsa', cws:38, population:60,
    description:'Ancient Thracian settlement. Fewer than 20 permanent residents. Completely authentic.',
    nearby:['dolene'] },
  { id:'beli-osam', name:'Beli Osam', lat:42.80, lng:24.77, region:'Stara Planina', cws:52, population:180,
    description:'River valley village known for yellow cheese made in stone cellars since the 14th century.',
    nearby:['bozhentsi','cherni-osam'] },
  { id:'zlatolist', name:'Zlatolist', lat:41.52, lng:23.61, region:'Rhodopes', cws:41, population:95,
    description:'Pomak village with authentic textile traditions. The kilim patterns here exist nowhere else.',
    nearby:['leshten'] },
  { id:'cherni-osam', name:'Cherni Osam', lat:42.73, lng:24.73, region:'Stara Planina', cws:55, population:210,
    description:'Gateway village to Central Balkan National Park. Brown bears spotted on the ridge last spring.',
    nearby:['zheravna','beli-osam'] },
  { id:'dolene', name:'Dolene', lat:42.07, lng:22.71, region:'Struma Valley', cws:33, population:45,
    description:'Rarely visited valley village near the Greek border. The last keeper of Nestinarstvo fire-walking.',
    nearby:['staro-stefanovo'] },
];

export const HOSTS: Host[] = [
  { id:'h1', villageId:'shiroka-laka', name:'Dimitar Yordanov', rating:4.9, bio:'9th-generation gaida maker. Has taught 40 students from 12 countries.', experienceIds:['e1'] },
  { id:'h2', villageId:'shiroka-laka', name:'Elena Stoycheva', rating:4.8, bio:'Leads the village women\'s choir. Has performed at UNESCO events in Paris.', experienceIds:['e2'] },
  { id:'h3', villageId:'kovachevitsa', name:'Community Council', rating:4.7, bio:'Village cooperative managing restoration of 8 protected buildings.', experienceIds:['e3'] },
  { id:'h4', villageId:'zheravna', name:'Georgi Petrov', rating:4.9, bio:'Architectural historian. Has catalogued every Revival-era house in the region.', experienceIds:['e4'] },
  { id:'h5', villageId:'zheravna', name:'Baba Marta', rating:5.0, bio:'83 years old. Knows 200 recipes. Has never used a written recipe in her life.', experienceIds:['e5'] },
  { id:'h6', villageId:'bozhentsi', name:'Ivanka Koleva', rating:4.8, bio:'Born in the house she rents. Third generation hosting travelers.', experienceIds:['e6'] },
  { id:'h7', villageId:'leshten', name:'Vassil Angelov', rating:4.7, bio:'Former biology professor turned wilderness guide. Knows every trail by starlight.', experienceIds:['e7'] },
  { id:'h8', villageId:'zlatolist', name:'Fatme Ibrahimova', rating:4.9, bio:'Last practitioner of the Zlatolist kilim pattern. Teaches one student per year.', experienceIds:['e8'] },
  { id:'h9', villageId:'cherni-osam', name:'Stoyan Markov', rating:4.6, bio:'Park ranger for 22 years. Can identify 300 bird species by call alone.', experienceIds:['e9'] },
  { id:'h10', villageId:'dolene', name:'The Nestinar Family', rating:5.0, bio:'Hereditary fire-walkers. The ritual has been in their bloodline for 14 generations.', experienceIds:['e10'] },
];

export const EXPERIENCES: Experience[] = [
  { id:'e1', villageId:'shiroka-laka', name:'Gaida Workshop', type:'craft', price:35, duration:'3 days',
    hostId:'h1', description:'Craft and learn to play the Bulgarian bagpipe with a 9th-generation master. You will leave with an instrument you built yourself.',
    personalityWeights:[0.40, 0.20, 0.10, 0.15, 0.15] },
  { id:'e2', villageId:'shiroka-laka', name:'Rhodope Song Circle', type:'ceremony', price:15, duration:'1 evening',
    hostId:'h2', description:'Join the village women\'s choir for an evening of traditional polyphonic singing around an open fire.',
    personalityWeights:[0.10, 0.45, 0.25, 0.05, 0.15] },
  { id:'e3', villageId:'kovachevitsa', name:'Stone House Restoration', type:'volunteer', price:0, duration:'5 days',
    hostId:'h3', description:'Help restore a 200-year-old house using traditional lime mortar and stone techniques. Food and lodging provided.',
    personalityWeights:[0.10, 0.20, 0.15, 0.10, 0.45] },
  { id:'e4', villageId:'zheravna', name:'Revival Architecture Walk', type:'hike', price:20, duration:'4 hours',
    hostId:'h4', description:'Walk through 80 protected National Revival-era houses with a historian who has spent 30 years documenting them.',
    personalityWeights:[0.30, 0.15, 0.30, 0.10, 0.15] },
  { id:'e5', villageId:'zheravna', name:'Traditional Cooking with Baba Marta', type:'cooking', price:45, duration:'2 days',
    hostId:'h5', description:'Learn 12 traditional Balkan recipes using a wood-fired stove. Baba Marta has never written a recipe down in 83 years.',
    personalityWeights:[0.05, 0.40, 0.35, 0.05, 0.15] },
  { id:'e6', villageId:'bozhentsi', name:'Medieval Immersion Homestay', type:'homestay', price:25, duration:'3 nights',
    hostId:'h6', description:'Live as a villager. Morning goat milking, stone fence repair, evening storytelling by candlelight.',
    personalityWeights:[0.10, 0.20, 0.55, 0.05, 0.10] },
  { id:'e7', villageId:'leshten', name:'Rhodope Wilderness Trek', type:'hike', price:30, duration:'2 days',
    hostId:'h7', description:'Off-trail multi-day trek through unmarked Rhodope wilderness. No marked paths. No other tourists. Just the ridge.',
    personalityWeights:[0.55, 0.05, 0.15, 0.20, 0.05] },
  { id:'e8', villageId:'zlatolist', name:'Last Kilim Pattern', type:'craft', price:20, duration:'1 day',
    hostId:'h8', description:'Learn the Zlatolist kilim weaving pattern from its last living practitioner. She teaches one student per year.',
    personalityWeights:[0.15, 0.25, 0.25, 0.05, 0.30] },
  { id:'e9', villageId:'cherni-osam', name:'Bear Territory Dawn Walk', type:'hike', price:40, duration:'1 day',
    hostId:'h9', description:'Pre-dawn hike into brown bear habitat with a 22-year park ranger. See the Balkan wilderness before the world wakes.',
    personalityWeights:[0.40, 0.05, 0.20, 0.30, 0.05] },
  { id:'e10', villageId:'dolene', name:'Nestinarstvo Fire Walk', type:'ceremony', price:50, duration:'1 night',
    hostId:'h10', description:'Witness (or participate in) the hereditary fire-walking ritual practiced by one family for 14 generations. Once-a-year event.',
    personalityWeights:[0.20, 0.30, 0.15, 0.25, 0.10] },
];

export function patchDataArrays(data: Record<string, unknown>, opts: { replace?: boolean } = {}) {
  const hasNewVillages = Array.isArray(data.villages) && (data.villages as unknown[]).length > 0;
  const hasNewExperiences = Array.isArray(data.experiences) && (data.experiences as unknown[]).length > 0;

  if (hasNewVillages) {
    if (opts.replace) {
      VILLAGES.splice(0, VILLAGES.length, ...(data.villages as Village[]));
      // Full seed replacement: if new villages arrived with no experiences, clear stale
      // experiences so the discover page doesn't show cards with mismatched village IDs.
      if (!hasNewExperiences) {
        EXPERIENCES.splice(0, EXPERIENCES.length);
      }
    } else {
      // Merge: add/update by id, keep existing villages not in the new set
      const byId = new Map(VILLAGES.map(v => [v.id, v]));
      for (const v of data.villages as Village[]) byId.set(v.id, v);
      VILLAGES.splice(0, VILLAGES.length, ...byId.values());
    }
  }
  if (hasNewExperiences) {
    const exps = (data.experiences as Record<string, unknown>[]).map(e => ({
      id: e.id,
      villageId: e.village_id ?? e.villageId,
      name: (e.title ?? e.name) as string,
      type: e.type as Experience['type'],
      price: (e.price_eur ?? e.price ?? 0) as number,
      duration: e.duration_h ? `${e.duration_h}h` : (e.duration ?? ''),
      hostId: (e.host_id ?? e.hostId ?? '') as string,
      description: (e.description ?? '') as string,
      personalityWeights: (e.personality_weights ?? [0.2, 0.2, 0.2, 0.2, 0.2]) as [number,number,number,number,number],
      isFree: e.isFree as boolean | undefined,
      isActive: e.isActive as boolean | undefined,
      spotsRemaining: e.spotsRemaining as number | undefined,
      startDate: e.startDate as string | undefined,
      endDate: e.endDate as string | undefined,
    })) as Experience[];
    if (opts.replace) {
      EXPERIENCES.splice(0, EXPERIENCES.length, ...exps);
    } else {
      // Merge: add/update by id, keep existing entries that aren't in the new set
      const byId = new Map(EXPERIENCES.map(e => [e.id, e]));
      for (const e of exps) byId.set(e.id as string, e);
      EXPERIENCES.splice(0, EXPERIENCES.length, ...byId.values());
    }
  }
  if (Array.isArray(data.hosts) && data.hosts.length) {
    const hosts = (data.hosts as Record<string, unknown>[]).map(h => ({
      id: h.id,
      villageId: (h.village_id ?? h.villageId) as string,
      name: h.name as string,
      bio: (h.bio ?? '') as string,
      rating: (h.rating ?? 4.5) as number,
      experienceIds: (h.experienceIds ?? h.experience_ids ?? []) as string[],
    })) as Host[];
    HOSTS.splice(0, HOSTS.length, ...hosts);
  }
}
