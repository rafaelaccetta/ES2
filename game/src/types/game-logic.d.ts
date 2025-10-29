declare module '../../game-logic/GameManager.js' {
  import { Player } from '../../game-logic/Player.js';

  export class GameManager {
    constructor(players: Player[]);
    players: Player[];
    turnsPerRound: number;
    round: number;
    turn: number;
    PhaseNames: string[];
    PhaseIdx: number;
    gameMap: any;
    getPhaseName(): string;
    getPlayerPlaying(): Player;
    passPhase(): void;
    distributeObjectives(objectives: any[]): void;
  }
}

declare module '../../game-logic/Player.js' {
  export class Player {
    constructor(id: number, color: string, objective?: any);
    id: number;
    color: string;
    objective: any;
    territories: string[];
    cards: string[];
    armies: number;
    isActive: boolean;
    territoriesArmies: Record<string, number>;
    addTerritory(territory: string): void;
    removeTerritory(territory: string): void;
    addCard(card: string): void;
    addArmies(territory: string, quantity: number): void;
    removeArmies(): void;
    deactivate(): void;
    activate(): void;
  }
}

// Also provide declarations for imports without the explicit .js extension
declare module '../../game-logic/GameManager' {
  import { Player } from '../../game-logic/Player';

  export class GameManager {
    constructor(players: Player[]);
    players: Player[];
    turnsPerRound: number;
    round: number;
    turn: number;
    PhaseNames: string[];
    PhaseIdx: number;
    gameMap: any;
    getPhaseName(): string;
    getPlayerPlaying(): Player;
    passPhase(): void;
    distributeObjectives(objectives: any[]): void;
  }
}

declare module '../../game-logic/Player' {
  export class Player {
    constructor(id: number, color: string, objective?: any);
    id: number;
    color: string;
    objective: any;
    territories: string[];
    cards: string[];
    armies: number;
    isActive: boolean;
    territoriesArmies: Record<string, number>;
    addTerritory(territory: string): void;
    removeTerritory(territory: string): void;
    addCard(card: string): void;
    addArmies(territory: string, quantity: number): void;
    removeArmies(): void;
    deactivate(): void;
    activate(): void;
  }
}

// Fallback for other JS modules in game-logic folder if needed
// Note: avoid a broad wildcard module that only exposes a default export,
// which would break named imports. Specific modules are declared above.
