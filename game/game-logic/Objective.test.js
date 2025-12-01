import { describe, it, expect, vi } from 'vitest';
import {
    EliminatePlayerObjective,
    TerritoryControlObjective,
    DominateContinentObjective,
    createObjectiveFromJson
} from './Objective.js';
import {Objective} from "./Objective";

// --- MOCK DATA ---
// Um objeto de jogador mock para propósitos de teste
const createMockPlayer = (id, color, territoryCount, isActive = true) => ({
    id,
    color,
    isActive,
    getTerritoriesCount: () => territoryCount,
    // Mock para controle de continente, pode ser sobrescrito em testes específicos
    hasConqueredContinent: () => false,
});

// Mock do gameState para testes de domínio de continente
const mockGameState = {
    getTerritoriesByContinent: () => ({
        'SA': ['Brasil', 'Argentina', 'Peru', 'Venezuela'], // 4 territórios
        'NA': ['Mexico', 'California', 'New York', 'Ottawa', 'Labrador', 'Alaska', 'Groelandia', 'Vancouver'], // 8 territórios
        'EU': ['Inglaterra', 'Alemanha', 'França', 'Espanha', 'Italia', 'Suecia', 'Polonia'], // 7 territórios
        'AF': ['Egito', 'Sudao', 'Congo', 'Madagascar', 'Africa do Sul', 'Argelia'], // 6 territórios
        'AS': ['China', 'Japao', 'India', 'Siberia', 'Mongolia', 'Aral', 'Omsk', 'Dudinka', 'Tchita', 'Vladivostok', 'Oriente Medio', 'Vietna'], // 12 territórios
        'OC': ['Australia', 'Nova Zelandia', 'Perth', 'Borneu'] // 4 territórios
    })
};


describe('Sistema de Objetivos', () => {

    // --- TESTES PARA O OBJETIVO DE ELIMINAÇÃO ---
    describe('EliminatePlayerObjective', () => {
        it('deve retornar TRUE se o jogador atingir a contagem de territórios, mesmo com o alvo ativo', () => {
            const player1 = createMockPlayer(1, 'azul', 24);
            const targetPlayer = createMockPlayer(2, 'vermelho', 5, true); // Alvo ainda ativo
            const gameState = { players: [player1, targetPlayer] };
            const objective = new EliminatePlayerObjective('vermelho', 24);
            expect(objective.checkWin(player1, gameState)).toBe(true);
        });

        it('deve retornar TRUE se o jogador alvo for eliminado, mesmo sem a contagem de territórios', () => {
            const player1 = createMockPlayer(1, 'azul', 10); // Não possui 24 territórios
            const targetPlayer = createMockPlayer(2, 'vermelho', 0, false); // Alvo foi eliminado
            const gameState = { players: [player1, targetPlayer] };
            const objective = new EliminatePlayerObjective('vermelho', 24);
            expect(objective.checkWin(player1, gameState)).toBe(true);
        });

        it('deve retornar FALSE se nem a eliminação nem a contagem de territórios forem atendidas', () => {
            const player1 = createMockPlayer(1, 'azul', 23); // Territórios insuficientes
            const targetPlayer = createMockPlayer(2, 'vermelho', 5, true); // Alvo está ativo
            const gameState = { players: [player1, targetPlayer] };
            const objective = new EliminatePlayerObjective('vermelho', 24);
            expect(objective.checkWin(player1, gameState)).toBe(false);
        });

        it('deve usar corretamente a alternativa quando o alvo é o próprio jogador', () => {
            const player1 = createMockPlayer(1, 'vermelho', 23); // O jogador é o alvo
            const gameState = { players: [player1] };
            const objective = new EliminatePlayerObjective('vermelho', 24);

            // Com 23 territórios, ele NÃO deve vencer
            expect(objective.checkWin(player1, gameState)).toBe(false);

            // Agora com 24 territórios
            const winningPlayer = createMockPlayer(1, 'vermelho', 24);
            expect(objective.checkWin(winningPlayer, gameState)).toBe(true);
        });
    });

    // --- TESTES BÁSICOS E NOVOS TESTES PARA CONTROLE DE TERRITÓRIO E CONTINENTE ---
    describe('TerritoryControlObjective', () => {
        it('deve retornar true quando o jogador controla territórios suficientes', () => {
            const player = createMockPlayer(1, 'azul', 18);
            const objective = new TerritoryControlObjective(18);
            expect(objective.checkWin(player, {})).toBe(true);
        });

        it('deve retornar false quando o jogador não controla territórios suficientes', () => {
            const player = createMockPlayer(1, 'azul', 17);
            const objective = new TerritoryControlObjective(18);
            expect(objective.checkWin(player, {})).toBe(false);
        });
    });

    describe('DominateContinentObjective', () => {
        it('deve retornar true quando continentes e contagem de territórios são atendidos', () => {
            const player = createMockPlayer(1, 'verde', 24); // 4 da SA + 20 extras = 24
            player.hasConqueredContinent = (continentName) => continentName === 'SA';
            const objective = new DominateContinentObjective(['SA'], 20);
            expect(objective.checkWin(player, mockGameState)).toBe(true);
        });

        // --- INÍCIO DOS NOVOS TESTES ---
        it('deve retornar FALSE se o continente é controlado, mas os territórios extras não são suficientes', () => {
            const player = createMockPlayer(1, 'verde', 23); // Precisa de 24 (4 SA + 20)
            player.hasConqueredContinent = (continentName) => continentName === 'SA';
            const objective = new DominateContinentObjective(['SA'], 20);
            expect(objective.checkWin(player, mockGameState)).toBe(false);
        });

        it('deve retornar FALSE se a contagem total de territórios é suficiente, mas o continente não é controlado', () => {
            const player = createMockPlayer(1, 'verde', 30);
            player.hasConqueredContinent = () => false; // Falha na verificação do continente
            const objective = new DominateContinentObjective(['SA'], 20);
            expect(objective.checkWin(player, mockGameState)).toBe(false);
        });

        it('deve funcionar para múltiplos continentes (objetivo misto)', () => {
            // Objetivo: Conquistar NA (8 territórios) e AF (6 territórios) + 9 extras = 23 no total
            const player = createMockPlayer(1, 'amarelo', 23);
            player.hasConqueredContinent = (c) => c === 'NA' || c === 'AF';
            const objective = new DominateContinentObjective(['NA', 'AF'], 9);
            expect(objective.checkWin(player, mockGameState)).toBe(true);
        });

        it('deve FALHAR para múltiplos continentes se um deles não for conquistado', () => {
            const player = createMockPlayer(1, 'amarelo', 30); // Territórios mais que suficientes
            player.hasConqueredContinent = (c) => c === 'NA'; // Mas só conquistou a NA, não a AF
            const objective = new DominateContinentObjective(['NA', 'AF'], 9);
            expect(objective.checkWin(player, mockGameState)).toBe(false);
        });
        // --- FIM DOS NOVOS TESTES ---
    });

    // --- INÍCIO DA NOVA SUÍTE DE TESTES PARA A FÁBRICA ---
    describe('createObjectiveFromJson Factory', () => {

        // Mock para o import do JSON de continentes, para isolar o teste
        vi.mock("../public/data/continents.json", () => ({
            default: {
                "SA": { "name": "América do Sul" },
                "NA": { "name": "América do Norte" },
                "EU": { "name": "Europa" },
                "OC": { "name": "Oceania" },
            }
        }));


        it('deve criar um TerritoryControlObjective a partir do JSON', () => {
            const json = {
                type: 'territory_count',
                target: { territory_count: 18 },
                description: 'Conquistar 18 territórios'
            };
            const objective = createObjectiveFromJson(json);
            expect(objective).toBeInstanceOf(TerritoryControlObjective);
            expect(objective.requiredTerritories).toBe(18);
            expect(objective.description).toBe('Conquistar 18 territórios');
        });

        it('deve criar um EliminatePlayerObjective a partir do JSON', () => {
            const json = {
                type: 'elimination',
                target: { eliminate_player: 'verde', fallbackTerritories: 24 }
            };
            const objective = createObjectiveFromJson(json);
            expect(objective).toBeInstanceOf(EliminatePlayerObjective);
            expect(objective.targetIdentifier).toBe('verde');
            expect(objective.fallbackTerritories).toBe(24);
        });

        it('deve criar um DominateContinentObjective a partir do tipo "conquest"', () => {
            const json = {
                type: 'conquest',
                target: { continents: ['NA'], territory_count: 15 }
            };
            const objective = createObjectiveFromJson(json);
            expect(objective).toBeInstanceOf(DominateContinentObjective);
            expect(objective.continents).toEqual(['América do Norte']);
            expect(objective.extraTerritories).toBe(15);
        });

        it('deve criar um DominateContinentObjective a partir do tipo "mixed"', () => {
            const json = {
                type: 'mixed',
                target: { continents: ['EU', 'OC'], territory_count: 13 }
            };
            const objective = createObjectiveFromJson(json);
            expect(objective).toBeInstanceOf(DominateContinentObjective);
            expect(objective.continents).toEqual(['Europa', 'Oceania']);
            expect(objective.extraTerritories).toBe(13);
        });

        it('deve retornar nulo para entrada inválida ou sem tipo', () => {
            expect(createObjectiveFromJson(null)).toBeNull();
            expect(createObjectiveFromJson({})).toBeNull();
            expect(createObjectiveFromJson({ type: 'unknown' })).toBeInstanceOf(Objective);
        });
    });
    // --- FIM DA NOVA SUÍTE DE TESTES ---
});