import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CardManager } from './CardManager.js';
import { Deck } from './Deck.js';
import { PlayerCards } from './PlayerCards.js';

vi.mock('./Deck.js');

describe('CardManager', () => {
    let cardManager;

    beforeEach(() => {
        cardManager = new CardManager();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should draw a card by calling deck.draw', () => {
        const fakeCard = new PlayerCards({ name: 'Test Card', geometricShape: 'Square' });
        Deck.prototype.draw.mockReturnValue(fakeCard);

        const drawnCard = cardManager.drawCardForPlayer();

        expect(Deck.prototype.draw).toHaveBeenCalledTimes(1);
        expect(drawnCard).toBe(fakeCard);
    });

    describe('Card Exchange Logic', () => {
        it('should return 4 armies for the first valid exchange of same shapes', () => {
            const cards = [
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Square' }),
                new PlayerCards({ name: 'C', geometricShape: 'Square' })
            ];

            const bonus = cardManager.exchangeCards(cards);

            expect(bonus).toBe(4);
            expect(Deck.prototype.discard).toHaveBeenCalledWith(cards);
        });

        it('should return 6 armies for the second valid exchange of different shapes', () => {
            cardManager.exchangeCards([
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Square' }),
                new PlayerCards({ name: 'C', geometricShape: 'Square' })
            ]);

            // Second exchange
            const cards = [
                new PlayerCards({ name: 'D', geometricShape: 'Square' }),
                new PlayerCards({ name: 'E', geometricShape: 'Circle' }),
                new PlayerCards({ name: 'F', geometricShape: 'Triangle' })
            ];

            const bonus = cardManager.exchangeCards(cards);
            expect(bonus).toBe(6);
        });

        it('should correctly process an exchange with a Wildcard', () => {
            const cards = [
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Circle' }),
                new PlayerCards({ name: 'W', geometricShape: 'Wildcard' })
            ];

            const bonus = cardManager.exchangeCards(cards);
            expect(bonus).toBe(4); // First exchange
            expect(Deck.prototype.discard).toHaveBeenCalledWith(cards);
        });

        it('should return 0 for an invalid set and not discard the cards', () => {
            const cards = [
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Square' }),
                new PlayerCards({ name: 'F', geometricShape: 'Triangle' })
            ];

            const bonus = cardManager.exchangeCards(cards);

            expect(bonus).toBe(0);
            expect(Deck.prototype.discard).not.toHaveBeenCalled();
        });

        it('should return 20 armies for the 7th exchange', () => {
            const validSet = [
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Square' }),
                new PlayerCards({ name: 'C', geometricShape: 'Square' })
            ];

            for (let i = 0; i < 6; i++) {
                cardManager.exchangeCards(validSet);
            }

            const bonus = cardManager.exchangeCards(validSet);
            expect(bonus).toBe(20);
        });
    });
});