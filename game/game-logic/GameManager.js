export class GameManager {
    constructor(players) {
        /*
         A match has multiple rounds
         A round has multiple turns, one for each player
         A turn has multiple phases, each with different possible plays
         
         Base zero is being used. Turn zero is the turn of the first player. 
         */
        this.players = players;
        this.turnsPerRound = this.players.length; // length of players array in the future
        this.round = 0;
        this.turn = 0;
        this.PhaseNames = ["REINFORCE", "ATTACK", "FORTIFY"];
        this.PhaseIdx = 0;
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
        // likely extra state handling code is going to be here in the future
        // so I put this function here already
    }

    // Distributes objective cards to players
    distributeObjectives(objectives) {
        objectives = objectives.sort(() => Math.random() - 0.5);
        for (let i = 0; i < this.players.length; i++) {
            this.players[i].objective = objectives[i];
        }
    }

    dominate(winner, loser, territory) {
        loser.removeTerritory(territory);
        winner.addTerritory(territory);
    }
}

