import { Player } from "./Player";
export class GameManager {
    players: Player[];
    round: number;
    turn: number;
    constructor(players: Player[]);
    getPhaseName(): string;
    getPlayerPlaying(): Player;
    passPhase(): void;
    distributeObjectives(objectives: any[]): void;
}
