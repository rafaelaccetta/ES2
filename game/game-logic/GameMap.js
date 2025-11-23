// Link fonte de paises e cartas: https://pt.scribd.com/document/530667103/Cartas-War
import territoriesJson  from "../public/data/territories.json" with {type: "json"};
import continentsJson  from "../public/data/continents.json" with {type: "json"};
import { Graph } from "./Util.js";

export class GameMap {
    constructor() {
        this.territories = new Graph();
        this.continents = {};
        this.armies = {}; // Centralized army storage: { "Brazil": 3, "Argentina": 1 }

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

    getArmies(territory) {
        return this.armies[territory] || 0;
    }

    setArmies(territory, count) {
        this.armies[territory] = count;
    }

    addArmy(territory, amount = 1) {
        this.armies[territory] = (this.armies[territory] || 0) + amount;
    }

    removeArmy(territory, amount = 1) {
        if (this.armies[territory] >= amount) {
            this.armies[territory] = this.armies[territory] - amount;
        }
    }

    // cria um objeto continents que armazena os territórios de acordo com o continente que pertencem 
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

        // Garante 1 exército em cada território distribuído (Guardado em gamemap agora, nao player)
        for (const territory of territoriesKeys) {
            this.armies[territory] = 1;
        }
    }

    getContinentBonusForPlayer(player) {
        // verificar se um jogador domina algum continente e retornar o bônus
    }
}