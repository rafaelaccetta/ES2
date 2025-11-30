import { GameMap } from './GameMap.js';
import { CardManager } from './CardManager.js';

export class GameManager {
    constructor(players, cardManager = null) {
        
        this.players = players;
        this.turnsPerRound = this.players.length;
        this.round = 0;
        this.turn = 0;
        this.PhaseNames = ["REFORÇAR", "ATACAR", "FORTIFICAR"];
        this.PhaseIdx = 0;
        this.conqueredThisRound = false; // Rastreia se o jogador conquistou território nesta rodada de ataque
        this.cardManager = cardManager instanceof CardManager ? cardManager : null;
        this.lastAwardedCard = null; // Guarda carta concedida ao final da fase de ataque
        this.initializeGame()

    }
    
    initializeGame(){
        this.players.sort(() => Math.random() - 0.5); 
        this.gameMap = new GameMap();
        
        // Distribuir territórios automaticamente
        this.gameMap.distributeTerritories(this.players);
        
        // Preparar reforços do primeiro jogador (rodada 0)
        this.#prepareReinforcements();
    }
    
    getPhaseName() {
        return this.PhaseNames[this.PhaseIdx];
    }

    getPlayerPlaying() {
        return this.players[this.turn];
    }

    passPhase() {
        // Se está saindo da fase de FORTIFICAR (movimentação) e houve conquista na rodada, dar 1 carta
        if (this.getPhaseName() === "FORTIFICAR") {
            if (this.conqueredThisRound && this.cardManager) {
                const player = this.getPlayerPlaying();
                const card = this.cardManager.awardConquestCard(player);
                if (card) {
                    this.lastAwardedCard = card;
                }
            }
            this.conqueredThisRound = false;
        }

        // RODADA 0 (primeira rodada): só permite REFORÇAR, depois vai pro próximo jogador
        if (this.round === 0 && this.getPhaseName() === "REFORÇAR") {
            this.#passTurn();
            this.#prepareReinforcements();
            return;
        }

        // Verificar se pode sair de REFORÇAR (bloqueio de 5+ cartas)
        if (this.getPhaseName() === "REFORÇAR" && this.getPlayerPlaying().cards.length >= 5) {
            console.warn("Cannot pass REINFORCE phase: player has 5 cards and must trade cards in.")
            return;
        }

        // Avança para próxima fase
        this.PhaseIdx++;
        
        // Se completou todas as fases, volta para REFORÇAR do próximo jogador
        if (this.PhaseIdx > this.PhaseNames.length - 1) {
            this.PhaseIdx = 0;
            this.#passTurn();
            this.#prepareReinforcements();
        }
    }
    
    markTerritoryConquered() {
        this.conqueredThisRound = true;
    }

    consumeLastAwardedCard() {
        const c = this.lastAwardedCard;
        this.lastAwardedCard = null;
        return c;
    }

    calculateReinforcements(player){
        if (!player) return 0;
        
        // Bônus base de territórios: número de territórios dividido por 2 (mínimo 3)
        const territoryBonus = Math.max(3, Math.floor(player.territories.length / 2));
        
        // Bônus de continentes conquistados (usando método real do calculateContinentBonus)
        const continentBonuses = this.calculateContinentBonus(player);
        const continentBonus = Object.values(continentBonuses).reduce((sum, bonus) => sum + bonus, 0);
        
        const total = territoryBonus + continentBonus;
        console.log(`Reforços calculados para jogador ${player.id}: ${player.territories.length} territórios = ${territoryBonus}, continentes = ${continentBonus}, total = ${total}`);
        return total;
    }

    #prepareReinforcements(){
        const p = this.getPlayerPlaying();
        if (!p) return;
        p.pendingReinforcements = this.calculateReinforcements(p);
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

    moveArmies(territoryFromString, territoryToString, amountArmies) {
        let player = this.getPlayerPlaying();
        const ownsFrom = player.hasTerritory(territoryFromString);
        const ownsTo = player.hasTerritory(territoryToString);
        if (!ownsFrom || !ownsTo) {
            console.log("Movimento falhou: ao menos um território não pertence ao player.");
            return false;
        }

        if (!this.gameMap.areAdjacent(territoryToString, territoryFromString)) {
            console.log("Movimento falhou: territórios não são adjacentes.")
            return false;
        }

        const armiesOnFrom = this.gameMap.armies[territoryFromString];
        
        if (armiesOnFrom <= amountArmies) {
            console.log(`Movimento falhou: tropas insuficientes em ${territoryFromString}. Deve sobrar ao menos 1.`);
            return false;
        }

        try {
            this.gameMap.removeArmy(territoryFromString, amountArmies);
            this.gameMap.addArmy(territoryToString, amountArmies);

            console.log(`Move successful: ${amountArmies} armies moved from ${territoryFromString} to ${territoryToString}.`);
            return true;

        } catch (error) {
            console.error("Move failed with an unexpected error:", error.message);
            return false;
        }
    }
    
    calculateContinentBonus(player) {
        const territoriesByContinent = this.gameMap.getTerritoriesByContinent();
        const continentBonuses = {};

        const continentNames = Object.keys(territoriesByContinent);

        for (const continentName of continentNames) {
            const hasConquered = player.hasConqueredContinent(continentName, territoriesByContinent);
            
            if (hasConquered) {
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

    calculateReinforcementTroops(player) {
        let territoryBonus = Math.max(3, Math.floor(player.territories.length / 2));
        
        const continentBonuses = this.calculateContinentBonus(player);
        let continentBonus = Object.values(continentBonuses).reduce((sum, bonus) => sum + bonus, 0);
        
        let cardBonus = 0;
        
        const totalTroops = territoryBonus + continentBonus + cardBonus;
        
        return {
            territoryBonus,
            continentBonus,
            continentBonuses,
            cardBonus,
            totalTroops
        };
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

