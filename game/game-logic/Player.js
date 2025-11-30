import cardsSymbols from "../public/data/territories_cards.json" with {type: "json"};

export class Player {
    constructor(id, color, objective = null, isAI = false) {
        this.id = id;
        this.color = color;
        this.objective = objective;
        this.isAI = isAI
        this.territories = [];
        this.cards = [];

        // REFACTOR: this.armies now STRICTLY represents the "Reserve Pool"
        // (Troops waiting to be placed on the board).
        // It does NOT count troops currently on the map.
        this.armies = 0;

        this.pendingReinforcements = 0; // Tropas calculadas para alocar na fase REFORÇAR
        this.isActive = true;
        this.armiesExclusiveToTerritory = new Map(); // example: {"Brazil": 2}

        // REFACTOR: Removed this.territoriesArmies. 
        // The GameMap is now the Single Source of Truth for board state.
    }

    addTerritory(territory) {
        if (!this.territories.includes(territory)) {
            this.territories.push(territory);
        }
    }

    removeTerritory(territory) {
        this.territories = this.territories.filter((t) => t !== territory);

        // REFACTOR: Removed logic that subtracted 'territoriesArmies' from 'this.armies'.
        // Losing a territory on the board should NOT reduce your unplaced reinforcements.
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
        if (!continentTerritories) return false;
        return continentTerritories.every((territory) => this.territories.includes(territory));
    }

    // Adiciona tropas para o saldo (pool) do jogador que ainda serão alocadas.
    // Can be called 'receiveReinforcements' conceptually.
    addArmies(amount) {
        this.armies = this.armies + amount;
    }

    // Called when the GameManager actually places a troop on the map.
    removeArmies(amount) {
        this.armies = this.armies >= amount ? this.armies - amount : 0;
    }

    hasArmies(amount) {
        return this.armies >= amount
    }

    addArmiesExclusive(territoryName, amount){
        // REFACTOR: Adds to the general reserve pool, but marks them as restricted.
        // The GameManager/UI must check 'armiesExclusiveToTerritory' when placing.
        if (this.hasTerritory(territoryName)) {
            this.addArmies(amount); // Add to reserve
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

    // REFACTOR: This method used to mix Reserve logic with Board logic.
    // It is now an alias for addArmies (adding to reserve) to maintain compatibility 
    // where 'adding armies' meant giving the player reinforcements.
    // The GameMap calls that used this to sync board state have been removed.
    addArmiesToTerritory(territory, quantity) {
        // Warning: This adds to RESERVE. It does not place on the map.
        this.addArmies(quantity);
    }

    spendPendingReinforcement(territory, amount = 1){
        if (this.pendingReinforcements <= 0) return false;
        if (!this.hasTerritory(territory)) return false;

        const toSpend = Math.min(amount, this.pendingReinforcements);
        this.pendingReinforcements -= toSpend;

        // Moves from "Pending" to "Reserve". 
        // The GameManager is responsible for taking from Reserve and calling GameMap.addArmy.
        this.addArmies(toSpend);

        return true;
    }

    hasPendingReinforcements(){
        return this.pendingReinforcements > 0;
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