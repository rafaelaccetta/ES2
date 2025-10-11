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

    // PRA QUEM ESTIVER REVISANDO, a nossa estrutura de json dos continentes faz sentido? por que a gente não coloca esses bônus direto no json dos continentes? lá só tem o mapeamento de abreviação e nome completo
    // não sei nada de arquitetura de projeto assim, é uma dúvida real
    getContinentBonusForPlayer(player) {
        // verificar se um jogador domina algum continente e retornar o bônus
        const territoriesByContinent = this.getTerritoriesByContinent();
        let bonus = 0;

        const continentBonuses = {
            "South America": 2,
            "North America": 5,
            "Africa": 3,
            "Europe": 5,
            "Asia": 7,
            "Oceania": 2
        };

        for (const continent of this.continents) {
            if (player.hasConqueredContinent(continent.name, territoriesByContinent)) {
                bonus += continentBonuses[continent.name] || 0;
            }
        }
        return bonus;
    }

    // Distributes objective cards to players
    distributeObjectives(objectives) {
        objectives = objectives.sort(() => Math.random() - 0.5);
        for (let i = 0; i < this.players.length; i++) {
            this.players[i].objective = objectives[i];
        }
    }
}

