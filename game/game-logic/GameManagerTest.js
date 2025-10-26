import { GameManager } from "./GameManager.js";
import { DominateContinentObjective, EliminatePlayerObjective, TerritoryControlObjective } from "./Objective.js";
import { Player } from "./Player.js";
import objectivesData from "../public/data/objectives.json" with {type: "json"};

// Exemplo de jogadores
const players = [
    new Player(0, "azul"),
    new Player(1, "vermelho"),
    new Player(2, "verde"),
    new Player(3, "branco"),
];

const objetivosJson = objectivesData.objectives;

// Exemplo de objetivos usando as classes definidas em Objective.js
const objetivos = [
    new EliminatePlayerObjective(1, 22), // Eliminar o jogador com ID 1 ou conquistar 22 territórios
    new DominateContinentObjective(["África", "Oceania"], 10), // Controlar África e Oceania + 10 territórios
    new TerritoryControlObjective(24), // Conquistar 24 territórios
    new DominateContinentObjective(["América do Norte", "Europa"], 8), // Controlar América do Norte e Europa + 8 territórios
];

const manager = new GameManager(players);
manager.distributeObjectives(objetivos);

console.log("Objetivos distribuídos:");
for (const player of players) {
    console.log(
        'Jogador ' + player.id + ' recebeu o objetivo: ' + player.objective.description
    );
}

