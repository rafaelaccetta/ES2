export class Graph {
    constructor() {
        this.adjacencyList = new Map();
    }

    addVertex(vertex) {
        if (!this.adjacencyList.has(vertex)) {
            this.adjacencyList.set(vertex, []);
        }
    }

    addEdge(vertex1, vertex2) { // Optional weight for weighted graphs
        if (!this.adjacencyList.has(vertex1)) {
            this.addVertex(vertex1);
        }
        if (!this.adjacencyList.has(vertex2)) {
            this.addVertex(vertex2);
        }
        // For undirected graph, add edge in both directions
        this.adjacencyList.get(vertex1).push({ node: vertex2});
        this.adjacencyList.get(vertex2).push({ node: vertex1 }); // Remove for directed graph
    }

    removeEdge(vertex1, vertex2) {
        if (this.adjacencyList.has(vertex1) && this.adjacencyList.has(vertex2)) {
            this.adjacencyList.set(
                vertex1,
                this.adjacencyList.get(vertex1).filter(neighbor => neighbor.node !== vertex2)
            );
            this.adjacencyList.set(
                vertex2,
                this.adjacencyList.get(vertex2).filter(neighbor => neighbor.node !== vertex1) // Remove for directed graph
            );
        }
    }

    removeVertex(vertex) {
        if (this.adjacencyList.has(vertex)) {
            for (let neighbor of this.adjacencyList.get(vertex)) {
                this.removeEdge(vertex, neighbor.node);
            }
            this.adjacencyList.delete(vertex);
        }
    }

    getNeighbors(vertex) {
        return this.adjacencyList.get(vertex) || [];
    }
    
    print(){
        var keys = this.adjacencyList.keys();
        for( var i of keys ) {
            var values = this.adjacencyList.get(i);
            var conc = "";
            //console.log(values)
            for (var j of values) {
                conc += j["node"] + " ";
            }
            console.log(i + " --> " + conc);
        }
    }
}