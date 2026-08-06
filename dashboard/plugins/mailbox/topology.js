export function discoverNetwork(ns, start = "home") {
    const servers = [start];
    const seen = new Set(servers);
    const queue = [start];

    while (queue.length > 0) {
        const current = queue.shift();
        for (const neighbor of ns.scan(current)) {
            if (seen.has(neighbor)) continue;
            seen.add(neighbor);
            servers.push(neighbor);
            queue.push(neighbor);
        }
    }

    return { servers };
}
