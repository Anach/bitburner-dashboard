import {
    getFileExtension,
    getFileKind,
    getFileName,
    isEditableFile,
    isScriptFile,
    normalizeFilePath,
} from "dashboard/libs/file-utils.js";

const manifestCache = new Map();
const scriptRamCache = new Map();

export function loadFileManagerManifest(ns, view) {
    const path = normalizeFilePath(view?.manifest?.path);
    if (!ns || !path || !ns.fileExists(path, "home")) return null;
    try {
        const raw = ns.read(path);
        if (!raw) return null;
        const cached = manifestCache.get(path);
        if (cached?.raw === raw) return cached.value;
        const parsed = JSON.parse(raw);
        const value = parsed && typeof parsed === "object" ? parsed : null;
        manifestCache.set(path, { raw, value });
        return value;
    } catch (error) {
        return null;
    }
}

function getHomeFileSnapshot(ns, knownFiles, knownProcesses) {
    if (!ns) return [];
    const runningByFile = new Map();
    const processes = Array.isArray(knownProcesses) ? knownProcesses : ns.ps("home");
    for (const process of processes) {
        const path = normalizeFilePath(process?.filename);
        if (!path) continue;
        const current = runningByFile.get(path) ?? { threads: 0, pids: [] };
        current.threads += Number(process?.threads) || 0;
        if (Number.isFinite(process?.pid)) current.pids.push(process.pid);
        runningByFile.set(path, current);
    }

    const files = Array.isArray(knownFiles) ? knownFiles : ns.ls("home");
    return files.map((rawPath) => {
        const path = normalizeFilePath(rawPath);
        const running = runningByFile.get(path) ?? { threads: 0, pids: [] };
        let metadata = null;
        if (isEditableFile(path)) {
            try {
                metadata = ns.getFileMetadata(path, "home");
            } catch (error) {
                metadata = null;
            }
        }
        let ramPerThread = 0;
        if (isScriptFile(path)) {
            const metadataSignature = metadata
                ? `${Number(metadata.mtime) || 0}:${Number(metadata.size) || 0}`
                : "";
            const cached = scriptRamCache.get(path);
            if (metadataSignature && cached?.signature === metadataSignature) {
                ramPerThread = cached.value;
            } else {
                try {
                    ramPerThread = ns.getScriptRam(path, "home") || 0;
                } catch (error) {
                    ramPerThread = 0;
                }
                if (metadataSignature) scriptRamCache.set(path, { signature: metadataSignature, value: ramPerThread });
            }
        }
        return {
            path,
            name: getFileName(path),
            extension: getFileExtension(path),
            kind: getFileKind(path),
            exists: true,
            createdAt: Number(metadata?.btime) || 0,
            modifiedAt: Number(metadata?.mtime) || 0,
            accessedAt: Number(metadata?.atime) || 0,
            running: running.threads > 0,
            runningThreads: running.threads,
            runningPids: running.pids,
            ramPerThread,
            runningRam: ramPerThread * running.threads,
        };
    });
}

export function buildFileManagerSnapshots(ns, views = [], options = {}) {
    const fileManagerViews = (Array.isArray(views) ? views : []).filter((view) => view?.renderer === "file-manager");
    if (fileManagerViews.length === 0) return {};
    const files = getHomeFileSnapshot(ns, options.homeFiles, options.homeProcesses);
    return Object.fromEntries(fileManagerViews.map((view) => [view.id, {
        generatedAt: Date.now(),
        host: "home",
        files,
        manifest: loadFileManagerManifest(ns, view),
    }]));
}