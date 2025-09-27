import {GameManager} from "./GameManager.js";
import * as readline from "node:readline/promises";
import {stdin as input, stdout as output}  from "node:process"
async function main() {
    const rl = readline.createInterface({input, output});
    let players = []
    let playerAmount = parseInt(await rl.question("Insert player amount:"))
    for (let i = 0; i < playerAmount; i++) {
        players.push(String.fromCharCode(i + 65)) // 65 is ascii for "A"
    }
    let game = new GameManager(players)

    let form = "Placeholder"

    while (form !== "q") {
        console.log(`| Round ${game.round} | Player ${game.getPlayerPlaying()}'s turn | ${game.getPhaseName()} phase |`)
        form = await rl.question("s: skip phase\nq: quit\n")
        if (form === "s") {
            game.passPhase()
        }
    }
    rl.close()
}

main()