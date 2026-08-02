export function discoverNetwork(ns, start = "home", options = {}) {
    const excluded = new Set(Array.isArray(options?.exclude) ? options.exclude : []);
    const parentMap = { [start]: null };
    const depthMap = { [start]: 0 };
    const servers = [start];
    const queue = [start];
    const edges = [];
    const edgeKeys = new Set();

    while (queue.length > 0) {
        const current = queue.shift();
        for (const neighbor of ns.scan(current)) {
            if (excluded.has(neighbor)) continue;

            const edge = [current, neighbor].sort();
            const edgeKey = `${edge[0]}\u0000${edge[1]}`;
            if (!edgeKeys.has(edgeKey)) {
                edgeKeys.add(edgeKey);
                edges.push({ source: edge[0], target: edge[1] });
            }

            if (parentMap[neighbor] !== undefined) continue;
            parentMap[neighbor] = current;
            depthMap[neighbor] = depthMap[current] + 1;
            queue.push(neighbor);
            servers.push(neighbor);
        }
    }

    return { servers, parentMap, depthMap, edges };
}

export function pathToHost(parentMap, target, start = "home") {
    if (parentMap[target] === undefined) return null;

    const reversedPath = [target];
    let current = target;
    while (current !== start) {
        current = parentMap[current];
        if (current === undefined) return null;
        reversedPath.push(current);
    }
    return reversedPath.reverse();
}