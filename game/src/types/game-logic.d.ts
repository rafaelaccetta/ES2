// Updated to reflect the refactored backend logic.

// --- GAME LOGIC CLASSES ---

declare module '../../game-logic/Player.js' {
    import { Objective } from '../../game-logic/Objective.js';
    import { PlayerCards } from '../../game-logic/PlayerCards.js';

    export class Player {
        constructor(id: number, color: string, objective?: Objective | null, isAI?: boolean);
        id: number;
        color: string;
        objective: Objective | null;
        isAI: boolean;
        territories: string[];
        cards: PlayerCards[];
        armies: number; // Represents the "Reserve Pool"
        isActive: boolean;
        armiesExclusiveToTerritory: Map<string, number>;

        addTerritory(territory: string): void;
        removeTerritory(territory: string): void;
        getTerritoriesCount(): number;
        addCard(card: PlayerCards): void;
        hasConqueredContinent(continentName: string, territoriesByContinent: Record<string, string[]>): boolean;
        addArmies(amount: number): void;
        removeArmies(amount: number): void;
        hasArmies(amount: number): boolean;
        addArmiesExclusive(territoryName: string, amount: number): void;
        removeArmiesExclusive(territoryName: string, amount: number): void;
        hasTerritory(territoryName: string): boolean;
        deactivate(): void;
        activate(): void;
        checkWin(gameState: any): boolean;
    }
}

declare module '../../game-logic/GameManager.js' {
    import { Player } from '../../game-logic/Player.js';
    import { CardManager } from '../../game-logic/CardManager.js';
    import { GameMap } from '../../game-logic/GameMap.js';
    import { Objective } from '../../game-logic/Objective.js';

    export class GameManager {
        constructor(players: Player[], cardManager?: CardManager | null);
        players: Player[];
        cardManager: CardManager | null;
        round: number;
        turn: number;
        gameMap: GameMap;

        getPhaseName(): string;
        getPlayerPlaying(): Player;
        passPhase(): void;
        markTerritoryConquered(): void;
        consumeLastAwardedCard(): any | null;
        calculateReinforcements(player: Player): number;
        distributeObjectives(objectives: Objective[]): void;
        resolveAttack(fromId: string, toId: string, troopsCommitted?: number | null): { success: boolean; conquered: boolean; attackLosses: number; defenseLosses: number; attackRolls: number[]; defenseRolls: number[]; };
        moveTroops(fromId: string, toId: string, amount: number): boolean;
        getTerritoryArmies(territoryId: string): number;
        getTerritoryOwner(territoryId: string): Player | null;
        getNeighbors(territoryId: string): string[];
        isTerritoryLocked(territoryId: string): boolean;
        getFortificationBudget(territoryId: string): number;
    }
}

declare module '../../game-logic/CardManager.js' {
    import { Player } from '../../game-logic/Player.js';
    import { PlayerCards } from '../../game-logic/PlayerCards.js';

    export class CardManager {
        constructor();
        drawCardForPlayer(player: Player): PlayerCards | undefined;
        getNextExchangeBonus(): number;
        awardConquestCard(player: Player): PlayerCards | null;
        executeCardExchange(cards: PlayerCards[], player: Player): void;
        showDeckStatus(): void;
    }
}


// --- DATA STRUCTURES ---

declare module '../../game-logic/PlayerCards.js' {
    export class PlayerCards {
        name: string;
        geometricShape: string;
        constructor({ name, geometricShape }: { name: string; geometricShape: string });
    }
}

declare module '../../game-logic/Objective.js' {
    export class Objective {
        constructor(description: string, title?: string | null);
        description: string;
        title: string;
        checkWin(player: any, gameState: any): boolean;
    }
    export class EliminatePlayerObjective extends Objective {
        constructor(targetIdentifier: string | number, fallbackTerritories?: number, useFallback?: boolean, description?: string | null, title?: string | null);
        activateFallback(): void;
    }
    export class DominateContinentObjective extends Objective {
        constructor(continents?: string[], extraTerritories?: number, description?: string | null, title?: string | null);
    }
    export class TerritoryControlObjective extends Objective {
        constructor(requiredTerritories: number, description?: string | null, title?: string | null);
    }
    export function createObjectiveFromJson(obj: any): Objective | null;
}


// --- UTILITIES ---

declare module '../../game-logic/Util.js' {
    export class Graph {
        constructor();
        addVertex(vertex: any): void;
        addEdge(vertex1: any, vertex2: any): void;
        getNeighbors(vertex: any): { node: any }[];
    }
}