declare module '../../game-logic/GameManager.js' {
declare module '../../game-logic/CardManager.js' {

declare module '../../game-logic/Combat.js' {


declare module '../../game-logic/Player.js' {
// Clean type declarations for backend game-logic modules

declare module '../../game-logic/Player.js' {
  export class Player {
    constructor(id: number, color: string, objective?: any);
    id: number;
    color: string;
    objective: any;
    territories: string[];
    cards: any[];
    armies: number;
    pendingReinforcements: number;
    isActive: boolean;
    territoriesArmies: Record<string, number>;
    addTerritory(territory: string): void;
    removeTerritory(territory: string): void;
    addCard(card: any): void;
    hasTerritory(name: string): boolean;
    addArmiesToPool(amount: number): void;
    addArmiesExclusive(territoryName: string, amount: number): void;
    addArmiesToTerritory(territory: string, quantity: number): void;
    addArmies(territory: string, quantity: number): void;
    spendPendingReinforcement(territory: string, amount?: number): boolean;
    hasPendingReinforcements(): boolean;
    removeArmies(): void;
    deactivate(): void;
    activate(): void;
  }
}

declare module '../../game-logic/CardManager.js' {
  import { Player } from '../../game-logic/Player.js';
  import { PlayerCards } from '../../game-logic/PlayerCards.js';
  export class CardManager {
    constructor();
    drawCardForPlayer(player: Player): PlayerCards | undefined;
    awardConquestCard(player: Player): PlayerCards | null;
    executeCardExchange(cards: PlayerCards[], player: Player): void;
    showDeckStatus(): void;
  }
}

declare module '../../game-logic/GameManager.js' {
  import { Player } from '../../game-logic/Player.js';
  import { CardManager } from '../../game-logic/CardManager.js';
  export class GameManager {
    constructor(players: Player[], cardManager?: CardManager | null);
    players: Player[];
    cardManager: CardManager | null;
    turnsPerRound: number;
    round: number;
    turn: number;
    PhaseNames: string[];
    PhaseIdx: number;
    conqueredThisRound: boolean;
    lastAwardedCard: any | null;
    gameMap: any;
    getPhaseName(): string;
    getPlayerPlaying(): Player;
    passPhase(): void;
    markTerritoryConquered(): void;
    distributeObjectives(objectives: any[]): void;
    consumeLastAwardedCard(): any;
    calculateReinforcements(player: Player): number;
  }
}

declare module '../../game-logic/Combat.js' {
  export default function resolveAttack(
    attackerCount: number,
    defenderCount: number
  ): {
    aDice: number[];
    dDice: number[];
    attackerLoss: number;
    defenderLoss: number;
  };
}

// Also provide declarations for imports without the explicit .js extension
declare module '../../game-logic/GameManager' {
  import { Player } from '../../game-logic/Player';
  import { CardManager } from '../../game-logic/CardManager';
  export class GameManager {
    constructor(players: Player[], cardManager?: CardManager | null);
    players: Player[];
    cardManager: CardManager | null;
    turnsPerRound: number;
    round: number;
    turn: number;
    PhaseNames: string[];
    PhaseIdx: number;
    conqueredThisRound: boolean;
    lastAwardedCard: any | null;
    gameMap: any;
    getPhaseName(): string;
    getPlayerPlaying(): Player;
    passPhase(): void;
    markTerritoryConquered(): void;
    distributeObjectives(objectives: any[]): void;
    consumeLastAwardedCard(): any;
    calculateReinforcements(player: Player): number;
  }
declare module '../../game-logic/CardManager' {
  import { Player } from '../../game-logic/Player';
  import { PlayerCards } from '../../game-logic/PlayerCards';

  export class CardManager {
    constructor();
    drawCardForPlayer(player: Player): PlayerCards | undefined;
    executeCardExchange(cards: PlayerCards[], player: Player): void;
    showDeckStatus(): void;
  }
}

declare module '../../game-logic/Combat' {
  export default function resolveAttack(
    attackerCount: number,
    defenderCount: number
  ): {
    aDice: number[];
    dDice: number[];
    attackerLoss: number;
    defenderLoss: number;
  };
}
// (Removed duplicate standalone GameManager declaration to avoid signature conflicts)

declare module '../../game-logic/Player' {
  export class Player {
    constructor(id: number, color: string, objective?: any);
    id: number;
    color: string;
    objective: any;
    territories: string[];
    cards: any[];
    armies: number;
    isActive: boolean;
    territoriesArmies: Record<string, number>;
    addTerritory(territory: string): void;
    removeTerritory(territory: string): void;
    addCard(card: any): void;
    hasTerritory(name: string): boolean;
    addArmies(territory: string, quantity: number): void;
    removeArmies(): void;
    deactivate(): void;
    activate(): void;
  }
}

// Fallback for other JS modules in game-logic folder if needed
// Note: avoid a broad wildcard module that only exposes a default export,
// which would break named imports. Specific modules are declared above.
