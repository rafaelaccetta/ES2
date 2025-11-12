import { GameMap } from './GameMap.js'; 
import { WarAI } from './WarAI.js';

export class GameManager {
    constructor(players) {
        
        this.players = players;
        this.AIs = [];
        this.turnsPerRound = this.players.length;
        this.round = 0;
        this.turn = 0;
        this.PhaseNames = ["REFORÇAR", "ATACAR", "FORTIFICAR"];
        this.PhaseIdx = 0;
        this.initializeGame()
        this.gameMap = new GameMap();
        
        // Distribuir territórios automaticamente
        this.gameMap.distributeTerritories(this.players);
    }
    
    
    initializeGame(){
        this.players.sort(() => Math.random() - 0.5); // shuffles player order
        // future game initialization and turn 0 logic is probably going here
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
        //tive que colocar aqui porque as IAs precisam do objetivo para o construtor. Não ficou ideal, mas foi o melhor que consegui pensar.
        this.AIs = this.players.map(p => p.isAI ? new WarAI(p.id, p.objective) : null);
    }

    dominate(winner, loser, territory) {
        loser.removeTerritory(territory);
        winner.addTerritory(territory);
    }

    // =================================================================
    // MÉTODOS AUXILIARES PARA IA
    // =================================================================

    /**
     * Retorna todos os vizinhos de um território (IDs dos territórios vizinhos)
     * @param {string} territoryId - ID do território
     * @returns {string[]} Array com IDs dos territórios vizinhos
     */
    getNeighbors(territoryId) {
        const neighbors = this.gameMap.territories.getNeighbors(territoryId) || [];
        return neighbors.map(n => n.node);
    }

    /**
     * Retorna os vizinhos inimigos de um território (que não pertencem ao jogador)
     * @param {string} territoryId - ID do território
     * @param {number} playerId - ID do jogador
     * @returns {Array<{id: string, ownerId: number, troops: number}>} Array com dados dos vizinhos inimigos
     */
    getEnemyNeighbors(territoryId, playerId) {
        const neighbors = this.getNeighbors(territoryId);
        return neighbors
            .map(neighborId => {
                const owner = this.players.find(p => p.territories.includes(neighborId));
                if (!owner || owner.id === playerId) return null;
                return {
                    id: neighborId,
                    ownerId: owner.id,
                    troops: owner.territoriesArmies[neighborId] || 0
                };
            })
            .filter(n => n !== null);
    }

    /**
     * Retorna os vizinhos que pertencem ao mesmo jogador
     * @param {string} territoryId - ID do território
     * @param {number} playerId - ID do jogador
     * @returns {Array<{id: string, troops: number}>} Array com dados dos vizinhos aliados
     */
    getFriendlyNeighbors(territoryId, playerId) {
        const neighbors = this.getNeighbors(territoryId);
        const player = this.players.find(p => p.id === playerId);
        if (!player) return [];

        return neighbors
            .filter(neighborId => player.territories.includes(neighborId))
            .map(neighborId => ({
                id: neighborId,
                troops: player.territoriesArmies[neighborId] || 0
            }));
    }

    /**
     * Retorna todos os ataques possíveis para um jogador
     * @param {number} playerId - ID do jogador
     * @returns {Array<{from: {id: string, troops: number}, to: {id: string, troops: number, ownerId: number}}>}
     */
    getAllPossibleAttacks(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return [];

        const possibleAttacks = [];
        player.territories.forEach(source => {
            const sourceTroops = player.territoriesArmies[source] || 0;
            if (sourceTroops <= 1) return; // Precisa de pelo menos 2 tropas para atacar

            const enemies = this.getEnemyNeighbors(source, playerId);
            enemies.forEach(enemy => {
                possibleAttacks.push({
                    from: { id: source, troops: sourceTroops },
                    to: { id: enemy.id, troops: enemy.troops, ownerId: enemy.ownerId }
                });
            });
        });

        return possibleAttacks;
    }

    /**
     * Verifica se um território está na fronteira (tem vizinhos inimigos)
     * @param {string} territoryId - ID do território
     * @param {number} playerId - ID do jogador
     * @returns {boolean}
     */
    isFrontline(territoryId, playerId) {
        return this.getEnemyNeighbors(territoryId, playerId).length > 0;
    }

    /**
     * Retorna o dono de um território
     * @param {string} territoryId - ID do território
     * @returns {Player|null}
     */
    getTerritoryOwner(territoryId) {
        return this.players.find(p => p.territories.includes(territoryId)) || null;
    }

    /**
     * Retorna o continente de um território
     * @param {string} territoryId - ID do território
     * @returns {object|null} Objeto com {key, name, bonus, territories}
     */
    getTerritoryContinent(territoryId) {
        for (const [contKey, continent] of Object.entries(this.gameMap.continents)) {
            if (continent.territories && continent.territories.includes(territoryId)) {
                return {
                    key: contKey,
                    name: continent.name,
                    bonus: continent.bonus,
                    territories: continent.territories
                };
            }
        }
        return null;
    }
}
