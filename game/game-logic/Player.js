import cardsSymbols from "../public/data/territories_cards.json" with {type: "json"};

export class Player {
    constructor(id, color, objective = null, isAI = false) {
        this.id = id;
        this.color = color;
        this.objective = objective;
        this.isAI = isAI
        this.territories = [];
        this.cards = [];
        this.armies = 0; // Represents the "reserve" pool of armies available to place
        this.isActive = true;
    }

    addTerritory(territory) {
        if (!this.territories.includes(territory)) {
            this.territories.push(territory);
        }
    }

    removeTerritory(territory) {
        this.territories = this.territories.filter((t) => t !== territory);
    }

    addCard(card) {
        this.cards.push(card);
    }

    // chamada na função de calcular o bônus de continente no GameMap
    hasConqueredContinent(continentName, territoriesByContinent) {
        const continentTerritories = territoriesByContinent[continentName];
        if (!continentTerritories) return false;
        return continentTerritories.every((territory) => this.territories.includes(territory));
    }

    // Adiciona tropas para o saldo (reserva) do jogador. 
    addArmies(amount) {
        this.armies = this.armies + amount;
    }

    removeArmies(amount) {
        this.armies = this.armies >= amount ? this.armies - amount : 0;
    }

    hasArmies(amount) {
        return this.armies >= amount
    }

    hasTerritory(territoryName){
        return this.territories.includes(territoryName)
    }

    deactivate() {
        // logic to deactivate a player
        this.isActive = false;
    }

    activate() {
        // logic to activate a player
        this.isActive = true;
    }

    checkWin(gameState) {
        if (!this.objective || typeof this.objective.checkWin !== "function") return false;
        return this.objective.checkWin(this, gameState);   
    }
}