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
        let card = this.#_deck_cur.pop()
        this.#_deck_next.push(card)
        if(this.#_deck_cur.length <= 0){
            // switch current deck and next deck
            let temp = this.#_deck_cur
            this.#_deck_cur = this.#_deck_next
            this.#_deck_next = temp
            this.shuffle()
        }
        return card
    }

    show(){
        // mostra o deck_cur 
        console.log(this.#_deck_cur)
    }
}