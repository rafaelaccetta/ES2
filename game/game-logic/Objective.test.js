import { describe, it, expect } from 'vitest';
import {
    EliminatePlayerObjective,
    TerritoryControlObjective,
    DominateContinentObjective
} from './Objective.js';

// --- MOCK DATA ---
// A mock player object for testing purposes
const createMockPlayer = (id, color, territoryCount, isActive = true) => ({
    id,
    color,
    isActive,
    getTerritoriesCount: () => territoryCount,
    // Add other methods if needed by other objectives
    hasConqueredContinent: () => false,
});

describe('Objective System', () => {

    // --- TESTS FOR THE BUGGY OBJECTIVE ---
    describe('EliminatePlayerObjective', () => {
        it('should return TRUE if player meets territory count, even if target is active (Your Friend\'s Bug)', () => {
            const player1 = createMockPlayer(1, 'azul', 24);
            const targetPlayer = createMockPlayer(2, 'vermelho', 5, true); // Target is still active
            const gameState = { players: [player1, targetPlayer] };

            const objective = new EliminatePlayerObjective('vermelho', 24);

            expect(objective.checkWin(player1, gameState)).toBe(true);
        });

        it('should return TRUE if target player is eliminated, even if territory count is not met', () => {
            const player1 = createMockPlayer(1, 'azul', 10); // Does not have 24 territories
            const targetPlayer = createMockPlayer(2, 'vermelho', 0, false); // Target is eliminated
            const gameState = { players: [player1, targetPlayer] };

            const objective = new EliminatePlayerObjective('vermelho', 24);

            expect(objective.checkWin(player1, gameState)).toBe(true);
        });

        it('should return FALSE if neither elimination nor territory count is met', () => {
            const player1 = createMockPlayer(1, 'azul', 23); // Not enough territories
            const targetPlayer = createMockPlayer(2, 'vermelho', 5, true); // Target is active
            const gameState = { players: [player1, targetPlayer] };

            const objective = new EliminatePlayerObjective('vermelho', 24);

            expect(objective.checkWin(player1, gameState)).toBe(false);
        });

        it('should correctly use fallback when the target is the player themselves', () => {
            const player1 = createMockPlayer(1, 'vermelho', 23); // Player is the target
            const gameState = { players: [player1] };

            const objective = new EliminatePlayerObjective('vermelho', 24);

            // With 23 territories, they should NOT win
            expect(objective.checkWin(player1, gameState)).toBe(false);

            // Now give them 24 territories
            const winningPlayer = createMockPlayer(1, 'vermelho', 24);
            expect(objective.checkWin(winningPlayer, gameState)).toBe(true);
        });
    });

    // --- Basic tests for other objectives to ensure they still work ---
    describe('TerritoryControlObjective', () => {
        it('should return true when player controls enough territories', () => {
            const player = createMockPlayer(1, 'azul', 18);
            const objective = new TerritoryControlObjective(18);
            expect(objective.checkWin(player, {})).toBe(true);
        });

        it('should return false when player does not control enough territories', () => {
            const player = createMockPlayer(1, 'azul', 17);
            const objective = new TerritoryControlObjective(18);
            expect(objective.checkWin(player, {})).toBe(false);
        });
    });

    describe('DominateContinentObjective', () => {
        it('should return true when continents and territory counts are met', () => {
            const player = createMockPlayer(1, 'verde', 30);

            // Mock that the player has conquered the required continent
            player.hasConqueredContinent = (continentName) => continentName === 'SA';

            const gameState = {
                getTerritoriesByContinent: () => ({
                    'SA': ['Brasil', 'Argentina', 'Peru', 'Venezuela'], // 4 territories
                    'NA': ['Mexico', 'California', 'etc']
                })
            };

            // Objective: Conquer SA (4 territories) + 20 additional territories = 24 total
            const objective = new DominateContinentObjective(['SA'], 20);

            // Player has 30 territories, so this should pass
            expect(objective.checkWin(player, gameState)).toBe(true);
        });
    });

});