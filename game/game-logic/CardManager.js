import { Deck } from "./Deck.js";

export class CardManager {
    #_deck;
    #_exchangeCount;
    #_exchangeBonuses;
    
    constructor() {
        this.#_deck = new Deck();
        this.#_exchangeCount = 0;

        this.#_exchangeBonuses = [4, 6, 8, 10, 12, 15];
    }
    
    #playerCanReceiveCard(playerCards){
        return playerCards.length < 5
    }
    
    drawCardForPlayer(player) {
        if (this.#playerCanReceiveCard(player.cards)){
            return this.#_deck.draw();   
        }
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
    }
    
    #_isValidSet(cards) {
        if (!cards || cards.length !== 3) {
            return false;
        }

        const shapes = cards.map(card => card.geometricShape);

        const wildcardCount = shapes.filter(s => s === 'Wildcard').length;
        if (wildcardCount > 0) return true; // Any set with a wildcard is valid

        const uniqueShapes = new Set(shapes);

        if (uniqueShapes.size === 1) {
            return true;
        }

        if (uniqueShapes.size === 3) {
            return true;
        }

        return false;
    }
    
    #_getCurrentBonus() {
        if (this.#_exchangeCount < this.#_exchangeBonuses.length) {
            // Use the predefined list for the first few exchanges
            return this.#_exchangeBonuses[this.#_exchangeCount];
        } else {
            // The rule is that after the list is exhausted, the bonus increases by 5 for each subsequent exchange
            // http://www.gametrack.com.br/jogos/war/instrucoes/tabelas.asp "Tabela II"
            const lastBonusInList = this.#_exchangeBonuses[this.#_exchangeBonuses.length - 1];
            const stepsBeyondList = this.#_exchangeCount - (this.#_exchangeBonuses.length - 1);
            return lastBonusInList + (stepsBeyondList * 5);
        }
    }
    
    
    showDeckStatus() {
        this.#_deck.show();
    }
}