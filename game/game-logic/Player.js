import cardsSymbols from "../public/data/territories_cards.json" with {type: "json"};
export class Player {
    constructor(id, color, objective = null) {
        this.id = id;
        this.color = color;
        this.objective = objective;
        this.territories = [];
        this.cards = [];
        this.armies = 0;
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
        if (this.territoriesArmies[territory]) {
            this.armies -= this.territoriesArmies[territory];
            delete this.territoriesArmies[territory];
        }
    }

    addCard(card) {
        this.cards.push(card);
        if (this.cards.length >= 5) {
            this.forceTradeCards();
        }
    }

    forceTradeCards() {
        if (this.cards.length < 3) return;
        for (let i = 0; i < this.cards.length; i++) {
            for (let j = i + 1; j < this.cards.length; j++) {
                for (let k = j + 1; k < this.cards.length; k++) {
                    const c1 = this.cards[i];
                    const c2 = this.cards[j];
                    const c3 = this.cards[k];
                    const s1 = cardsSymbols[c1];
                    const s2 = cardsSymbols[c2];
                    const s3 = cardsSymbols[c3];
                    if (s1 === s2 && s2 === s3) {
                        this.cards = this.cards.filter(
                            (card) => card !== c1 && card !== c2 && card !== c3
                        );
                        console.log(
                            `Player ${this.id} made the exchange of 3 identical cards:`,
                            [c1, c2, c3],
                            `Symbols: [${s1}, ${s2}, ${s3}]`
                        );
                        return;
                    }
                }
            }
        }
        for (let i = 0; i < this.cards.length; i++) {
            for (let j = i + 1; j < this.cards.length; j++) {
                for (let k = j + 1; k < this.cards.length; k++) {
                    const c1 = this.cards[i];
                    const c2 = this.cards[j];
                    const c3 = this.cards[k];
                    const s1 = cardsSymbols[c1];
                    const s2 = cardsSymbols[c2];
                    const s3 = cardsSymbols[c3];
                    if (s1 !== s2 && s2 !== s3 && s1 !== s3) {
                        this.cards = this.cards.filter(
                            (card) => card !== c1 && card !== c2 && card !== c3
                        );
                        console.log(
                            `Player ${this.id} made the exchange of 3 different cards:`,
                            [c1, c2, c3],
                            `Symbols: [${s1}, ${s2}, ${s3}]`
                        );
                        return;
                    }
                }
            }
        }
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
}

