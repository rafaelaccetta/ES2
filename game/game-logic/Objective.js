
import continentsJson from "../public/data/continents.json" with {type: "json"};

export class Objective {
    constructor(description, title = null) {
        this.description = description || "";
        this.title = title || (this.description ? this.description.slice(0, 60) : "Objetivo");
    }

    checkWin(player, gameState) {
        throw new Error("Objetivo não implementado");
    }
}

export class EliminatePlayerObjective extends Objective {
    constructor(targetIdentifier, fallbackTerritories = 24, useFallback = false, description = null, title = null) {
        const desc = description || `Eliminar jogador ${targetIdentifier} ou conquistar ${fallbackTerritories} territórios se o alvo já estiver eliminado ou for você mesmo`;
        super(desc, title);
        this.targetIdentifier = targetIdentifier;
        this.fallbackTerritories = fallbackTerritories;
        this.useFallback = useFallback;
    }

    activateFallback() {
        this.useFallback = true;
    }

    checkWin(player, gameState) {
        if (this.useFallback || this._isTargetSameAsPlayer(player)) {
            return player.getTerritoriesCount() >= this.fallbackTerritories;
        }

        const target = gameState.players.find(p => p.id === this.targetIdentifier || p.color === this.targetIdentifier);
        return !target || !target.isActive;
    }

    _isTargetSameAsPlayer(player) {
        return player.id === this.targetIdentifier || player.color === this.targetIdentifier;
    }
}

export class DominateContinentObjective extends Objective {
    constructor(continents = [], extraTerritories = 0, description = null, title = null) {
        const desc = description || `Controlar os continentes ${continents.join(", ")} e adicionalmente controlar ${extraTerritories} territórios`;
        super(desc, title);
        this.continents = continents;
        this.extraTerritories = extraTerritories;
    }

    checkWin(player, gameState) {
        const territoriesByContinent = gameState.getTerritoriesByContinent();

        const normalizeContinent = (c) => {
            if (!c && c !== 0) return c;
            if (typeof c === 'string') return c;
            if (typeof c === 'object') {
                if (c.name) return c.name;
                // fallback to string coercion
                return String(c);
            }
            return String(c);
        };

        for (const rawCont of this.continents) {
            const cont = normalizeContinent(rawCont);
            if (!player.hasConqueredContinent(cont, territoriesByContinent)) {
                return false;
            }
        }

        const totalTerritories = player.getTerritoriesCount();
        const requiredTerritories = this._continentTerritoriesCount(territoriesByContinent) + this.extraTerritories;
        return totalTerritories >= requiredTerritories;
    }

    _continentTerritoriesCount(territoriesByContinent) {
        let count = 0;
        const normalizeContinent = (c) => {
            if (!c && c !== 0) return c;
            if (typeof c === 'string') return c;
            if (typeof c === 'object') {
                if (c.name) return c.name;
                return String(c);
            }
            return String(c);
        };

        for (const rawCont of this.continents) {
            const cont = normalizeContinent(rawCont);
            count += (territoriesByContinent[cont] || []).length;
        }
        return count;
    }
}

export class TerritoryControlObjective extends Objective {
    constructor(requiredTerritories, description = null, title = null) {
        const desc = description || `Conquistar ${requiredTerritories} territórios`;
        super(desc, title);
        this.requiredTerritories = requiredTerritories;
    }

    checkWin(player, gameState) {
        return player.getTerritoriesCount() >= this.requiredTerritories;
    }
}

export function createObjectiveFromJson(obj) {
    if (!obj || !obj.type) return null;

    switch (obj.type) {
        case "conquest":
        case "mixed": {
            const continentsArr = (obj.target?.continents || []).map((c) => continentsJson[c] || c);
            return new DominateContinentObjective(
                continentsArr,
                obj.target?.territory_count || 0,
                obj.description || obj.title || null,
                obj.title || null
            );
        }
        case "elimination":
            return new EliminatePlayerObjective(
                obj.target?.eliminate_player,
                obj.target?.fallbackTerritories || 24,
                false,
                obj.description || obj.title || null,
                obj.title || null
            );
        case "territory_count":
            return new TerritoryControlObjective(
                obj.target?.territory_count || 0,
                obj.description || obj.title || null,
                obj.title || null
            );
        default:
            if (obj.target && obj.target.territory_count) {
                return new TerritoryControlObjective(obj.target.territory_count, obj.description || obj.title || null);
            }
            return new Objective(obj.description || obj.title || "Objetivo desconhecido");
    }
}
