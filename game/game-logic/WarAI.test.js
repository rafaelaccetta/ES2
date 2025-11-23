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
        // Preparação: Dá exércitos para a IA colocar
        playerAI.armies = 5;
        const territoryId = playerAI.territories[0];
        const initialTroops = gameManager.getTerritoryArmies(territoryId);

        // Mock da decisão da IA para garantir consistência
        vi.spyOn(warAI, 'decidePlacement').mockReturnValue(territoryId);

        // Execução
        gameManager.executeAIPlacement(warAI, playerAI);

        // Verificação
        const finalTroops = gameManager.getTerritoryArmies(territoryId);
        expect(finalTroops).toBe(initialTroops + 5);
        expect(playerAI.armies).toBe(0);
    });

    it('should execute an attack sequence and reduce troops', () => {
        // Setup do cenário de ataque
        const aiTerritory = playerAI.territories[0];

        // Pega um vizinho inimigo (ou cria conexão se não houver)
        let enemyNeighbors = gameManager.getEnemyNeighbors(aiTerritory, playerAI.id);
        if (enemyNeighbors.length === 0) {
            const enemyTerr = enemyPlayer.territories[0];
            gameManager.gameMap.territories.addEdge(aiTerritory, enemyTerr);
            gameManager.gameMap.territories.addEdge(enemyTerr, aiTerritory);
            enemyNeighbors = gameManager.getEnemyNeighbors(aiTerritory, playerAI.id);
        }

        const targetTerritoryId = enemyNeighbors[0].id;

        // Configura tropas: IA forte (10), Inimigo fraco (1)
        gameManager.gameMap.setArmies(aiTerritory, 10);
        gameManager.gameMap.setArmies(targetTerritoryId, 1);

        // Mock para garantir que a IA decida atacar este alvo específico
        // O retorno deve ser apenas os IDs, pois o resolveAttack busca o estado real depois
        vi.spyOn(warAI, 'decideAttack')
            .mockReturnValueOnce({
                from: aiTerritory,
                to: targetTerritoryId
            })
            .mockReturnValue(null); // Para o loop depois do primeiro ataque

        // Execução
        gameManager.executeAIAttack(warAI);

        // Verificação: 
        // Como é 10 vs 1, sempre haverá redução na origem (perda ou movimento).
        const currentAttackerTroops = gameManager.getTerritoryArmies(aiTerritory);
        expect(currentAttackerTroops).toBeLessThan(10);
    });

    it('should move troops during Fortification phase', () => {
        // Setup: dois territórios aliados conectados
        const t1 = playerAI.territories[0];
        let t2 = playerAI.territories[1];

        // Se o player só tem 1 território (azar no shuffle), adiciona outro forçado
        if (!t2) {
            t2 = 'territory_mock_friend';
            playerAI.addTerritory(t2);
            gameManager.gameMap.territories.addVertex(t2);
            gameManager.gameMap.setArmies(t2, 1);
        }

        // Garante conexão entre eles
        if (!gameManager.getNeighbors(t1).includes(t2)) {
            gameManager.gameMap.territories.addEdge(t1, t2);
            gameManager.gameMap.territories.addEdge(t2, t1);
        }

        // T1 tem muitas tropas, T2 precisa de ajuda
        gameManager.gameMap.setArmies(t1, 10);
        gameManager.gameMap.setArmies(t2, 1);

        // Mock da decisão
        vi.spyOn(warAI, 'decideFortification').mockReturnValue({
            from: t1,
            to: t2,
            numTroops: 5
        });

        // Execução
        gameManager.executeAIFortification(warAI);

        // Verificação
        expect(gameManager.getTerritoryArmies(t1)).toBe(5);
        expect(gameManager.getTerritoryArmies(t2)).toBe(6);
    });

    it('should correctly prioritize objectives in scoring logic', () => {
        // Teste da lógica interna de pontuação da IA
        const territory = { id: 'BR', ownerId: 99 };

        // Mock do gameManager para simular continente
        const mockManager = {
            getTerritoryContinent: () => ({ key: 'SA', name: 'South America' }),
            players: [],
            getTerritoryOwner: () => null
        };

        const score = warAI._scoreForObjective(territory, mockManager);
        // Esperado 50 pois 'SA' está nos targets definidos no beforeEach
        expect(score).toBe(50);
    });
});