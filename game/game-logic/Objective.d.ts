export interface IObjectiveJson {
    id?: number;
    type: string;
    title?: string;
    description?: string;
    target?: any;
}

export class Objective {
    description: string;
    title: string;
    constructor(description?: string);
    checkWin(player: any, gameState: any): boolean;
}

export class EliminatePlayerObjective extends Objective {
    constructor(targetIdentifier: any, fallbackTerritories?: number, useFallback?: boolean, description?: string, title?: string);
}

export class DominateContinentObjective extends Objective {
    constructor(continents?: string[], extraTerritories?: number, description?: string, title?: string);
}

export class TerritoryControlObjective extends Objective {
    constructor(requiredTerritories: number, description?: string, title?: string);
}

export function createObjectiveFromJson(obj: IObjectiveJson): Objective | null;
