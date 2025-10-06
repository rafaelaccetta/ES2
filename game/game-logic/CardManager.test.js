import { CardManager } from './CardManager.js';
import { Deck } from './Deck.js';
import { PlayerCards } from './PlayerCards.js';

// Mock the entire Deck class
jest.mock('./Deck.js');

describe('CardManager', () => {
    let cardManager;
    let mockDeckInstance;

    beforeEach(() => {
        Deck.mockClear();

        cardManager = new CardManager();
        mockDeckInstance = Deck.mock.instances[0];
    });

    it('should draw a card by calling deck.draw', () => {
        const fakeCard = new PlayerCards({ name: 'Test Card', geometricShape: 'Square' });
        // Configure the mock's draw method to return our fake card
        mockDeckInstance.draw.mockReturnValue(fakeCard);

        const drawnCard = cardManager.drawCardForPlayer();

        expect(mockDeckInstance.draw).toHaveBeenCalledTimes(1);
        expect(drawnCard).toBe(fakeCard);
    });

    describe('Card Exchange Logic', () => {
        it('should return 4 armies for the first valid exchange of same shapes', () => {
            const cards = [
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Square' }),
                new PlayerCards({ name: 'C', geometricShape: 'Square' }),
            ];

            const bonus = cardManager.exchangeCards(cards);

            expect(bonus).toBe(4);
            // Verify that the manager told the deck to discard these cards
            expect(mockDeckInstance.discard).toHaveBeenCalledWith(cards);
        });

        it('should return 6 armies for the second valid exchange of different shapes', () => {
            // First exchange
            cardManager.exchangeCards([
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Square' }),
                new PlayerCards({ name: 'C', geometricShape: 'Square' }),
            ]);

            // Second exchange
            const cards = [
                new PlayerCards({ name: 'D', geometricShape: 'Square' }),
                new PlayerCards({ name: 'E', geometricShape: 'Circle' }),
                new PlayerCards({ name: 'F', geometricShape: 'Triangle' }),
            ];

            const bonus = cardManager.exchangeCards(cards);
            expect(bonus).toBe(6);
        });

        it('should correctly process an exchange with a Wildcard', () => {
            const cards = [
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Circle' }),
                new PlayerCards({ name: 'W', geometricShape: 'Wildcard' }),
            ];

            const bonus = cardManager.exchangeCards(cards);
            expect(bonus).toBe(4); // First exchange
            expect(mockDeckInstance.discard).toHaveBeenCalledWith(cards);
        });

        it('should return 0 for an invalid set and not discard the cards', () => {
            const cards = [
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Square' }),
                new PlayerCards({ name: 'F', geometricShape: 'Triangle' }),
            ];

            const bonus = cardManager.exchangeCards(cards);

            expect(bonus).toBe(0);
            // Verify that the deck's discard method was NOT called
            expect(mockDeckInstance.discard).not.toHaveBeenCalled();
        });

        it('should return 20 armies for the 7th exchange', () => {
            const validSet = [
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Square' }),
                new PlayerCards({ name: 'C', geometricShape: 'Square' }),
            ];

            // Perform 6 exchanges to use up the initial bonus list [4, 6, 8, 10, 12, 15]
            for (let i = 0; i < 6; i++) {
                cardManager.exchangeCards(validSet);
            }

            // The 7th exchange should be 15 (last bonus) + 5
            const bonus = cardManager.exchangeCards(validSet);
            expect(bonus).toBe(20);
        });
    });
});