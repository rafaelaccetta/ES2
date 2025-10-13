import { describe, it, expect } from 'vitest';
import { PlayerCards } from './PlayerCards.js';

describe('PlayerCards', () => {
    it('should create a card with the correct name and geometric shape', () => {
        const cardData = { name: 'Brazil', geometricShape: 'circle' };
        const card = new PlayerCards(cardData);

        expect(card.name).toBe('Brazil');
        expect(card.geometricShape).toBe('circle');
    });
});