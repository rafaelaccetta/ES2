import {PlayerCards} from "./PlayerCards.js"; // Adjust path if necessary
import data from "../public/data/territories_cards.json" with {type: "json"};

export class Deck {
    #_draw_pile;
    #_discard_pile;

    constructor() {
        this.#_draw_pile = [];
        this.#_discard_pile = [];
        this.loadCards()
    }

    loadCards() {
        this.#_draw_pile = Object.entries(data).map(([name, geometricShape]) => {
            return new PlayerCards({ name, geometricShape });
        });
        this.shuffle();
    }

    shuffle() {
        for (let i = this.#_draw_pile.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.#_draw_pile[i], this.#_draw_pile[j]] = [this.#_draw_pile[j], this.#_draw_pile[i]];
        }
    }
    
    draw() {
        if (this.#_draw_pile.length === 0) {
            this.#_draw_pile = this.#_discard_pile;
            this.#_discard_pile = [];
            this.shuffle();
        }
        if (this.#_draw_pile.length <1) {
            console.warn("Could not draw a card. The deck and discard pile might be empty.");
        }
        return this.#_draw_pile.pop();
    }
    
    discard(cards) {
        this.#_discard_pile.push(...cards)
    }

    get drawPileSize() {
        return this.#_draw_pile.length;
    }

    get discardPileSize() {
        return this.#_discard_pile.length;
    }
    
    show() {
        console.log("--- Deck Status ---");
        console.log(`Current Deck (${this.#_draw_pile.length} cards):`, this.#_draw_pile);
        console.log(`Discard Pile (${this.#_discard_pile.length} cards):`, this.#_discard_pile);
        console.log("-------------------");
    }
}