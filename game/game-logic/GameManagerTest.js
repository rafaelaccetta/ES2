import { GameManager } from "./GameManager.js";
import { Player } from "./Player.js";

// Exemplo de jogadores
const players = [
    new Player(0, "azul"),
    new Player(1, "vermelho"),
    new Player(2, "verde"),
    new Player(3, "branco"),
];

// Exemplo de objetivos
const objetivos = [
    "Conquistar América do Sul",
    "Eliminar jogador vermelho",
    "Conquistar 18 territórios",
    "Conquistar Europa",
];

const manager = new GameManager(players);
manager.distribuirObjetivos(objetivos);

console.log("Objetivos distribuídos:");
for (const player of players) {
    console.log(
        `Player ${player.id} (${player.color}): objetivo -> ${player.objetivo}`
    );
}

