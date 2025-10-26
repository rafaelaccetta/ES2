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

import { createObjectiveFromJson } from "./Objective.js";

const objetivos = objetivosJson.map((obj) => {
    const instance = createObjectiveFromJson(obj);
    if (!instance) throw new Error("Tipo de objetivo desconhecido: " + obj.type);
    return instance;
});

const manager = new GameManager(players);
manager.distributeObjectives(objetivos);

console.log("Objetivos distribuídos:");
for (const player of players) {
    console.log(
        'Jogador ' + player.id + ' recebeu o objetivo: ' + player.objective.description
    );
}

