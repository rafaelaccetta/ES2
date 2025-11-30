import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GameManager } from './GameManager.js';
import { Player } from './Player.js';
import { GameMap } from './GameMap.js';

vi.mock('./GameMap.js', () => {
    const GameMap = vi.fn();
    GameMap.prototype.distributeTerritories = vi.fn();
    // Default fallback
    GameMap.prototype.getTerritoriesByContinent = vi.fn().mockReturnValue({});
    GameMap.prototype.areAdjacent = vi.fn();
    GameMap.prototype.getArmies = vi.fn();
    GameMap.prototype.removeArmy = vi.fn();
    GameMap.prototype.addArmy = vi.fn();
    GameMap.prototype.getNeighbors = vi.fn().mockReturnValue([]);
    GameMap.prototype.armies = {};
    return { GameMap };
});

describe('GameManager: moveArmies', () => {

    let gameManager;
    let player1;
    let mockGameMapInstance;

    beforeEach(() => {
        vi.clearAllMocks();

        // FIX: Explicitly ensure this return value is set BEFORE new GameManager()
        // This prevents the constructor crash during initialization
        GameMap.prototype.getTerritoriesByContinent.mockReturnValue({});

        player1 = new Player(1, 'red');
        player1.addTerritory('Brasil');
        player1.addTerritory('Argentina');
        player1.addTerritory('Mexico');

        gameManager = new GameManager([player1]);

        mockGameMapInstance = GameMap.mock.instances[0];

        mockGameMapInstance.armies = {
            'Brasil': 5,
            'Argentina': 3,
            'Mexico': 2
        };

        // Ensure getArmies reads from the test data
        mockGameMapInstance.getArmies.mockImplementation((territory) => {
            return mockGameMapInstance.armies[territory] || 0;
        });

        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('deve mover exércitos com sucesso se todas as condições forem válidas', () => {
        const from = 'Brasil';
        const to = 'Argentina';
        const amount = 3;

        mockGameMapInstance.areAdjacent.mockReturnValue(true);

        const result = gameManager.moveArmies(from, to, amount);

        expect(result).toBe(true);
        expect(mockGameMapInstance.areAdjacent).toHaveBeenCalledWith(to, from);
        expect(mockGameMapInstance.removeArmy).toHaveBeenCalledWith(from, amount);
        expect(mockGameMapInstance.addArmy).toHaveBeenCalledWith(to, amount);
    });

    it('deve falhar se o jogador não possuir o território de ORIGEM', () => {
        const result = gameManager.moveArmies('EUA', 'Brasil', 1);

        expect(result).toBe(false);
        expect(mockGameMapInstance.areAdjacent).not.toHaveBeenCalled();
        expect(mockGameMapInstance.removeArmy).not.toHaveBeenCalled();
    });

    it('deve falhar se o jogador não possuir o território de DESTINO', () => {
        const result = gameManager.moveArmies('Brasil', 'EUA', 1);

        expect(result).toBe(false);
        expect(mockGameMapInstance.areAdjacent).not.toHaveBeenCalled();
        expect(mockGameMapInstance.removeArmy).not.toHaveBeenCalled();
    });

    it('deve falhar se os territórios não forem adjacentes', () => {
        const from = 'Brasil';
        const to = 'Mexico';

        mockGameMapInstance.areAdjacent.mockReturnValue(false);

        const result = gameManager.moveArmies(from, to, 1);

        expect(result).toBe(false);
        expect(mockGameMapInstance.areAdjacent).toHaveBeenCalledWith(to, from);
        expect(mockGameMapInstance.removeArmy).not.toHaveBeenCalled();
    });

    it('deve falhar se tentar mover TODOS os exércitos (deve sobrar 1)', () => {
        const from = 'Brasil';
        const to = 'Argentina';
        const amount = 5;

        mockGameMapInstance.areAdjacent.mockReturnValue(true);

        const result = gameManager.moveArmies(from, to, amount);

        expect(result).toBe(false);
        expect(mockGameMapInstance.removeArmy).not.toHaveBeenCalled();
    });

    it('deve falhar se tentar mover MAIS exércitos do que possui', () => {
        const from = 'Brasil';
        const to = 'Argentina';
        const amount = 6;

        mockGameMapInstance.areAdjacent.mockReturnValue(true);

        const result = gameManager.moveArmies(from, to, amount);

        expect(result).toBe(false);
        expect(mockGameMapInstance.removeArmy).not.toHaveBeenCalled();
    });

    it('deve falhar e retornar false se GameMap.removeArmy der erro', () => {
        const from = 'Brasil';
        const to = 'Argentina';
        const amount = 3;

        mockGameMapInstance.areAdjacent.mockReturnValue(true);

        const errorMsg = 'Erro simulado';
        mockGameMapInstance.removeArmy.mockImplementation(() => {
            throw new Error(errorMsg);
        });

        const result = gameManager.moveArmies(from, to, amount);

        expect(result).toBe(false);
        expect(mockGameMapInstance.addArmy).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith("Move failed with an unexpected error:", errorMsg);
    });
});