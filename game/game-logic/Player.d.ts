export class Player {
    id: number;
    color: string;
    objective: any;
    territories: string[];
    territoriesArmies: Record<string, number>;
    armies: number;
    constructor(id: number, color: string, objective?: any);
    getTerritoriesCount(): number;
    hasConqueredContinent(continentName: string, territoriesByContinent: Record<string, string[]>): boolean;
}
