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
        // The 'useFallback' property is no longer used by the logic, but kept for compatibility
    }

    activateFallback() {
        // This method can be called if another player eliminates the target,
        // but the new checkWin logic handles this case automatically.
    }

    checkWin(player, gameState) {
        const target = gameState.players.find(p => p.id === this.targetIdentifier || p.color === this.targetIdentifier);

        // --- CORE LOGIC FIX ---
        // An elimination objective has TWO independent paths to victory.

        // Path 1: The player has conquered the required number of territories.
        // This is valid as a primary goal for "Conquer 24" objectives, and as the fallback for elimination objectives.
        const hasConqueredTerritories = player.getTerritoriesCount() >= this.fallbackTerritories;
        if (hasConqueredTerritories) {
            return true;
        }

        // Path 2: The target player has been eliminated.
        // This check is only valid if the target is NOT the player themself.
        if (!this._isTargetSameAsPlayer(player)) {
            const targetIsEliminated = !target || !target.isActive;
            if (targetIsEliminated) {
                return true;
            }
        }

        // If neither win condition is met, the player has not won.
        return false;
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

        for (const cont of this.continents) {
            if (!player.hasConqueredContinent(cont, territoriesByContinent)) {
                return false;
            }
        }

        // The logic for "additional" territories is interpreted as (Territories in Target Continent) + (Additional).
        // This seems consistent with the numbers in objectives.json.
        const totalTerritories = player.getTerritoriesCount();
        const requiredTerritories = this._continentTerritoriesCount(territoriesByContinent) + this.extraTerritories;
        return totalTerritories >= requiredTerritories;
    }

    _continentTerritoriesCount(territoriesByContinent) {
        let count = 0;
        for (const cont of this.continents) {
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
            const continentsArr = (obj.target?.continents || []).map((c) => continentsJson[c]?.name || c);
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