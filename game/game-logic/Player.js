import cardsSymbols from "../public/data/territories_cards.json" with {type: "json"};

export class Player {
    constructor(id, color, objective = null, isAI = false) {
        this.id = id;
        this.color = color;
        this.objective = objective;
        this.isAI = isAI
        this.territories = [];
        this.cards = [];

        // STRICTLY "Reserve Pool": Troops waiting to be placed on the board.
        // Does not include troops already on the GameMap.
        this.armies = 0;

        this.isActive = true;
        this.armiesExclusiveToTerritory = new Map(); // example: {"Brazil": 2}
    }

    addTerritory(territory) {
        if (!this.territories.includes(territory)) {
            this.territories.push(territory);
        }
    }

    removeTerritory(territory) {
        this.territories = this.territories.filter((t) => t !== territory);
    }

    getTerritoriesCount() {
        return this.territories.length;
    }

    addCard(card) {
        this.cards.push(card);
    }

    hasConqueredContinent(continentName, territoriesByContinent) {
        const continentTerritories = territoriesByContinent[continentName];
        if (!continentTerritories) return false;
        return continentTerritories.every((territory) => this.territories.includes(territory));
    }

    // Add troops to the Reserve Pool (e.g., beginning of turn, card trade)
    addArmies(amount) {
        this.armies = this.armies + amount;
    }

    // Remove troops from Reserve Pool (e.g., when placing them on the map)
    removeArmies(amount) {
        this.armies = this.armies >= amount ? this.armies - amount : 0;
    }

    hasArmies(amount) {
        return this.armies >= amount
    }

    addArmiesExclusive(territoryName, amount){
        // Adds to general reserve, but marks as restricted for the UI/AI to handle
        if (this.hasTerritory(territoryName)) {
            this.addArmies(amount);
            const currentAmount = this.armiesExclusiveToTerritory.get(territoryName) || 0;
            this.armiesExclusiveToTerritory.set(territoryName, currentAmount + amount);
        }
    }

    removeArmiesExclusive(territoryName, amount){
        const currentAmount = this.armiesExclusiveToTerritory.get(territoryName) || 0;
        if (currentAmount >= amount) {
            this.armiesExclusiveToTerritory.set(territoryName, currentAmount - amount);
        }
    }

    hasTerritory(territoryName){
        return this.territories.includes(territoryName)
    }

    // Legacy alias: directs to the Reserve Pool
    addArmiesToTerritory(territory, quantity) {
        this.addArmies(quantity);
    }

    deactivate() {
        this.isActive = false;
    }

    activate() {
        this.isActive = true;
    }

    checkWin(gameState) {
        if (!this.objective || typeof this.objective.checkWin !== "function") return false;
        return this.objective.checkWin(this, gameState);
    }
}