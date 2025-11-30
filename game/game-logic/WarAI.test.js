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