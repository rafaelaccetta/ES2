// Link fonte de paises e cartas: https://pt.scribd.com/document/530667103/Cartas-War
import territoriesJson  from "../public/data/territories.json" with {type: "json"};
import continentsJson  from "../public/data/continents.json" with {type: "json"};
import { Graph } from "./Util.js";

export class GameMap {
    constructor() {
        this.territories = new Graph();
        this.continents = {};
        this.armies = {};

        this.loadMapData();
        this.initializeArmies();
        this.territoriesBycontinents = null;
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

    initializeArmies() {
        for (const territory in territoriesJson) {
            this.armies[territory] = 1;
        }
    }

    addArmy(territory) {
        this.armies[territory] = this.armies[territory] + 1;
    }

    removeArmy(territory) {
        if (this.armies[territory] > 1) {
            this.armies[territory] = this.armies[territory] - 1;
        }
    }

    // cria um objeto continents que armazena os territórios de acordo com o continente que pertencem (será usado para verificar se um jogador já conquistou um continente e consequentemente o bônus)
    getTerritoriesByContinent() {
        // se já tiver sido calculado, retorna o valor armazenado
        if (this.territoriesBycontinents) {
            return this.territoriesBycontinents;
        }

        const continents = {};
        for (const territoryName in this.territories) {
            const continentName= this.territories[territoryName].continent;
            if (!continents[continentName]) {
                continents[continentName] = [];
            }
            continents[continentName].push(territoryName);
        }
        this.territoriesBycontinents = continents;
        return this.territoriesBycontinents;
    }


    distributeTerritories(players) {
        // embaralhar os territórios e distribuir igualmente entre os jogadores.
        var territorieskeys = Object.keys(territoriesJson);
        var lenght = Math.floor(territorieskeys.length/players.length);
        for (var i = 0; i < players.length; i++) {
            for (var j = 0; j < lenght; j++) {
                var index = Math.floor(Math.random() * territorieskeys.length)
                players[i].addTerritory(territorieskeys[index]);
                console.log(territorieskeys.length)
                territorieskeys.splice(index, 1);
            }
        }
        // distribuir os territorios que sobraram para os dois primeiros jogadores
        if(territorieskeys.length > 0 ) {
            players[0].addTerritory(territorieskeys[0]);
            players[1].addTerritory(territorieskeys[1]);
        }
    }
}

