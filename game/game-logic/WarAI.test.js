import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WarAI } from './WarAI.js';
import { GameManager } from './GameManager.js';
import { Player } from './Player.js';

describe('WarAI Integration System', () => {
    let gameManager;
    let playerAI;
    let enemyPlayer;
    let warAI;

    beforeEach(() => {
        // Setup básico antes de cada teste
        playerAI = new Player(1, 'blue', null, true);
        enemyPlayer = new Player(2, 'red', null, false);

        // Inicializa jogo
        gameManager = new GameManager([playerAI, enemyPlayer]);

        // Configura IA
        const aiObjective = { type: 'CONQUER_CONTINENTS', targets: ['SA'] };
        warAI = new WarAI(playerAI.id, aiObjective);

        // Registra IA no manager manualmente para isolamento
        gameManager.AIs = [warAI];
    });

    it('should correctly place troops during Reinforcement phase', () => {
        playerAI.armies = 5;
        const territoryId = playerAI.territories[0];
        const initialTroops = gameManager.getTerritoryArmies(territoryId);

        vi.spyOn(warAI, 'decidePlacement').mockReturnValue(territoryId);

        gameManager.executeAIPlacement(warAI, playerAI);

        const finalTroops = gameManager.getTerritoryArmies(territoryId);
        expect(finalTroops).toBe(initialTroops + 5);
        expect(playerAI.armies).toBe(0);
    });

    it('should execute an attack sequence and reduce troops', () => {
        const aiTerritory = playerAI.territories[0];

        let enemyNeighbors = gameManager.getEnemyNeighbors(aiTerritory, playerAI.id);
        if (enemyNeighbors.length === 0) {
            const enemyTerr = enemyPlayer.territories[0];
            gameManager.gameMap.territories.addEdge(aiTerritory, enemyTerr);
            gameManager.gameMap.territories.addEdge(enemyTerr, aiTerritory);
            enemyNeighbors = gameManager.getEnemyNeighbors(aiTerritory, playerAI.id);
        }

        const targetTerritoryId = enemyNeighbors[0].id;

        gameManager.gameMap.setArmies(aiTerritory, 10);
        gameManager.gameMap.setArmies(targetTerritoryId, 1);

        vi.spyOn(warAI, 'decideAttack')
            .mockReturnValueOnce({
                from: aiTerritory,
                to: targetTerritoryId
            })
            .mockReturnValue(null);

        gameManager.executeAIAttack(warAI);

        const currentAttackerTroops = gameManager.getTerritoryArmies(aiTerritory);
        expect(currentAttackerTroops).toBeLessThan(10);
    });

    it('should move troops during Fortification phase', () => {
        const t1 = playerAI.territories[0];
        let t2 = playerAI.territories[1];

        if (!t2) {
            t2 = 'territory_mock_friend';
            playerAI.addTerritory(t2);
            gameManager.gameMap.territories.addVertex(t2);
            gameManager.gameMap.setArmies(t2, 1);
        }

        if (!gameManager.getNeighbors(t1).includes(t2)) {
            gameManager.gameMap.territories.addEdge(t1, t2);
            gameManager.gameMap.territories.addEdge(t2, t1);
        }

        gameManager.gameMap.setArmies(t1, 10);
        gameManager.gameMap.setArmies(t2, 1);

        vi.spyOn(warAI, 'decideFortification').mockReturnValue({
            from: t1,
            to: t2,
            numTroops: 5
        });

        gameManager.executeAIFortification(warAI);

        expect(gameManager.getTerritoryArmies(t1)).toBe(5);
        expect(gameManager.getTerritoryArmies(t2)).toBe(6);
    });

    it('should correctly prioritize objectives in scoring logic', () => {
        const territory = { id: 'BR', ownerId: 99 };
        const mockManager = {
            getTerritoryContinent: () => ({ key: 'SA', name: 'South America' }),
            players: [],
            getTerritoryOwner: () => null
        };

        const score = warAI._scoreForObjective(territory, mockManager);
        expect(score).toBe(50);
    });

    it('should record actions in the log during AI execution', () => {
        // Teste da nova funcionalidade de log
        playerAI.armies = 1;
        const territoryId = playerAI.territories[0];
        vi.spyOn(warAI, 'decidePlacement').mockReturnValue(territoryId);

        // Executa uma colocação
        gameManager.executeAIPlacement(warAI, playerAI);

        // Verifica se o log foi preenchido com a mensagem em Português
        expect(gameManager.logs.length).toBeGreaterThan(0);
        const lastLog = gameManager.logs[gameManager.logs.length - 1];
        expect(lastLog.message).toContain(`colocou 1 exército em ${territoryId}`);
    });
});