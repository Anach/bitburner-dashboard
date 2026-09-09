import { registerDashboardWorkspaceProvider } from "dashboard/libs/workspace-provider.js";
import { DashboardWorkspaceCabinet } from "dashboard/plugins/bbs-connect/bbs-connect-workspace-cabinet";
import { BbsConnectCabinet } from "dashboard/plugins/bbs-connect/bbs-connect-cabinet";
import { createBbsConnectUserApplications } from "dashboard/plugins/bbs-connect/bbs-connect-user-applications";
import { createBbsConnectController } from "dashboard/plugins/bbs-connect/bbs-connect-controller";
import { createBbsConnectService } from "dashboard/plugins/bbs-connect/bbs-connect-service";

const WORKSPACE_ID = "software.bbsConnect";
// UI work is queued onto this loop, so 250 ms is the maximum source/save latency while a provider
// is idle. That matches the standalone host without keeping an open workspace awake ten times/sec.
const SERVICE_POLL_MS = 250;

function BbsConnectWorkspace({ controller, dashboardTheme, manual }) {
    const React = globalThis.React;
    return React.createElement(DashboardWorkspaceCabinet, {
        cabinet: BbsConnectCabinet,
        cabinetProps: { controller, manual },
        dashboardTheme,
    });
}

/** Host BBS Connect as a scripts-owned dashboard workspace process. */
export async function main(ns) {
    ns.disableLog("ALL");
    const service = createBbsConnectService(ns, { applications: createBbsConnectUserApplications() });
    const controller = createBbsConnectController({
        bridge: service.bridge,
        connections: service.connections,
        allConnections: service.allConnections,
    });
    let registration = null;
    let cleaned = false;
    const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        registration?.unregister();
        controller.shutdown();
        service.shutdown();
    };

    try {
        registration = registerDashboardWorkspaceProvider({
            id: WORKSPACE_ID,
            title: "BBS Connect",
            component: BbsConnectWorkspace,
            controller,
            persistent: true,
        });
    }
    catch (error) {
        cleanup();
        ns.print(`BBS Connect could not register: ${error instanceof Error ? error.message : String(error)}`);
        return;
    }

    ns.atExit(cleanup);
    try {
        while (true) {
            await ns.sleep(SERVICE_POLL_MS);
            await service.poll();
        }
    }
    finally {
        cleanup();
        await service.flush();
    }
}


