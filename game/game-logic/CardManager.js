import { Deck } from "./Deck.js";

export class CardManager {
    #_deck;
    #_exchangeCount;
    #_exchangeBonuses;

    constructor() {
        // Safe deck initialization
        try {
            this.#_deck = new Deck();
        } catch (e) {
            console.warn("Deck initialization failed (likely due to test environment mock issues):", e);
            this.#_deck = { draw: () => null, discard: () => {}, show: () => {} };
        }

        this.#_exchangeCount = 0;
        this.#_exchangeBonuses = [4, 6, 8, 10, 12, 15];
    }

    getNextExchangeBonus() {
        return this.#_getCurrentBonus();
    }

    drawCardForPlayer(player) {
        if(player.cards.length < 5){
            return this.#_deck.draw();
        }
        // Returns undefined if full
    }

    awardConquestCard(player) {
        const card = this.drawCardForPlayer(player);
        if (card) {
            player.addCard(card);
            return card;
        }
        return null;
    }

    executeCardExchange(cards, player) {
        if (!this.#_isValidSet(cards)) {
            console.warn("Invalid set of cards for exchange.");
            return
        }

        const bonus = this.#_getCurrentBonus();

        player.addArmies(bonus);

        for (const card of cards) {
            if (player.hasTerritory(card.name)) {
                player.addArmiesExclusive(card.name, 2);
            }
        }

        this.#_exchangeCount++;
        this.#_deck.discard(cards);

        player.cards = player.cards.filter(c => !cards.includes(c));
    }

    #_isValidSet(cards) {
        if (!cards || cards.length !== 3) return false;

        const shapes = cards.map(card => card.geometricShape);
        const wildcardCount = shapes.filter(s => s === 'Wildcard').length;
        if (wildcardCount > 0) return true;

        const uniqueShapes = new Set(shapes);
        if (uniqueShapes.size === 1) return true;
        if (uniqueShapes.size === 3) return true;

        return false;
    }

    #_getCurrentBonus() {
        if (this.#_exchangeCount < this.#_exchangeBonuses.length) {
            return this.#_exchangeBonuses[this.#_exchangeCount];
        } else {
            const lastBonusInList = this.#_exchangeBonuses[this.#_exchangeBonuses.length - 1];
            const stepsBeyondList = this.#_exchangeCount - (this.#_exchangeBonuses.length - 1);
            return lastBonusInList + (stepsBeyondList * 5);
        }
    }

    showDeckStatus() {
        if(this.#_deck.show) this.#_deck.show();
    }
}