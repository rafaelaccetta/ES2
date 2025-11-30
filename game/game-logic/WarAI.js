/**
 * WarAI - Artificial Intelligence for the War game
 */
export class WarAI {
    constructor(playerId, objective) {
        this.myId = playerId;
        this.objective = objective;
    }

    // =================================================================
    // FASE 1: DISTRIBUIÇÃO
    // =================================================================

    decidePlacement(gameManager) {
        const player = gameManager.players.find(p => p.id === this.myId);
        if (!player) return null;

        const myTerritories = player.territories;
        let bestTerritory = null;
        let highestScore = -Infinity;

        myTerritories.forEach(terr => {
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
    // FASE 2: ATAQUE
    // =================================================================

    decideAttack(gameManager) {
        const possibleAttacks = gameManager.getAllPossibleAttacks(this.myId);
        let bestAttack = null;
        let highestScore = 30;

        possibleAttacks.forEach(attack => {
            if (attack.from.troops <= attack.to.troops + 1) return;

            let score = 0;
            const troopRatio = attack.from.troops / attack.to.troops;
            score += (troopRatio * 20);

            score += this._scoreForObjective(attack.to, gameManager);
            score += this._scoreAttackStrategicValue(attack.to, gameManager);
            score -= this._calculateRearRisk(attack.from, gameManager);

            if (score > highestScore) {
                highestScore = score;
                bestAttack = { from: attack.from.id, to: attack.to.id };
            }
        });

        return bestAttack;
    }

    // =================================================================
    // FASE 3: MANOBRA
    // =================================================================

    decideFortification(gameManager) {
        const player = gameManager.players.find(p => p.id === this.myId);
        if (!player) return null;

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

        let bestDonor = null;
        let maxSpareTroops = 0;

        const friendlyNeighbors = gameManager.getFriendlyNeighbors(neediestTerritory, this.myId);

        friendlyNeighbors.forEach(neighbor => {
            if (neighbor.troops > 1) {
                let spareTroops = neighbor.troops - 1;
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
    // AVALIAÇÃO ESTRATÉGICA
    // =================================================================

    _scoreAttackStrategicValue(targetTerritory, gameManager) {
        let score = 0;
        const enemyId = targetTerritory.ownerId;
        if (!enemyId) return score;

        const enemy = gameManager.players.find(p => p.id === enemyId);
        if (!enemy) return score;

        const territoriesByContinent = gameManager.gameMap.getTerritoriesByContinent();
        const continents = gameManager.gameMap.continents;

        for (const [contKey, continent] of Object.entries(continents)) {
            if (enemy.hasConqueredContinent(continent.name, territoriesByContinent)) {
                score += 50 + (continent.bonus * 10);
                break;
            }
        }

        if (enemy.territories.length === 1) score += 200;

        return score;
    }

    _calculateRearRisk(fromTerritory, gameManager) {
        let risk = 0;
        const enemies = gameManager.getEnemyNeighbors(fromTerritory.id, this.myId);
        enemies.forEach(enemy => risk += enemy.troops);
        return risk * 2;
    }

    _scoreForDefense(territoryId, gameManager) {
        const enemyNeighbors = gameManager.getEnemyNeighbors(territoryId, this.myId);
        if (enemyNeighbors.length === 0) return -10;

        const threatLevel = enemyNeighbors.reduce((sum, enemy) => sum + enemy.troops, 0);
        const myTroops = gameManager.getTerritoryArmies(territoryId);

        return threatLevel - myTroops;
    }

    _scoreForObjective(territory, gameManager) {
        if (!this.objective) return 0;

        const territoryId = typeof territory === 'string' ? territory : territory.id;

        if (this.objective.type === 'CONQUER_CONTINENTS') {
            const continent = gameManager.getTerritoryContinent(territoryId);
            if (continent && this.objective.targets.includes(continent.key)) {
                return 50;
            }
        }

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

    _scoreForContinentExpansion(territoryId, gameManager) {
        const player = gameManager.players.find(p => p.id === this.myId);
        if (!player) return 0;

        const continent = gameManager.getTerritoryContinent(territoryId);
        if (!continent) return 0;

        const territoriesByContinent = gameManager.gameMap.getTerritoriesByContinent();
        const continentTerritories = territoriesByContinent[continent.name] || [];
        const myTerritoriesInContinent = continentTerritories.filter(t => player.territories.includes(t));
        const myPercent = myTerritoriesInContinent.length / continentTerritories.length;

        if (myPercent >= 1.0) return 0;
        if (myPercent > 0.6) return continent.bonus * 20;
        return continent.bonus * 2;
    }
}