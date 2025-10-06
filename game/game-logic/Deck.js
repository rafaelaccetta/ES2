import data  from "../public/data/territories_cards.json" with {type: "json"};

export class Deck {
    #_deck_cur;
    #_deck_next;
    constructor(){
        this.#_deck_cur = {};
        this.#_deck_next = {};
    }
    loadCards() {


        this.#_deck_cur = data
        this.shuffle()

    }

    shuffle() {
        // uma vez carregados os cards, realizar um sort
        for (let i = this.#_deck_cur.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.#_deck_cur[i], this.#_deck_cur[j]] = [this.#_deck_cur[j], this.#_deck_cur[i]];
        }
    }

    draw() {
        // puxa uma carta aleatoria ao fim do turno caso tenha conquistado territorio
    }

    show(){
        // mostra o deck_cur 
        console.log(this.#_deck_cur)
    }
}