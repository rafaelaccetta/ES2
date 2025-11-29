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

    addArmy(territory, amount) {
        this.armies[territory] = this.armies[territory] + amount;
    }

    removeArmy(territory, amount) {
        if (amount <= 0) {
            throw new Error("Amount to remove must be a positive number.");
        }
        const currentArmies = this.armies[territory];
        const resultingArmies = currentArmies - amount;
        if (resultingArmies < 1) {
            throw new Error(
                `Invalid move: Cannot remove ${amount} armies from ${territory}. ` +
                `This would leave ${resultingArmies} armies, but at least 1 must remain.`
            );
        }
        this.armies[territory] = resultingArmies;
    }

    // cria um objeto continents que armazena os territórios de acordo com o continente que pertencem (será usado para verificar se um jogador já conquistou um continente e consequentemente o bônus)
    getTerritoriesByContinent() {
        // se já tiver sido calculado, retorna o valor armazenado
        if (this.territoriesBycontinents) {
            return this.territoriesBycontinents;
        }

        const continents = {};
        for (const territoryName in territoriesJson) {
            const continentName = territoriesJson[territoryName].continent;
            if (!continents[continentName]) {
                continents[continentName] = [];
            }
            continents[continentName].push(territoryName);
        }
        this.territoriesBycontinents = continents;
        return this.territoriesBycontinents;
    }


    distributeTerritories(players) {
        var territoriesKeys = Object.keys(territoriesJson);
        territoriesKeys = territoriesKeys.sort(() => Math.random() - 0.5);
        
        var territoriesPerPlayer = Math.floor(territoriesKeys.length / players.length);
        var currentIndex = 0;
        
        for (var i = 0; i < players.length; i++) {
            for (var j = 0; j < territoriesPerPlayer; j++) {
                players[i].addTerritory(territoriesKeys[currentIndex]);
                currentIndex++;
            }
        }
        
        while (currentIndex < territoriesKeys.length) {
            var playerIndex = currentIndex % players.length;
            players[playerIndex].addTerritory(territoriesKeys[currentIndex]);
            currentIndex++;
        }
        
        for (var i = 0; i < players.length; i++) {
            for (var j = 0; j < players[i].territories.length; j++) {
                players[i].addArmiesToTerritory(players[i].territories[j], 1);
            }
        }
    }

    getContinentBonusForPlayer(player) {
        // verificar se um jogador domina algum continente e retornar o bônus
    }

    areAdjacent(territory1, territory2) {
        const neighbors = this.territories.getNeighbors(territory1); //
        return neighbors.some(neighbor => neighbor.node === territory2);
    }
}

