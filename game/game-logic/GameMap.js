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

    // cria um objeto continents que armazena os territórios de acordo com o continente que pertencem (será usado para verificar se um jogador já conquistou um continente e consequentemente o bônus)
    getTerritoriesByContinent() {
        const continents = {};
        for (const territoryName in this.territories) {
            const continentName= this.territories[territoryName].continent;
            if (!continents[continentName]) {
                continents[continentName] = [];
            }
            continents[continentName].push(territoryName);
        }
        return continents;
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

    // PRA QUEM ESTIVER REVISANDO, a nossa estrutura de json dos continentes faz sentido? por que a gente não coloca esses bônus direto no json dos continentes? lá só tem o mapeamento de abreviação e nome completo
    // não sei nada de arquitetura de projeto assim, é uma dúvida real
    getContinentBonusForPlayer(player) {
        const territoriesByContinent = this.getTerritoriesByContinent();
        let bonus = 0;

        const continentBonuses = {
            "South America": 2,
            "North America": 5,
            "Africa": 3,
            "Europe": 5,
            "Asia": 7,
            "Oceania": 2
        };

        for (const continent of this.continents) {
            if (player.hasConqueredContinent(continent.name, territoriesByContinent)) {
                bonus += continentBonuses[continent.name] || 0;
            }
        }
        return bonus;
    }
}

