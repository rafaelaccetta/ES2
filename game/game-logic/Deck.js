import { PlayerCards } from "./PlayerCards.js"; // Adjust path if necessary
import data from "../public/data/territories_cards.json" with {type: "json"};

export class Deck {
    #_deck_cur;
    #_deck_next;

    constructor() {
        this.#_deck_cur = [];
        this.#_deck_next = [];
    }

    loadCards() {
        this.#_deck_cur = Object.entries(data).map(([name, geometricShape]) => {
            return new PlayerCards({ name, geometricShape });
        });
        this.shuffle();
    }

    shuffle() {
        for (let i = this.#_deck_cur.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.#_deck_cur[i], this.#_deck_cur[j]] = [this.#_deck_cur[j], this.#_deck_cur[i]];
        }
    }
    
    draw() {
        if (this.#_deck_cur.length === 0) {
            this.#_deck_cur = this.#_deck_next;
            this.#_deck_next = [];
            this.shuffle();
        }

        const card = this.#_deck_cur.pop();
        this.#_deck_next.push(card);

        return card;
    }
    
    show() {
        console.log("--- Deck Status ---");
        console.log(`Current Deck (${this.#_deck_cur.length} cards):`, this.#_deck_cur);
        console.log(`Discard Pile (${this.#_deck_next.length} cards):`, this.#_deck_next);
        console.log("-------------------");
    }
}