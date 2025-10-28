import cardsSymbols from "../public/data/territories_cards.json" with {type: "json"};
export class Player {
    constructor(id, color, objective = null) {
        this.id = id;
        this.color = color;
        this.objective = objective;
        this.territories = [];
        this.cards = [];
        this.armies = 0;
        this.armiesExclusiveToTerritory = new Map() // example: {"Brazil": 2} means 2 troops can only be deployed in Brazil
        this.isActive = true;
        this.territoriesArmies = {}; // objeto para armazenar exércitos por território
    }

    addTerritory(territory) {
        if (!this.territories.includes(territory)) {
            this.territories.push(territory);
            this.territoriesArmies[territory] = 0;
        }
    }

    removeTerritory(territory) {
        this.territories = this.territories.filter((t) => t !== territory);
        // If the player had an entry for this territory in territoriesArmies, remove it.
        // Use the `in` operator to catch zero values as well (0 is falsy).
        if (territory in this.territoriesArmies) {
            this.armies -= this.territoriesArmies[territory] || 0;
            delete this.territoriesArmies[territory];
        }
    }

    getTerritoriesCount() {
        return this.territories.length;
    }

    addCard(card) {
        this.cards.push(card);
    }
    
    // chamada na função de calcular o bônus de continente no GameMap
    hasConqueredContinent(continentName, territoriesByContinent) {
        const continentTerritories = territoriesByContinent[continentName];
        return continentTerritories.every((territory) => this.territories.includes(territory));
    }

    //Adiciona tropas para o saldo do jogador. 
    // Antes das tropas forem alocadas (pela classe responsável), deve ser verificado se o Player tem o saldo necessário.
    addArmies(amount) {
        this.armies = this.armies + amount;
    }

    removeArmies(amount) {
        this.armies = this.armies >= amount ? this.armies - amount : 0;    
    }

    hasArmies(amount) {
        return this.armies >= amount
    }
    
    addArmiesExclusive(territoryName, amount){
        const currentAmount = this.armiesExclusiveToTerritory.get(territoryName) || 0;
        this.armiesExclusiveToTerritory.set(territoryName, currentAmount + amount);
    }
    
    removeArmiesExclusive(territoryName, amount){
        const currentAmount = this.armiesExclusiveToTerritory.get(territoryName) || 0;
        if (currentAmount >= amount) {    
            this.armiesExclusiveToTerritory.set(territoryName, currentAmount + amount);
        }
    }

    hasArmiesExclusive(territoryName, amount){
        return this.armiesExclusiveToTerritory.get(territoryName) >= amount;
    }
    
    hasTerritory(territoryName){
        return this.territories.includes(territoryName)
    }

    addArmies(territory, quantity) {
        //logic to add armies to a territory
        // at the begining of the turn or because of card exchange or because of a continent control
        if (this.territories.includes(territory)) {
            if (!this.territoriesArmies[territory]) {
                this.territoriesArmies[territory] = 0;
            }
            this.territoriesArmies[territory] += quantity;
            this.armies += quantity;
        }
    }

    removeArmies() {
        // logic to remove armies of a territory
        // because of attack, defense or movement
    }

    deactivate() {
        // logic to deactivate a player
    }

    activate() {
        // logic to activate a player
    }

    checkWin(gameState) {
        if (!this.objective || typeof this.objective.checkWin !== "function") return false;
        return this.objective.checkWin(this, gameState);   
    }
}

