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

    deactivate() {
        // logic to deactivate a player
    }

    activate() {
        // logic to activate a player
    }
}

