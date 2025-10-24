import { GameMap } from './GameMap.js';

export class GameManager {
    constructor(players) {
        
        this.players = players;
        this.turnsPerRound = this.players.length;
        this.round = 0;
        this.turn = 0;
        this.PhaseNames = ["REFORÇAR", "ATACAR", "FORTIFICAR"];
        this.PhaseIdx = 0;
        this.gameMap = new GameMap();
        
        // Distribuir territórios automaticamente
        this.gameMap.distributeTerritories(this.players);
    }

    getPhaseName() {
        return this.PhaseNames[this.PhaseIdx];
    }

    getPlayerPlaying() {
        return this.players[this.turn];
    }

    passPhase() {
        this.PhaseIdx++;
        if (this.PhaseIdx > this.PhaseNames.length - 1) {
            this.PhaseIdx = 0;
            this.#passTurn();
        }
    }

    #passTurn() {
        this.turn = (this.turn + 1) % this.turnsPerRound;
        if (this.turn === 0) {
            this.#passRound();
        }
    }

    #passRound() {
        this.round++;
    }

    distributeObjectives(objectives) {
        objectives = objectives.sort(() => Math.random() - 0.5);
        for (let i = 0; i < this.players.length; i++) {
            this.players[i].objective = objectives[i];
        }
    }
}

