import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CardManager } from './CardManager.js';
import { Deck } from './Deck.js';
import { PlayerCards } from './PlayerCards.js';
import { Player } from './Player.js';

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
            addArmies: vi.fn(),
            addArmiesExclusive: vi.fn(),
            hasTerritory: vi.fn((territoryName) => player.territories.includes(territoryName)),
        };

        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('should draw a card if the player has less than 5 cards', () => {
        const fakeCard = new PlayerCards({ name: 'Test Card', geometricShape: 'Square' });
        const playerWithFewCards = { cards: [] };

        Deck.prototype.draw.mockReturnValue(fakeCard);

        const drawnCard = cardManager.drawCardForPlayer(playerWithFewCards);

        expect(Deck.prototype.draw).toHaveBeenCalledTimes(1);
        expect(drawnCard).toBe(fakeCard);
    });

    it('should NOT draw a card if the player already has 5 cards', () => {
        const playerWithMaxCards = { cards: [1, 2, 3, 4, 5] };

        const drawnCard = cardManager.drawCardForPlayer(playerWithMaxCards);

        expect(Deck.prototype.draw).not.toHaveBeenCalled();
        expect(drawnCard).toBeUndefined();
    });

    describe('Card Exchange Logic', () => {
        it('should add 4 armies for the first valid exchange', () => {
            const cards = [
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Square' }),
                new PlayerCards({ name: 'C', geometricShape: 'Square' })
            ];

            cardManager.executeCardExchange(cards, player);

            expect(player.addArmies).toHaveBeenCalledWith(4);
            expect(Deck.prototype.discard).toHaveBeenCalledWith(cards);
        });

        it('should add 6 armies for the second valid exchange', () => {
            const firstSet = [
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Square' }),
                new PlayerCards({ name: 'C', geometricShape: 'Square' })
            ];
            cardManager.executeCardExchange(firstSet, player);

            const secondSet = [
                new PlayerCards({ name: 'D', geometricShape: 'Square' }),
                new PlayerCards({ name: 'E', geometricShape: 'Circle' }),
                new PlayerCards({ name: 'F', geometricShape: 'Triangle' })
            ];

            cardManager.executeCardExchange(secondSet, player);

            expect(player.addArmies).toHaveBeenLastCalledWith(6);
        });

        it('should correctly process an exchange with a Wildcard', () => {
            const cards = [
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Circle' }),
                new PlayerCards({ name: 'W', geometricShape: 'Wildcard' })
            ];

            cardManager.executeCardExchange(cards, player);

            expect(player.addArmies).toHaveBeenCalledWith(4);
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

        it('should add 20 armies for the 7th exchange', () => {
            const validSet = [
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Square' }),
                new PlayerCards({ name: 'C', geometricShape: 'Square' })
            ];

            for (let i = 0; i < 6; i++) {
                cardManager.executeCardExchange(validSet, player);
            }

            cardManager.executeCardExchange(validSet, player);

            expect(player.addArmies).toHaveBeenLastCalledWith(20);
        });

        it('should add 2 exclusive armies if player owns the territory on a card', () => {
            player.territories = ['A'];

            const cards = [
                new PlayerCards({ name: 'A', geometricShape: 'Square' }),
                new PlayerCards({ name: 'B', geometricShape: 'Square' }),
                new PlayerCards({ name: 'C', geometricShape: 'Square' })
            ];

            cardManager.executeCardExchange(cards, player);

            expect(player.addArmiesExclusive).toHaveBeenCalledWith('A', 2);
            expect(player.addArmies).toHaveBeenCalledWith(4);
        });
    });
});