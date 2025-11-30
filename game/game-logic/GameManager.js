import { CardManager } from './CardManager.js';
import { GameMap } from './GameMap.js';
import { WarAI } from './WarAI.js';

export class GameManager {
    constructor(players, cardManager = null) {

        this.players = players;
        this.AIs = [];
        this.turnsPerRound = this.players.length;
        this.round = 0;
        this.turn = 0;
        this.PhaseNames = ["REFORÇAR", "ATACAR", "FORTIFICAR"];
        this.PhaseIdx = 0;
        this.logs = [];
        this.conqueredThisRound = false;
        this.cardManager = cardManager instanceof CardManager ? cardManager : null;
        this.lastAwardedCard = null;
        this.initializeGame();
    }

    initializeGame() {
        this.players.sort(() => Math.random() - 0.5);
        this.gameMap = new GameMap();
        this.gameMap.distributeTerritories(this.players);

        // Initial reinforcements calculation
        const p = this.getPlayerPlaying();
        if (p) {
            const amount = this.calculateReinforcements(p);
            p.addArmies(amount); // Direct add to reserve
        }

        this.logAction("Jogo Inicializado. Territórios distribuídos.");
    }

    logAction(message) {
        const logEntry = {
            turn: this.turn,
            round: this.round,
            phase: this.getPhaseName(),
            message: message,
            timestamp: Date.now()
        };
        this.logs.push(logEntry);
    }

    getLogs() {
        return this.logs;
    }

    getPhaseName() {
        return this.PhaseNames[this.PhaseIdx];
    }

    getPlayerPlaying() {
        return this.players[this.turn];
    }

    passPhase() {
        const currentPlayer = this.getPlayerPlaying();
        console.log(this.logs)

        if (this.getPhaseName() === "FORTIFICAR") {
            if (this.conqueredThisRound && this.cardManager) {
                const player = currentPlayer;
                const card = this.cardManager.awardConquestCard(player);
                if (card) {
                    this.lastAwardedCard = card;
                }
            }
            this.conqueredThisRound = false;
        }

        // Round 0 logic
        if (this.round === 0 && this.getPhaseName() === "REFORÇAR") {
            this.#passTurn();
            return;
        }

        this.PhaseIdx++;
        if (this.getPhaseName() === "REFORÇAR" && this.getPlayerPlaying().cards.length >= 5) {
            if (currentPlayer.cards.length >= 5) {
                console.warn("Cannot pass REINFORCE phase: player has 5 cards and must trade cards in.")
                this.PhaseIdx--;
                return
            }
        }
        if (this.PhaseIdx > this.PhaseNames.length - 1) {
            this.PhaseIdx = 0;
            this.#passTurn();
        } else {
            if (currentPlayer.isAI) {
                this.executeAITurn();
            }
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

    calculateReinforcements(player) {
        if (!player) return 0;
        const territoryBonus = Math.max(3, Math.floor(player.territories.length / 2));
        const continentBonuses = this.calculateContinentBonus(player);
        const continentBonus = Object.values(continentBonuses).reduce((sum, bonus) => sum + bonus, 0);
        const total = territoryBonus + continentBonus;
        console.log(`Reinforcements for ${player.id}: ${total} (Terr: ${territoryBonus}, Cont: ${continentBonus})`);
        return total;
    }

    #passTurn() {
        this.turn = (this.turn + 1) % this.turnsPerRound;
        if (this.turn === 0) {
            this.#passRound();
        }

        const nextPlayer = this.getPlayerPlaying();
        this.logAction(`Turno iniciado para o Jogador ${nextPlayer.id} (${nextPlayer.color})`);

        if (nextPlayer.isActive) {
            let armiesToAdd = this.calculateReinforcements(nextPlayer);
            nextPlayer.addArmies(armiesToAdd); // Add to reserve
            this.logAction(`Jogador ${nextPlayer.id} recebeu ${armiesToAdd} exércitos de reforço.`);
        }

        if (nextPlayer.isAI && nextPlayer.isActive) {
            this.executeAITurn();
        }
    }

    #passRound() {
        this.round++;
        console.log(`🔄 Nova rodada iniciada: Rodada ${this.round}`);
        this.logAction(`Rodada ${this.round} iniciada.`);
    }

    // =================================================================
    // AI LOGIC
    // =================================================================

    executeAITurn() {
        const player = this.getPlayerPlaying();
        const ai = this.AIs.find(ai => ai && ai.myId === player.id);

        if (!ai) return;

        const phase = this.getPhaseName();

        if (phase === "REFORÇAR") {
            this.logAction(`IA ${player.color} iniciando fase de Reforço.`);
            this.executeAIPlacement(ai, player);
            this.passPhase();
        } else if (phase === "ATACAR") {
            this.logAction(`IA ${player.color} iniciando fase de Ataque.`);
            this.executeAIAttack(ai);
            this.passPhase();
        } else if (phase === "FORTIFICAR") {
            this.logAction(`IA ${player.color} iniciando fase de Fortificação.`);
            this.executeAIFortification(ai);
            this.passPhase();
        }
    }

    executeAIPlacement(ai, player) {
        let safetyCounter = 0;
        const MAX_LOOPS = 200;

        while (player.armies > 0) {
            safetyCounter++;
            if (safetyCounter > MAX_LOOPS) {
                console.warn("AI Placement forced break: Infinite loop detected.");
                break;
            }
            if (player.territories.length === 0) break;

            // Handle Exclusive Armies (Card Exchange)
            let forcedTerritory = null;
            if (player.armiesExclusiveToTerritory.size > 0) {
                for (const [terrId, amount] of player.armiesExclusiveToTerritory.entries()) {
                    if (amount > 0 && player.hasTerritory(terrId)) {
                        forcedTerritory = terrId;
                        player.removeArmiesExclusive(terrId, 1);
                        break;
                    }
                }
            }

            let territoryId = forcedTerritory;
            if (!territoryId) {
                territoryId = ai.decidePlacement(this);
            }

            if (territoryId && player.hasTerritory(territoryId)) {
                player.removeArmies(1);
                this.gameMap.addArmy(territoryId, 1);
            } else {
                // Fallback
                const randomIdx = Math.floor(Math.random() * player.territories.length);
                const randomTerritory = player.territories[randomIdx];
                if (randomTerritory) {
                    player.removeArmies(1);
                    this.gameMap.addArmy(randomTerritory, 1);
                } else {
                    break;
                }
            }
        }
    }

    executeAIAttack(ai) {
        let keepAttacking = true;
        let attacksPerformed = 0;
        const MAX_ATTACKS = 10;

        while (keepAttacking && attacksPerformed < MAX_ATTACKS) {
            const attackOrder = ai.decideAttack(this);

            if (attackOrder) {
                const result = this.resolveAttack(attackOrder.from, attackOrder.to);
                if (result.success) {
                    attacksPerformed++;
                } else {
                    keepAttacking = false;
                }
            } else {
                keepAttacking = false;
            }
        }
    }

    executeAIFortification(ai) {
        const move = ai.decideFortification(this);
        if (move) {
            this.moveTroops(move.from, move.to, move.numTroops);
        }
    }

    // =================================================================
    // GAME RULES & ACTIONS
    // =================================================================

    resolveAttack(fromId, toId) {
        const neighbors = this.getNeighbors(fromId);
        if (!neighbors.includes(toId)) {
            console.error(`Movimento inválido: ${fromId} não é vizinho de ${toId}`);
            return {success: false, conquered: false};
        }

        const attackerTroops = this.gameMap.getArmies(fromId);
        const defenderTroops = this.gameMap.getArmies(toId);
        const ownerAttacker = this.getTerritoryOwner(fromId);
        const ownerDefender = this.getTerritoryOwner(toId);

        if (attackerTroops <= 1) return {success: false, conquered: false};

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

        // Apply losses to MAP
        if (attackLosses > 0) {
            this.gameMap.removeArmy(fromId, attackLosses);
        }

        if (defenseLosses > 0) {
            const currentDefenderArmies = this.gameMap.getArmies(toId);
            if (currentDefenderArmies - defenseLosses <= 0) {
                this.gameMap.setArmies(toId, 0);
            } else {
                this.gameMap.removeArmy(toId, defenseLosses);
            }
        }

        this.logAction(`Ataque ${fromId}->${toId}. Dados: A[${attackRolls}] D[${defenseRolls}]. Perdas: A-${attackLosses} D-${defenseLosses}.`);

        let conquered = false;

        if (this.gameMap.getArmies(toId) === 0) {
            conquered = true;
            this.dominate(ownerAttacker, ownerDefender, toId);
            this.logAction(`Território ${toId} CONQUISTADO por ${ownerAttacker.color}!`);

            this.gameMap.removeArmy(fromId, 1);
            this.gameMap.addArmy(toId, 1);
        }

        return {
            success: true,
            conquered: conquered,
            attackLosses,
            defenseLosses
        };
    }

    moveTroops(fromId, toId, amount) {
        const neighbors = this.getNeighbors(fromId);
        if (!neighbors.includes(toId)) return false;

        const fromTroops = this.gameMap.getArmies(fromId);
        if (fromTroops > amount) {
            this.gameMap.removeArmy(fromId, amount);
            this.gameMap.addArmy(toId, amount);
            this.logAction(`Manobra: Moveu ${amount} tropas de ${fromId} para ${toId}.`);
            return true;
        }
        return false;
    }

    moveArmies(territoryFromString, territoryToString, amountArmies) {
        return this.moveTroops(territoryFromString, territoryToString, amountArmies);
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
                    continentBonuses[continentName] = this.gameMap.continents[continentAbbreviation].bonus;
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
        this.AIs = this.players.map(p => p.isAI ? new WarAI(p.id, p.objective) : null);
    }

    dominate(winner, loser, territoryId) {
        loser.removeTerritory(territoryId);
        winner.addTerritory(territoryId);
    }

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
                    from: {id: source, troops: sourceTroops},
                    to: {id: enemy.id, troops: enemy.troops, ownerId: enemy.ownerId}
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