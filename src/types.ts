export interface Player {
  id: string;
  name: string;
  rating?: number;
  score: number;
  buchholz: number;
  opponents: string[]; // IDs of opponents already played
  colorHistory: ('W' | 'B')[];
  hadBye: boolean;
}

export interface Pairing {
  white: Player | null; // null if bye
  black: Player | null;
  result?: '1-0' | '0-1' | '0.5-0.5' | '1-0b'; // 1-0b for bye
}

export interface Round {
  number: number;
  pairings: Pairing[];
  isCompleted: boolean;
}

export interface TournamentState {
  players: Player[];
  rounds: Round[];
  currentRound: number;
}
