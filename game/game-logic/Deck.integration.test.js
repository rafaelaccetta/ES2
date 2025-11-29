import { describe, it, expect } from 'vitest';
import { Deck } from './Deck.js';
// Por enquanto, esse arquivo inteiro serve apenas para testar o deck sem mockar


describe('Deck Integration (Real Data)', () => {
    it('should load all cards from the actual JSON file correctly', () => {
        const deck = new Deck();

        const expectedTotalCards = 44;

        expect(deck.drawPileSize).toBe(expectedTotalCards);
    });

    it('should contain exactly 2 Wildcards in the real deck', () => {
        const deck = new Deck();
        const allCards = [];

        const totalCards = deck.drawPileSize;
        for (let i = 0; i < totalCards; i++) {
            allCards.push(deck.draw());
        }

        const wildcards = allCards.filter(c => c.geometricShape === 'Wildcard');

        expect(wildcards.length).toBe(2);
    });

    it('should have valid shapes for all territories', () => {
        const deck = new Deck();
        const allCards = [];
        const validShapes = ['Triangle', 'Circle', 'Square', 'Wildcard']; // Ajuste conforme seu JSON (Title Case ou lower case)


        const totalCards = deck.drawPileSize;
        for (let i = 0; i < totalCards; i++) {
            allCards.push(deck.draw());
        }

        const invalidCards = allCards.filter(card => {
            return !validShapes.includes(card.geometricShape) &&
                !validShapes.map(s => s.toLowerCase()).includes(card.geometricShape);
        });

        if (invalidCards.length > 0) {
            console.error("Cartas com formas inválidas encontradas:", invalidCards);
        }

        expect(invalidCards.length).toBe(0);
    });
});