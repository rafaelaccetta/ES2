import { GameManager } from "./GameManager.js";
import { Player } from "./Player.js";
import objectivesData from "../public/data/objectives.json" with {type: "json"};

// Exemplo de jogadores
const players = [
    new Player(0, "azul"),
    new Player(1, "vermelho"),
    new Player(2, "verde"),
    new Player(3, "branco"),
];

const objetivos = objectivesData.objectives;

const manager = new GameManager(players);
manager.distributeObjectives(objetivos);

console.log("Objetivos distribuídos:");
for (const player of players) {
    console.log(
        `Player ${player.id} (${player.color}): objetivo -> ${player.objective.title} - ${player.objective.description}`
    );
}

