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
        this.conqueredThisRound = false; // Rastreia se o jogador conquistou território nesta rodada de ataque
        this.cardManager = cardManager instanceof CardManager ? cardManager : null;
        this.lastAwardedCard = null; // Guarda carta concedida ao final da fase de ataque
        this.initializeGame();
    }

    initializeGame() {
        //this.players.sort(() => Math.random() - 0.5);
        this.gameMap = new GameMap();
        // Distribuir territórios automaticamente
        this.gameMap.distributeTerritories(this.players);
        this.#prepareReinforcements();
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
        // Se está saindo da fase de FORTIFICAR (movimentação) e houve conquista na rodada, dar 1 carta
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

        // RODADA 0 (primeira rodada): só permite REFORÇAR, depois vai pro próximo jogador
        if (this.round === 0 && this.getPhaseName() === "REFORÇAR") {
            this.#passTurn();
            this.#prepareReinforcements();
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
            this.#prepareReinforcements();
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

        // Bônus base de territórios: número de territórios dividido por 2 (mínimo 3)
        const territoryBonus = Math.max(3, Math.floor(player.territories.length / 2));

        // Bônus de continentes conquistados (usando método real do calculateContinentBonus)
        const continentBonuses = this.calculateContinentBonus(player);
        const continentBonus = Object.values(continentBonuses).reduce((sum, bonus) => sum + bonus, 0);

        const total = territoryBonus + continentBonus;
        console.log(`Reforços calculados para jogador ${player.id}: ${player.territories.length} territórios = ${territoryBonus}, continentes = ${continentBonus}, total = ${total}`);
        return total;
    }

    #prepareReinforcements() {
        const p = this.getPlayerPlaying();
        if (!p) return;
        p.pendingReinforcements = this.calculateReinforcements(p);
    }

    #passTurn() {
        this.turn = (this.turn + 1) % this.turnsPerRound;
        if (this.turn === 0) {
            this.#passRound();
        }

        const nextPlayer = this.getPlayerPlaying();
        this.logAction(`Turno iniciado para o Jogador ${nextPlayer.id} (${nextPlayer.color})`);

        if (nextPlayer.isActive) {
            const territoriesCount = nextPlayer.territories.length;
            let armiesToAdd = Math.floor(territoriesCount / 2);
            if (armiesToAdd < 3) armiesToAdd = 3;

            const bonuses = this.calculateContinentBonus(nextPlayer);
            for (const bonus of Object.values(bonuses)) {
                armiesToAdd += bonus;
            }

            nextPlayer.addArmiesToPool(armiesToAdd);
            this.logAction(`Jogador ${nextPlayer.id} recebeu ${armiesToAdd} exércitos de reforço.`);
        }

        if (nextPlayer.isAI && nextPlayer.isActive) {
            this.executeAITurn();
        }
    }

    #passRound() {
        this.round++;
        console.log(`🔄 Nova rodada iniciada: Rodada ${this.round}`);
        // likely extra state handling code is going to be here in the future
        // so I put this function here already
        this.logAction(`Rodada ${this.round} iniciada.`);
    }

    // =================================================================
    // LÓGICA DA IA (EXECUÇÃO)
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
        player.pendingReinforcements = this.calculateReinforcements(player);
        while (player.pendingReinforcements > 0) {
            const territoryId = ai.decidePlacement(this);
            if (territoryId && player.hasTerritory(territoryId)) {
                player.pendingReinforcements -= 1;
                player.addArmiesToTerritory(territoryId, 1);
                this.logAction(`IA colocou 1 exército em ${territoryId}`);
            } else {
                const randomIdx = Math.floor(Math.random() * player.territories.length);
                const randomTerritory = player.territories[randomIdx];

                if (randomTerritory) {
                    player.pendingReinforcements -= 1;
                    player.addArmiesToTerritory(randomTerritory, 1);
                    this.logAction(`IA (fallback) colocou 1 exército em ${randomTerritory}`);
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

            // Log do ataque decidido
            console.log(`IA Player ${ai.myId} decidiu atacar:`, attackOrder);

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
    // AÇÕES DE JOGO (RESOLUÇÃO DE REGRAS)
    // =================================================================

    resolveAttack(fromId, toId) {

        // Console log do ataque sendo resolvido
        console.log(`Resolvendo ataque de ${fromId} para ${toId}`);
        // Neighbors
        console.log(`Vizinhos de ${fromId}:`, this.getNeighbors(fromId));

        const neighbors = this.getNeighbors(fromId);
        if (!neighbors.includes(toId)) {
            console.error(`Movimento inválido: ${fromId} não é vizinho de ${toId}`);
            return {success: false, conquered: false};
        }

        //We need to get troops from player's territory armies
        const ownerAttacker = this.getTerritoryOwner(fromId);
        const ownerDefender = this.getTerritoryOwner(toId);
        const attackerTroops = ownerAttacker.territoriesArmies[fromId] || 0;
        const defenderTroops = ownerDefender.territoriesArmies[toId] || 0;

        console.log(`Tropas do atacante em ${fromId}: ${attackerTroops}`);
        console.log(`Tropas do defensor em ${toId}: ${defenderTroops}`);

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

        //Console log dos resultados dos dados
        console.log(`Resultados dos dados - Atacante: [${attackRolls.join(', ')}], Defensor: [${defenseRolls.join(', ')}]`);
        console.log(`Perdas - Atacante: ${attackLosses}, Defensor: ${defenseLosses}`);

        // Aplicação das baixas
        if (attackLosses > 0) {
            ownerAttacker.territoriesArmies[fromId] -= attackLosses;
        }

        if (defenseLosses > 0) {
            const currentDefenderArmies = ownerDefender.territoriesArmies[toId];

            // CORREÇÃO: Se as perdas zerarem o exército, usamos setArmies para evitar o erro do removeArmy
            if (currentDefenderArmies - defenseLosses <= 0) {
                 ownerDefender.territoriesArmies[toId] = 0;
            } else {
                 ownerDefender.territoriesArmies[toId] -= defenseLosses;
            }
        }

        this.logAction(`Ataque de ${fromId} (${ownerAttacker.color}) para ${toId} (${ownerDefender.color}). 
            Dados: Atacante[${attackRolls.join(',')}] vs Defensor[${defenseRolls.join(',')}]. 
            Baixas: Atacante -${attackLosses}, Defensor -${defenseLosses}.`);

        let conquered = false;

        // Verifica conquista (agora possível pois permitimos 0 exércitos acima)
        if (ownerDefender.territoriesArmies[toId] === 0) {
            conquered = true;
            this.dominate(ownerAttacker, ownerDefender, toId);
            this.logAction(`Território ${toId} CONQUISTADO por ${ownerAttacker.color}!`);

            // Move 1 tropa obrigatoriamente do atacante para o conquistado
            ownerAttacker.territoriesArmies[fromId] -= 1;
            ownerAttacker.territoriesArmies[toId] += 1;
        }

        return {
            success: true,
            conquered: conquered,
            attackLosses,
            defenseLosses
        };
    }

    moveTroops(fromId, toId, amount) {

        console.log(`Tentando mover ${amount} tropas de ${fromId} para ${toId}`);

        const neighbors = this.getNeighbors(fromId);
        console.log(`Vizinhos de ${fromId}:`, neighbors);

        if (!neighbors.includes(toId)) {
            console.warn(`Manobra inválida: ${fromId} e ${toId} não são vizinhos.`);
            return false;
        }

        const owner = this.getTerritoryOwner(fromId);
        const fromTroops = owner.territoriesArmies[fromId]; 

        console.log(`Tropas disponíveis em ${fromId}: ${fromTroops}`);

        //Amount and fromTroops comparation
        console.log(`Comparando tropas para movimentação: solicitadas ${amount}, disponíveis ${fromTroops} (deve sobrar ao menos 1).`);

        if (fromTroops > amount) {
            owner.territoriesArmies[fromId] -= amount;
            owner.territoriesArmies[toId] += amount;
            this.logAction(`Manobra: Moveu ${amount} tropas de ${fromId} para ${toId}.`);
            console.log(`Manobra bem-sucedida: ${amount} tropas movidas de ${fromId} para ${toId}.`);
            console.log(`*Tropas em ${fromId}: ${owner.territoriesArmies[fromId]}, Tropas em ${toId}: ${owner.territoriesArmies[toId]}`);
            return true;
        }
        return false;
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
        this.AIs = this.players.map(p => p.isAI ? new WarAI(p.id, p.objective) : null);
    }

    dominate(winner, loser, territoryId) {
        loser.removeTerritory(territoryId);
        winner.addTerritory(territoryId);
    }

    getTerritoryArmies(territoryId) {
        const owner = this.getTerritoryOwner(territoryId);
        return owner.territoriesArmies[territoryId] || 0;
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
                troops: player.territoriesArmies[neighborId] || 0
            }));
    }

    getAllPossibleAttacks(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return [];

        //Log 
        console.log(`Calculando ataques possíveis para o jogador ${playerId} (${player.color})`);

        const possibleAttacks = [];
        player.territories.forEach(source => {

            // Log do território de origem sendo avaliado       
            console.log(`  Avaliando território ${source} com ${this.gameMap.getArmies(source)} tropas.`);

            const sourceTroops = player.territoriesArmies[source] || 0;

            // Log do estado atual de tropas por território do jogador
            console.log(`    Estado atual de tropas em territórios do jogador: ${player.territoriesArmies}`);

            console.log(`    Tropas disponíveis em ${source}: ${sourceTroops}`);
            if (sourceTroops >= 2){
                const enemies = this.getEnemyNeighbors(source, playerId);

                // Log dos inimigos encontrados
                console.log(`    Inimigos encontrados: ${enemies.map(e => `${e.id} (${e.troops} tropas)`).join(", ")}`);

                enemies.forEach(enemy => {
                    possibleAttacks.push({
                        from: {id: source, troops: sourceTroops},
                        to: {id: enemy.id, troops: enemy.troops, ownerId: enemy.ownerId}
                    });
                });
            }
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