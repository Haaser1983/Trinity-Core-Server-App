export const RACE_NAMES: Record<number, string> = {
  1: 'Human',
  2: 'Orc',
  3: 'Dwarf',
  4: 'Night Elf',
  5: 'Undead',
  6: 'Tauren',
  7: 'Gnome',
  8: 'Troll',
  10: 'Blood Elf',
  11: 'Draenei',
};

export const RACE_FACTION: Record<number, 'Alliance' | 'Horde'> = {
  1: 'Alliance',
  2: 'Horde',
  3: 'Alliance',
  4: 'Alliance',
  5: 'Horde',
  6: 'Horde',
  7: 'Alliance',
  8: 'Horde',
  10: 'Horde',
  11: 'Alliance',
};

export function getRaceName(raceId: number): string {
  return RACE_NAMES[raceId] || `Race ${raceId}`;
}

export function getFaction(raceId: number): 'Alliance' | 'Horde' {
  return RACE_FACTION[raceId] || 'Alliance';
}
