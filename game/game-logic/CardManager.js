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
    
    // Retorna o próximo bônus de troca sem alterar o estado
    getNextExchangeBonus() {
        return this.#_getCurrentBonus();
    }
    
    drawCardForPlayer(player) {
        // Regra: jogador recebe exatamente 1 carta se conquistou território na fase de ataque
        // Não há bloqueio por ter 5+ cartas; a troca obrigatória ocorre no início da fase de reforço.
        if(player.cards < 5){
            return this.#_deck.draw();
        }
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

        // Direciona o bônus para reforços pendentes (alocação na fase REFORÇAR)
        player.pendingReinforcements = (player.pendingReinforcements || 0) + bonus;

        for (const card of cards) {
            if (player.hasTerritory(card.name)) {
                // Aplica duas tropas diretamente no território (reforço imediato conforme regra)
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