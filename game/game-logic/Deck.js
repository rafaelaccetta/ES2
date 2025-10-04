import {PlayerCards} from "./PlayerCards.js"; // Adjust path if necessary
import data from "../public/data/territories_cards.json" with {type: "json"};

export class Deck {
    #draw_pile;
    #_discard_pile;

    constructor() {
        this.#draw_pile = [];
        this.#_discard_pile = [];
        this.loadCards()
    }

    loadCards() {
        this.#draw_pile = Object.entries(data).map(([name, geometricShape]) => {
            return new PlayerCards({ name, geometricShape });
        });
        this.shuffle();
    }

    shuffle() {
        for (let i = this.#draw_pile.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.#draw_pile[i], this.#draw_pile[j]] = [this.#draw_pile[j], this.#draw_pile[i]];
        }
    }
    
    draw() {
        if (this.#draw_pile.length === 0) {
            this.#draw_pile = this.#_discard_pile;
            this.#_discard_pile = [];
            this.shuffle();
        }

        return this.#draw_pile.pop();
    }
    
    discard(cards) {
        this.#_discard_pile.push(...cards)
    }
    
    show() {
        console.log("--- Deck Status ---");
        console.log(`Current Deck (${this.#draw_pile.length} cards):`, this.#draw_pile);
        console.log(`Discard Pile (${this.#_discard_pile.length} cards):`, this.#_discard_pile);
        console.log("-------------------");
    }
}