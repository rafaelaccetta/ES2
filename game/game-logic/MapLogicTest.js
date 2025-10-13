import { GameMap } from "./GameMap.js";
import { Player } from "./Player.js";

import territoriesJson from "../public/data/territories.json" with {type: "json"};

const gameMap = new GameMap();
const playerColors = ["azul", "vermelho", "verde", "branco"];
const players = playerColors.map((color, idx) => new Player(idx, color));

// Distribuição embaralhada dos territórios do JSON
let territoryNames = Object.keys(territoriesJson);
territoryNames = territoryNames.sort(() => Math.random() - 0.5); // embaralha
const territoriesPerPlayer = Math.floor(territoryNames.length / players.length);
let idx = 0;
for (const player of players) {
    for (let i = 0; i < territoriesPerPlayer; i++) {
        player.addTerritory(territoryNames[idx++]);
    }
}
// Distribui os territórios restantes
while (idx < territoryNames.length) {
    players[idx % players.length].addTerritory(territoryNames[idx++]);
}

for (const player of players) {
    console.log(`Player ${player.id} (${player.color}) territories:`, player.territories);
}

// Exibir lista de territórios de cada jogador
console.log("\nLista de territórios dos jogadores:");
for (const player of players) {
    console.log(`Player ${player.id} (${player.color}):`, player.territories);
}

console.log("Tropas de cada território:")
for (const territory in gameMap.armies) {
    console.log(`\t ${territory}: ${gameMap.armies[territory]}`)
}
