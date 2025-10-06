import { Player } from "./Player.js";

async function testForceTradeCards() {
    const player = new Player(0, "azul");
    player.cards = ["Alaska", "Greenland", "Argentina", "Brazil", "Quebec"];
    console.log("Cartas antes da troca:", player.cards);
    await player.forceTradeCards();
    console.log("Cartas restantes após troca:", player.cards);
}

testForceTradeCards();

