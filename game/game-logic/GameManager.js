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
        this.gameMap = new GameMap();
        this.initializeGame();
    }
    initializeGame(){
        this.players.sort(() => Math.random() - 0.5);
        this.gameMap = new GameMap();
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
        if (this.getPhaseName() === "REFORÇAR"){
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
        this.AIs = this.players.map(p => p.isAI ? new WarAI(p.id, p.objective) : null);
    }

    dominate(winner, loser, territoryId) {
        loser.removeTerritory(territoryId);
        winner.addTerritory(territoryId);
    }

    // =================================================================
    // AÇÕES DE JOGO (RESOLUÇÃO DE REGRAS)
    // =================================================================

    /**
     * Resolve um ataque entre dois territórios.
     */
    resolveAttack(fromId, toId) {
        const attackerTroops = this.gameMap.getArmies(fromId);
        const defenderTroops = this.gameMap.getArmies(toId);
        const ownerAttacker = this.getTerritoryOwner(fromId);
        const ownerDefender = this.getTerritoryOwner(toId);

        if (attackerTroops <= 1) return { success: false, conquered: false };

        // Definição de dados (3 max ataque, 3 max defesa)
        const attackDiceCount = Math.min(3, attackerTroops - 1);
        const defenseDiceCount = Math.min(3, defenderTroops);

        const attackRolls = Array.from({length: attackDiceCount}, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
        const defenseRolls = Array.from({length: defenseDiceCount}, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);

        let attackLosses = 0;
        let defenseLosses = 0;

        const comparisons = Math.min(attackRolls.length, defenseRolls.length);

        for (let i = 0; i < comparisons; i++) {
            if (attackRolls[i] > defenseRolls[i]) {
                defenseLosses++;
            } else {
                attackLosses++;
            }
        }

        this.gameMap.removeArmy(fromId, attackLosses);
        this.gameMap.removeArmy(toId, defenseLosses);

        let conquered = false;
        if (this.gameMap.getArmies(toId) === 0) {
            conquered = true;
            this.dominate(ownerAttacker, ownerDefender, toId);
            // Move 1 tropa obrigatoriamente
            this.moveTroops(fromId, toId, 1);
        }

        return {
            success: true,
            conquered: conquered,
            attackLosses,
            defenseLosses
        };
    }

    moveTroops(fromId, toId, amount) {
        const fromTroops = this.gameMap.getArmies(fromId);
        if (fromTroops > amount) { // Deve sobrar pelo menos 1
            this.gameMap.removeArmy(fromId, amount);
            this.gameMap.addArmy(toId, amount);
            return true;
        }
        return false;
    }

    // =================================================================
    // MÉTODOS AUXILIARES
    // =================================================================

    getTerritoryArmies(territoryId) {
        return this.gameMap.getArmies(territoryId);
    }

    getNeighbors(territoryId) {
        const neighbors = this.gameMap.territories.getNeighbors(territoryId) || [];
        return neighbors.map(n => n.node);
    }

    getEnemyNeighbors(territoryId, playerId) {
        const neighbors = this.getNeighbors(territoryId);
        return neighbors
            .map(neighborId => {
                const owner = this.players.find(p => p.territories.includes(neighborId));
                if (!owner || owner.id === playerId) return null;
                return {
                    id: neighborId,
                    ownerId: owner.id,
                    troops: this.gameMap.getArmies(neighborId)
                };
            })
            .filter(n => n !== null);
    }

    getFriendlyNeighbors(territoryId, playerId) {
        const neighbors = this.getNeighbors(territoryId);
        const player = this.players.find(p => p.id === playerId);
        if (!player) return [];

        return neighbors
            .filter(neighborId => player.territories.includes(neighborId))
            .map(neighborId => ({
                id: neighborId,
                troops: this.gameMap.getArmies(neighborId)
            }));
    }

    getAllPossibleAttacks(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return [];

        const possibleAttacks = [];
        player.territories.forEach(source => {
            const sourceTroops = this.gameMap.getArmies(source);
            if (sourceTroops <= 1) return;

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

    isFrontline(territoryId, playerId) {
        return this.getEnemyNeighbors(territoryId, playerId).length > 0;
    }

    getTerritoryOwner(territoryId) {
        return this.players.find(p => p.territories.includes(territoryId)) || null;
    }

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