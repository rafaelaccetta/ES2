import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CardManager } from './CardManager.js';
import { Deck } from './Deck.js';
import { PlayerCards } from './PlayerCards.js';

vi.mock('./Deck.js');

describe('CardManager', () => {
    let cardManager;
    let player;

    beforeEach(() => {
        vi.clearAllMocks();

        cardManager = new CardManager();

        player = {
            id: 1,
            cards: [],
            territories: [],
            // Mocks for Player methods
            addArmies: vi.fn(),
            addArmiesExclusive: vi.fn(),
            addCard: vi.fn(function(c) { this.cards.push(c); }),
            hasTerritory: vi.fn((territoryName) => player.territories.includes(territoryName)),
        };

        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('should draw a card if the player has less than 5 cards', () => {
        const fakeCard = new PlayerCards({ name: 'Test Card', geometricShape: 'Square' });
        const playerWithFewCards = { ...player, cards: [] };

        Deck.prototype.draw.mockReturnValue(fakeCard);

        const drawnCard = cardManager.drawCardForPlayer(playerWithFewCards);

        expect(Deck.prototype.draw).toHaveBeenCalledTimes(1);
        expect(drawnCard).toBe(fakeCard);
    });

    it('should NOT draw a card if the player already has 5 cards', () => {
        const playerWithMaxCards = { ...player, cards: [1, 2, 3, 4, 5] };

        const drawnCard = cardManager.drawCardForPlayer(playerWithMaxCards);

        expect(Deck.prototype.draw).not.toHaveBeenCalled();
        expect(drawnCard).toBeUndefined();
    });

    describe('Card Exchange Logic', () => {

        it('should correctly process an exchange with a Wildcard', () => {
            const cards = [
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Circle' }),
                new PlayerCards({ name: 'W', geometricShape: 'Wildcard' })
            ];

            cardManager.executeCardExchange(cards, player);

            expect(Deck.prototype.discard).toHaveBeenCalledWith(cards);
        });

        it('should not add armies or discard cards for an invalid set', () => {
            const cards = [
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Square' }),
                new PlayerCards({ name: 'F', geometricShape: 'Triangle' })
            ];

            cardManager.executeCardExchange(cards, player);

            expect(player.addArmies).not.toHaveBeenCalled();
            expect(Deck.prototype.discard).not.toHaveBeenCalled();
            expect(console.warn).toHaveBeenCalledWith("Invalid set of cards for exchange.");
        });

        it('should add 2 exclusive armies if player owns the territory on a card', () => {
            player.territories = ['A'];

            const cards = [
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Square' }),
                new PlayerCards({ name: 'C', geometricShape: 'Square' })
            ];

            cardManager.executeCardExchange(cards, player);

            // Expect call with (TerritoryName, Amount)
            expect(player.addArmiesExclusive).toHaveBeenCalledWith('A', 2);
        });
    });
});