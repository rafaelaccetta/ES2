import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Deck } from './Deck.js';
import { PlayerCards } from './PlayerCards.js';

vi.mock('../public/data/territories_cards.json', () => ({
    default: {
        Brasil: 'Square',
        Argentina: 'Circle',
        Peru: 'Triangle',
        Venezuela: 'Square'
    }
}));

describe('Deck', () => {
    let deck;

    beforeEach(() => {
        deck = new Deck();
    });

    it('should load and create 4 cards from the mocked data', () => {
        expect(deck.drawPileSize).toBe(4);
    });

    it('should draw a card and reduce the draw pile size', () => {
        const initialSize = deck.drawPileSize;
        const card = deck.draw();

        expect(card).toBeInstanceOf(PlayerCards);
        expect(deck.drawPileSize).toBe(initialSize - 1);
    });

    it('should move discarded cards to the discard pile', () => {
        const cardsToDiscard = [deck.draw(), deck.draw()];
        deck.discard(cardsToDiscard);

        expect(deck.discardPileSize).toBe(2);
        expect(deck.drawPileSize).toBe(2);
    });

    it('should recycle the discard pile when the draw pile is empty', () => {
        const drawnCards = [deck.draw(), deck.draw(), deck.draw(), deck.draw()];
        deck.discard([drawnCards[0], drawnCards[1]]);

        expect(deck.drawPileSize).toBe(0);
        expect(deck.discardPileSize).toBe(2);

        const recycledCard = deck.draw();

        expect(recycledCard).toBeInstanceOf(PlayerCards);
        expect(deck.drawPileSize).toBe(1);
        expect(deck.discardPileSize).toBe(0);
    });
});