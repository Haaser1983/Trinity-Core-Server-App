export interface DbItem {
  entry: number;
  class: number;
  name: string;
  Quality: number;
  ItemLevel: number;
  RequiredLevel: number;
}

export interface DbItemDetail {
  entry: number;
  class: number;
  subclass: number;
  name: string;
  displayid: number;
  Quality: number;
  ItemLevel: number;
  RequiredLevel: number;
  [key: string]: unknown;
}

export enum ItemQuality {
  Poor = 0,
  Common = 1,
  Uncommon = 2,
  Rare = 3,
  Epic = 4,
  Legendary = 5,
  Artifact = 6,
  Heirloom = 7,
}
