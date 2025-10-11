export class Player {
    constructor(id, color, objective = null) {
        this.id = id;
        this.color = color;
        this.objective = objective;
        this.territories = [];
        this.cards = [];
        this.armies = 0;
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

    addArmies() {
        //logic to add armies to a territory
        // at the begining of the turn or because of card exchange or because of a continent control
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

