export interface Player {
  guid: number;
  name: string;
  race: number;
  class: number;
  gender: number;
  level: number;
  totaltime: number;
  online: number;
}

export interface OnlinePlayer {
  guid: number;
  name: string;
  race: number;
  class: number;
  gender: number;
  level: number;
  zone: number;
  online: number;
}

export interface OnlinePlayersResponse {
  count: number;
  players: OnlinePlayer[];
}

export interface PlayerDetail {
  guid: number;
  name: string;
  race: number;
  class: number;
  gender: number;
  level: number;
  xp: number;
  money: number;
  totaltime: number;
  leveltime: number;
  online: number;
  zone: number;
  map: number;
  [key: string]: unknown;
}
