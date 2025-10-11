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

    addArmies(bonus) {
        //logic to add armies to a territory
        // at the begining of the turn or because of card exchange or because of a continent control
    }
    
    addArmiesExclusive(territoryName, amount){
        const currentAmount = this.armiesExclusiveToTerritory.get(territoryName) || 0;
        this.armiesExclusiveToTerritory.set(territoryName, currentAmount + amount);
    }
    
    hasTerritory(territoryName){
        return this.territories.includes(territoryName)
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
}

