export const CLASS_NAMES: Record<number, string> = {
  1: 'Warrior',
  2: 'Paladin',
  3: 'Hunter',
  4: 'Rogue',
  5: 'Priest',
  6: 'Death Knight',
  7: 'Shaman',
  8: 'Mage',
  9: 'Warlock',
  11: 'Druid',
};

export const CLASS_COLORS: Record<number, string> = {
  1: 'text-class-warrior',
  2: 'text-class-paladin',
  3: 'text-class-hunter',
  4: 'text-class-rogue',
  5: 'text-class-priest',
  6: 'text-class-deathknight',
  7: 'text-class-shaman',
  8: 'text-class-mage',
  9: 'text-class-warlock',
  11: 'text-class-druid',
};

export function getClassName(classId: number): string {
  return CLASS_NAMES[classId] || `Class ${classId}`;
}

export function getClassColor(classId: number): string {
  return CLASS_COLORS[classId] || 'text-gray-300';
}
