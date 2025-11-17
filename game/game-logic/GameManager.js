import { GameMap } from './GameMap.js'; 

export class GameManager {
    constructor(players) {
        
        this.players = players;
        this.turnsPerRound = this.players.length;
        this.round = 0;
        this.turn = 0;
        this.PhaseNames = ["REFORÇAR", "ATACAR", "FORTIFICAR"];
        this.PhaseIdx = 0;
        this.initializeGame()
        this.gameMap = new GameMap();

    }
    
    initializeGame(){
        this.players.sort(() => Math.random() - 0.5); // shuffles player order
        // future game initialization and turn 0 logic is probably going here
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
        // Na primeira rodada (round 0), só permite a fase REFORÇAR
        if (this.round === 0 && this.getPhaseName() === "REFORÇAR") {
            console.log(`🎯 Primeira rodada: Jogador ${this.turn} terminou REFORÇAR, pulando para próximo jogador`);
            // Pula direto para o próximo jogador após reforçar na primeira rodada
            this.PhaseIdx = 0; // Reset para REFORÇAR
            this.#passTurn();
            return;
        }
        
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
        console.log(`🔄 Nova rodada iniciada: Rodada ${this.round}`);
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

