
export class Objective {
    constructor(description) {
        this.description = description;
    }

    checkWin(player, gameState) {
        throw new Error("Objetivo não implementado");
    }
}

export class EliminatePlayerObjective extends Objective {
    // targetPlayerId: id do jogador alvo (obrigatório para objetivos direcionados)
    // fallbackTerritories: número de territórios exigidos se fallback ativado
    // useFallback: sentinel booleano; quando true, checkWin só verifica territórios
    constructor(targetPlayerId, fallbackTerritories, useFallback = false) {
        const desc = `Eliminar jogador ${targetPlayerId} ou conquistar ${fallbackTerritories} territórios se o alvo já estiver eliminado ou for você mesmo`;
        super(desc);
        this.targetPlayerId = targetPlayerId;
        this.fallbackTerritories = fallbackTerritories;
        this.useFallback = useFallback;
    }

    activateFallback() {
        this.useFallback = true;
    }

    checkWin(player, gameState) {
        if (this.useFallback || this.targetPlayerId === player.id) {
            return player.getTerritoriesCount() >= this.fallbackTerritories;
        }

        const target = gameState.players.find(p => p.id === this.targetPlayerId);
        return !target || !target.isActive; 
    }
}

export class DominateContinentObjective extends Objective {
    constructor(continents, extraTerritories) {
        const desc = `Controlar os continentes ${continents.join(", ")} e adicionalmente controlar ${extraTerritories} territórios`;
        super(desc);
        this.continents = continents;
        this.extraTerritories = extraTerritories;
    }

    checkWin(player, gameState) {
        for (const cont of this.continents) {
            if (!player.hasConqueredContinent(cont, gameState.getTerritoriesByContinent())) {
                return false;
            }
        }
    
        const totalTerritories = player.getTerritoriesCount();
        const requiredTerritories = this._continentTerritoriesCount(gameState) + this.extraTerritories;
        return totalTerritories >= requiredTerritories;
    }

    _continentTerritoriesCount(gameState) {
        const territoriesByContinent = gameState.getTerritoriesByContinent();
        let count = 0;
        for (const cont of this.continents) {
            count += (territoriesByContinent[cont] || []).length;
        }
        return count;
    }
}
  
export class TerritoryControlObjective extends Objective {
    constructor(requiredTerritories) {
        const desc = `Conquistar ${requiredTerritories} territórios`;
        super(desc);
        this.requiredTerritories = requiredTerritories;
    }

    checkWin(player, gameState) {
        return player.getTerritoriesCount() >= this.requiredTerritories;
    }   
}
