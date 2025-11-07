/**
 * WarAI - Artificial Intelligence for the War game
 * This class implements decision-making logic for an AI player in War,
 * handling troop placement, attacks, and fortification moves.
 */
export class WarAI {
    /**
     * @param {number} playerId - O ID deste bot (ex: 2 para player 2).
     * @param {object} objective - O objetivo secreto deste bot.
     * Ex: { type: 'CONQUER_CONTINENTS', targets: ['SA', 'AF'] }
     * Ex: { type: 'DESTROY_PLAYER', targetId: 1 }
     */
    constructor(playerId, objective) {
        this.myId = playerId;
        this.objective = objective;
    }

    // =================================================================
    // FASE 1: DISTRIBUIÇÃO (Onde colocar as tropas no início do turno)
    // =================================================================
    
    /**
     * Retorna o ID do território onde quer colocar 1 tropa.
     * O jogo deve chamar isso repetidamente até acabarem as tropas a distribuir.
     * @param {GameManager} gameManager - A instância do GameManager
     * @returns {string|null} ID do território escolhido ou null se não for possível
     */
    decidePlacement(gameManager) {
        const player = gameManager.players.find(p => p.id === this.myId);
        if (!player) return null;

        const myTerritories = player.territories;
        let bestTerritory = null;
        let highestScore = -Infinity;

        myTerritories.forEach(terr => {
            // A pontuação baseia-se na necessidade de defesa e valor estratégico
            let score = this._scoreForDefense(terr, gameManager) +
                       this._scoreForObjective(terr, gameManager) +
                       this._scoreForContinentExpansion(terr, gameManager);

            if (score > highestScore) {
                highestScore = score;
                bestTerritory = terr;
            }
        });

        return bestTerritory;
    }

    // =================================================================
    // FASE 2: ATAQUE (Escolher origem e destino)
    // =================================================================

    /**
     * Retorna o melhor ataque possível no momento, ou NULL se não quiser atacar mais.
     * @param {GameManager} gameManager - A instância do GameManager
     * @returns {object|null} { from: 'terrId1', to: 'terrId2' } ou null
     */
    decideAttack(gameManager) {
        const possibleAttacks = gameManager.getAllPossibleAttacks(this.myId);
        let bestAttack = null;
        // Limiar de coragem: só ataca se a pontuação for maior que X.
        // Aumente para uma IA mais defensiva, diminua para uma mais agressiva.
        let highestScore = 30; 

        possibleAttacks.forEach(attack => {
            // 1. Regra básica de sobrevivência:
            // Nunca ataque se você não tiver vantagem numérica razoável.
            // No War, atacante perde empates, então precisa de mais dados.
            if (attack.from.troops <= attack.to.troops + 1) {
                return; // Pula este ataque, muito arriscado
            }

            let score = 0;

            // Fator 1: Probabilidade de Vitória (simplificada pela razão de tropas)
            const troopRatio = attack.from.troops / attack.to.troops;
            score += (troopRatio * 20); 

            // Fator 2: Valor do alvo
            score += this._scoreForObjective(attack.to, gameManager);
            score += this._scoreAttackStrategicValue(attack.to, gameManager);

            // Fator 3: Risco da retaguarda
            score -= this._calculateRearRisk(attack.from, gameManager);

            if (score > highestScore) {
                highestScore = score;
                bestAttack = { from: attack.from.id, to: attack.to.id };
            }
        });

        return bestAttack;
    }

    // =================================================================
    // FASE 3: MANOBRA (Mover tropas no fim do turno)
    // =================================================================

    /**
     * Retorna a melhor movimentação estratégica.
     * @param {GameManager} gameManager - A instância do GameManager
     * @returns {object|null} { from: 'terrIdA', to: 'terrIdB', numTroops: 5 } ou null
     */
    decideFortification(gameManager) {
        const player = gameManager.players.find(p => p.id === this.myId);
        if (!player) return null;
        
        // 1. Achar quem precisa de ajuda (maior pontuação de defesa)
        let neediestTerritory = null;
        let maxNeedScore = -Infinity;

        player.territories.forEach(terr => {
            let need = this._scoreForDefense(terr, gameManager);
            if (need > maxNeedScore) {
                maxNeedScore = need;
                neediestTerritory = terr;
            }
        });

        if (!neediestTerritory || maxNeedScore <= 0) return null;

        // 2. Achar quem pode doar (vizinhos aliados que tenham tropas > 1)
        let bestDonor = null;
        let maxSpareTroops = 0;

        const friendlyNeighbors = gameManager.getFriendlyNeighbors(neediestTerritory, this.myId);
        
        friendlyNeighbors.forEach(neighbor => {
            if (neighbor.troops > 1) {
                let spareTroops = neighbor.troops - 1;
                // Se o vizinho também está na fronteira, só doa metade
                if (gameManager.isFrontline(neighbor.id, this.myId)) {
                    spareTroops = Math.floor(spareTroops / 2);
                }

                if (spareTroops > maxSpareTroops) {
                    maxSpareTroops = spareTroops;
                    bestDonor = neighbor.id;
                }
            }
        });

        if (bestDonor && maxSpareTroops > 0) {
            return {
                from: bestDonor,
                to: neediestTerritory,
                numTroops: maxSpareTroops
            };
        }

        return null;
    }

    // =================================================================
    // MÉTODOS DE AVALIAÇÃO ESTRATÉGICA
    // =================================================================

    /**
     * Avalia se atacar este destino quebra o bônus de alguém ou abre portas estratégicas.
     * @param {object} targetTerritory - O território alvo com { id, ownerId }
     * @param {GameManager} gameManager - A instância do GameManager
     * @returns {number} A pontuação estratégica do ataque
     */
    _scoreAttackStrategicValue(targetTerritory, gameManager) {
        let score = 0;
        const enemyId = targetTerritory.ownerId;
        if (!enemyId) return score;

        const enemy = gameManager.players.find(p => p.id === enemyId);
        if (!enemy) return score;

        const territoriesByContinent = gameManager.gameMap.getTerritoriesByContinent();
        const continents = gameManager.gameMap.continents;

        // 1. Quebrar continente inimigo (MUITO IMPORTANTE)
        for (const [contKey, continent] of Object.entries(continents)) {
            if (enemy.hasConqueredContinent(continent.name, territoriesByContinent)) {
                score += 50 + (continent.bonus * 10); // Quebrar a Ásia vale mais que a América do Sul
                break; // Se ele tem algum continente, isso já é suficiente motivação
            }
        }

        // 2. Eliminar jogador (Se ele só tiver 1 território sobrando e for este)
        if (enemy.territories.length === 1) {
            score += 200; // Matar um jogador dá suas cartas, vale muito!
        }

        return score;
    }

    /**
     * Calcula o risco de deixar a origem desprotegida após um ataque.
     * @param {object} fromTerritory - O território de origem com { id }
     * @param {GameManager} gameManager - A instância do GameManager
     * @returns {number} O nível de risco para a retaguarda
     */
    _calculateRearRisk(fromTerritory, gameManager) {
        let risk = 0;
        const enemies = gameManager.getEnemyNeighbors(fromTerritory.id, this.myId);
        
        enemies.forEach(enemy => {
            risk += enemy.troops;
        });

        return risk * 2; // Peso do risco na pontuação final do ataque
    }

    /**
     * Verifica se um território está na fronteira (tem vizinhos inimigos).
     * @param {string} territoryId - O ID do território a ser verificado
     * @param {GameManager} gameManager - A instância do GameManager
     * @returns {boolean} true se o território está na fronteira
     */
    _isFrontline(territoryId, gameManager) {
        return gameManager.isFrontline(territoryId, this.myId);
    }

    /**
     * Calcula o quão desesperadamente um território precisa de tropas.
     * @param {string} territoryId - O ID do território a ser avaliado
     * @param {GameManager} gameManager - A instância do GameManager
     * @returns {number} A pontuação de necessidade de defesa
     */
    _scoreForDefense(territoryId, gameManager) {
        const player = gameManager.players.find(p => p.id === this.myId);
        if (!player) return 0;

        const enemyNeighbors = gameManager.getEnemyNeighbors(territoryId, this.myId);

        if (enemyNeighbors.length === 0) {
            return -10; // Território seguro (interior), não precisa de defesa
        }

        const threatLevel = enemyNeighbors.reduce((sum, enemy) => sum + enemy.troops, 0);
        const myTroops = player.territoriesArmies[territoryId] || 0;
        
        return threatLevel - myTroops;
    }

    /**
     * Calcula o valor deste território para o meu objetivo secreto.
     * @param {string|object} territory - O ID do território ou objeto com { id, ownerId }
     * @param {GameManager} gameManager - A instância do GameManager
     * @returns {number} A pontuação baseada no objetivo
     */
    _scoreForObjective(territory, gameManager) {
        if (!this.objective) return 0;

        const territoryId = typeof territory === 'string' ? territory : territory.id;

        // Objetivo de conquistar continentes específicos
        if (this.objective.type === 'CONQUER_CONTINENTS') {
            const continent = gameManager.getTerritoryContinent(territoryId);
            if (continent && this.objective.targets.includes(continent.key)) {
                return 50;
            }
        }

        // Objetivo de destruir um jogador
        if (this.objective.type === 'DESTROY_PLAYER') {
            const owner = typeof territory === 'object' && territory.ownerId 
                ? gameManager.players.find(p => p.id === territory.ownerId)
                : gameManager.getTerritoryOwner(territoryId);
            
            if (owner && owner.id === this.objective.targetId) {
                return 60;
            }
        }

        return 0;
    }

    /**
     * Calcula o quanto vale a pena pegar este território para fechar um continente.
     * @param {string} territoryId - O ID do território a ser avaliado
     * @param {GameManager} gameManager - A instância do GameManager
     * @returns {number} A pontuação baseada na expansão do continente
     */
    _scoreForContinentExpansion(territoryId, gameManager) {
        const player = gameManager.players.find(p => p.id === this.myId);
        if (!player) return 0;

        const continent = gameManager.getTerritoryContinent(territoryId);
        if (!continent) return 0;

        const territoriesByContinent = gameManager.gameMap.getTerritoriesByContinent();
        const continentTerritories = territoriesByContinent[continent.name] || [];
        const myTerritoriesInContinent = continentTerritories.filter(t => player.territories.includes(t));
        const myPercent = myTerritoriesInContinent.length / continentTerritories.length;

        if (myPercent >= 1.0) return 0; // Já é todo meu

        // Se já tenho 60% do continente, vale muito mais
        if (myPercent > 0.6) {
             return continent.bonus * 20;
        }

        return continent.bonus * 2;
    }
}