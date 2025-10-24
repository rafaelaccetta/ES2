// Link fonte de paises e cartas: https://pt.scribd.com/document/530667103/Cartas-War
import territoriesJson  from "../public/data/territories.json" with {type: "json"};
import continentsJson  from "../public/data/continents.json" with {type: "json"};
import { Graph} from "./Util.js";

export class GameMap {
    constructor() {
        this.territories = new Graph();
        this.continents = [];
        this.loadMapData();
    }

    loadMapData() {
        const territoriesData = territoriesJson
        var territoryNames = Object.keys(territoriesData);
        const insertedEdges = new Set();
        for (const name of territoryNames){
            this.territories.addVertex(name)
            for (const bordering_country of territoriesData[name].borders) {
                const edgeKey = [name, bordering_country].sort().join('-');
                if (!insertedEdges.has(edgeKey)) {
                    this.territories.addEdge(name, bordering_country);
                    insertedEdges.add(edgeKey);
                }
            }
        }
        this.continents = continentsJson
    }
    

    distributeTerritories(players) {
        // embaralhar os territórios e distribuir igualmente entre os jogadores.
        var territoriesKeys = Object.keys(territoriesJson);
        territoriesKeys = territoriesKeys.sort(() => Math.random() - 0.5);
        
        var territoriesPerPlayer = Math.floor(territoriesKeys.length / players.length);
        var currentIndex = 0;
        
        // distribuir territórios igualmente
        for (var i = 0; i < players.length; i++) {
            for (var j = 0; j < territoriesPerPlayer; j++) {
                players[i].addTerritory(territoriesKeys[currentIndex]);
                currentIndex++;
            }
        }
        
        // distribuir os territórios que sobraram entre todos os jogadores
        while (currentIndex < territoriesKeys.length) {
            var playerIndex = currentIndex % players.length;
            players[playerIndex].addTerritory(territoriesKeys[currentIndex]);
            currentIndex++;
        }
        
        // colocar 1 tropa em cada território distribuído.
        for (var i = 0; i < players.length; i++) {
            for (var j = 0; j < players[i].territories.length; j++) {
                // cada território começa com 1 tropa
                players[i].addArmies(players[i].territories[j], 1);
            }
        }
    }

    getContinentBonusForPlayer(player) {
        // verificar se um jogador domina algum continente e retornar o bônus
    }
}

