//Testes unitários para Objective.js
import { Objective, EliminatePlayerObjective, DominateContinentObjective, TerritoryControlObjective } from "./Objective.js";
import { Player } from "./Player.js";

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

// Testes para EliminatePlayerObjective
function testEliminatePlayerObjective() {
    const playerA = new Player(0, "azul");
    const playerB = new Player(1, "vermelho");
    const objective = new EliminatePlayerObjective(1, 22);
    const gameState = createMockGameState([playerA, playerB]);

    console.assert(!objective.checkWin(playerA, gameState), "Teste 1 falhou");

    playerB.isActive = false;

    console.assert(objective.checkWin(playerA, gameState), "Teste 2 falhou");

    const objectiveFallback = new EliminatePlayerObjective(0, 15, true);
    playerA.territories = Array(16).fill("Território");

    console.assert(objectiveFallback.checkWin(playerA, gameState), "Teste 3 falhou");
}

// Testes para DominateContinentObjective
function testDominateContinentObjective() {
    const player = new Player(0, "verde");
    const objective = new DominateContinentObjective(["África", "Oceania"], 5);
    const gameState = createMockGameState([player]);
        
    console.assert(!objective.checkWin(player, gameState), "Teste 4 falhou");
    
    player.territories = [
        "Território1", "Território2", "Território3",
        "Território4", "Território5",               
    ];
    
    player.territories.push(
        "Extra1", "Extra2", "Extra3", "Extra4", "Extra5"
    );
    
    console.assert(objective.checkWin(player, gameState), "Teste 5 falhou: O jogador deveria vencer com 10 territórios e dominação de continentes.");
}

// Testes para TerritoryControlObjective
function testTerritoryControlObjective() {
    const player = new Player(0, "branco");
    const objective = new TerritoryControlObjective(10);
    const gameState = createMockGameState([player]);

    console.assert(!objective.checkWin(player, gameState), "Teste 6 falhou");

    player.territories = Array(12).fill("Território");

    console.assert(objective.checkWin(player, gameState), "Teste 7 falhou");
}

// Executa os testes
testEliminatePlayerObjective();
testDominateContinentObjective();
testTerritoryControlObjective();
console.log("Todos os testes foram concluídos.");