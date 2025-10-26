import { describe, it, expect } from 'vitest';
import { Objective, EliminatePlayerObjective, DominateContinentObjective, TerritoryControlObjective, createObjectiveFromJson } from './Objective.js';
import { Player } from './Player.js';

function createMockGameState(players) {
    return {
        players: players,
        getTerritoriesByContinent: () => {
            return {
                "África": ["Território1", "Território2", "Território3"],
                "Oceania": ["Território4", "Território5"],
                "América do Norte": ["Território6", "Território7", "Território8", "Território9"],
                "Europa": ["Território10", "Território11", "Território12"]
            };
        }
    };
}

describe('Objective implementations', () => {
    it('EliminatePlayerObjective should detect elimination and fallback territory rule', () => {
        const playerA = new Player(0, 'azul');
        const playerB = new Player(1, 'vermelho');
        const objective = new EliminatePlayerObjective(1, 22);
        const gameState = createMockGameState([playerA, playerB]);

        expect(objective.checkWin(playerA, gameState)).toBe(false);

        playerB.isActive = false;
        expect(objective.checkWin(playerA, gameState)).toBe(true);

        const objectiveFallback = new EliminatePlayerObjective(0, 15, true);
        playerA.territories = Array(16).fill('Território');
        expect(objectiveFallback.checkWin(playerA, gameState)).toBe(true);
    });

    it('DominateContinentObjective should require full continent control plus extra territories', () => {
        const player = new Player(0, 'verde');
        const objective = new DominateContinentObjective(['África', 'Oceania'], 5);
        const gameState = createMockGameState([player]);

        expect(objective.checkWin(player, gameState)).toBe(false);

        player.territories = [
            'Território1', 'Território2', 'Território3',
            'Território4', 'Território5'
        ];
        player.territories.push('Extra1', 'Extra2', 'Extra3', 'Extra4', 'Extra5');

        expect(objective.checkWin(player, gameState)).toBe(true);
    });

    it('TerritoryControlObjective should check required territory count', () => {
        const player = new Player(0, 'branco');
        const objective = new TerritoryControlObjective(10);
        const gameState = createMockGameState([player]);

        expect(objective.checkWin(player, gameState)).toBe(false);

        player.territories = Array(12).fill('Território');
        expect(objective.checkWin(player, gameState)).toBe(true);
    });

    it('createObjectiveFromJson should create proper instances and preserve title', () => {
        const json = {
            id: 1,
            type: 'conquest',
            title: 'Conquistar África',
            description: 'Conquistar e controlar todos os territórios da África',
            target: { continents: ['África'] }
        };
        const inst = createObjectiveFromJson(json);
        expect(inst).not.toBeNull();
        expect(inst).toHaveProperty('title', 'Conquistar África');
        expect(inst).toHaveProperty('description', 'Conquistar e controlar todos os territórios da África');
    });
});
