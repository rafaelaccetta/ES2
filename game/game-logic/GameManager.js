import { GameMap } from './GameMap.js'; 

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
        this.gameMap = new GameMap();

    }

    getPhaseName() {
        return this.PhaseNames[this.PhaseIdx];
    }

    getPlayerPlaying() {
        return this.players[this.turn];
    }

    passPhase() {
        this.PhaseIdx++;
        if (this.getPhaseName() === "REINFORCE"){ // ugly double if for now because its expected this will be a whole block
            if (this.getPlayerPlaying().cards.length >= 5){
                console.warn("Cannot pass REINFORCE phase: player has 5 cards and must trade cards in.")
                return
            }
        }
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

    calculateContinentBonus(player) {
        const territoriesByContinent = this.gameMap.getTerritoriesByContinent();
        const continentBonuses = {};

        const continentNames = Object.keys(territoriesByContinent);

        for (const continentName of continentNames) {
            if (player.hasConqueredContinent(continentName, territoriesByContinent)) {
                const continentAbbreviation = Object.keys(this.gameMap.continents).find(key => 
                    this.gameMap.continents[key].name === continentName
                );
 
                if (continentAbbreviation) {
                    const bonusValue = this.gameMap.continents[continentAbbreviation].bonus;
                    continentBonuses[continentName] = bonusValue;
                }
            }
        }
    return continentBonuses;
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

