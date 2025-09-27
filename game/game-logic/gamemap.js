// Link fonte de paises e cartas: https://pt.scribd.com/document/530667103/Cartas-War
import territoriesJson  from "../public/data/territories.json" with {type: "json"};
import continentsJson  from "../public/data/continents.json" with {type: "json"};
import { Graph} from "./util.js";

export class GameMap {
    constructor() {
        this.territories = new Graph();
        this.continents = [];
        this.loadMapData();
    }

    loadMapData() {
        // leitura de arquivo
        const territoriesData = territoriesJson
        var territorieskeys = Object.keys(territoriesData);
        for (var i = 0; i < territorieskeys.length; i++) { 
            this.territories.addVertex(territorieskeys[i]);
        }
        for (i = 0; i < territorieskeys.length ; i++) {
            for ( var j = 0; j < territoriesData[territorieskeys[i]].borders.length ; j++) {
                let bordering_country = territoriesData[territorieskeys[i]].borders[j]
                this.territories.addEdge(territorieskeys[i], bordering_country);
                let index = territoriesData[bordering_country].borders.indexOf(territorieskeys[i]);
                territoriesData[bordering_country].borders.splice(index, 1);
            }
        }
        this.continents = continentsJson
    }

    distributeTerritories(players) {
        // embaralhar os territórios e distribuir igualmente entre os jogadores.
        var territorieskeys = Object.keys(territoriesJson);
        var lenght = Math.floor(territorieskeys.length/players.length);
        for (var i = 0; i < players.length; i++) {
            for (var j = 0; j < lenght; j++) {
                var index = Math.floor(Math.random() * territorieskeys.length)
                //players[i].addTerritory(territorieskeys[index]);
                console.log(territorieskeys.length)
                territorieskeys.splice(index, 1);
            }
        }
        // distribuir os territorios que sobraram para os dois primeiros jogadores
        if(territorieskeys.length > 0 ) {
            //players[0].addTerritory(territorieskeys[0]);
            //players[1].addTerritory(territorieskeys[1]);
        }
        // colocar 1 tropa em cada território distribuído.
    }

    getContinentBonusForPlayer(player) {
        // verificar se um jogador domina algum continente e retornar o bônus
    }
}

