import { MAILBOX_FEED_PORT } from "dashboard/libs/port-registry.js";
import { stripLitMarkup } from "dashboard/plugins/mailbox/mail-client-lit-text.js";

export const DASHBOARD_SCRIPT_METADATA = {
    "daemon": false
};

const dnetFiles = ["dashboard/plugins/mailbox/mail-client-darknet-agent.js"];
const dnetFile = 0;
const DARKNET_ACCESS_PROGRAM = "DarkscapeNavigator.exe";
const SCANNER_SCRIPT = "dashboard/plugins/mailbox/mail-client-scanner.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    // ns.dnet.* throws outright without this program; mail-client-scanner.js already checks before
    // launching us, but guard here too in case this ever runs standalone.
    if (!ns.fileExists(DARKNET_ACCESS_PROGRAM, "home")) {
        ns.print(`Darknet API unavailable: purchase "${DARKNET_ACCESS_PROGRAM}" through your TOR router first.`);
        return;
    }
    var host = new DarkNet(ns, ns.getHostname(), "");
    ns.print("\n---Darknet Processing Begin---" + host.name);
    host.checkFiles();
    var dnets = [];
    while (true) {
        // Stopping the Mail Client Scanner (home) should stop this agent too, wherever it's
        // currently running (home or a propagated darknet server) - there's no "on kill"
        // hook in Netscript, so each instance checks and self-exits instead.
        if (!ns.scriptRunning(SCANNER_SCRIPT, "home")) {
            ns.print("Mail Client Scanner is no longer running on home; stopping darknet agent.");
            return;
        }
        ns.print("Beginning new loop \n");
        host.openCaches();
        // Update the dnets array with new servers
        const servers = ns.dnet.probe();
        for (const server of servers) {
            if (!dnets.some((darknet) => (darknet.name == server))) {
                dnets.push(new DarkNet(ns, server, host.name));
            }
        }
        // Removes no longer connected servers
        for (let i = 0; i < dnets.length; i++) {
            // One fetch per server per loop pass, cached on the instance - isValid()/isConnected()
            // below both read it rather than re-fetching, since nothing changes it between here
            // and the connect pass a few lines down (no awaits in between).
            dnets[i].refreshDetails();
            if (!dnets[i].isValid()) {
                // splice() already mutates in place AND returns the removed elements - reassigning
                // dnets to its return value here discarded the entire rest of the tracked server
                // list every time just one server went invalid. Just call it for the mutation.
                dnets.splice(i, 1); i--;
            }
        }
        // Connects to and handles connected dnet servers
        for (let darknet of dnets) {
            if (darknet.isValid()) {
                await darknet.authenticateServer();
            }
        }
        await ns.dnet.nextMutation();
    }
}

class DarkNet {
    /** @param {NS} ns */
    constructor(ns, name, host) {
        this.ns = ns;
        this.name = name;
        this.host = host;
        this.password = null;
        this.possible = null;
        this.result = null;
        // "host" (the vantage point running this script, e.g. home) is not itself a darknet
        // server, so getServerDetails() isn't valid on it - only on actual dnet.probe() neighbors.
        this.isDarknetServer = this.ns.dnet.isDarknetServer(this.name);
        this.details = this.isDarknetServer ? this.ns.dnet.getServerDetails(this.name) : null;
        this.isDynamic = this.isDarknetServer && this.getPasswordType();
        if (this.isDarknetServer && !this.isDynamic) { this.possible = this.getStaticPassword(); }
    }
    async authenticateServer() {
        if (this.isConnected()) { return true; }
        if (this.isDynamic) { this.result = await this.authenticateDynamic(); }
        else { this.result = await this.authenticateStatic(); }
        if (!this.result.success) {
            this.ns.print("Failed to connect to dnet server " + this.name +
                "\nHint: " + this.details.passwordHint + " Data: " + this.details.data +
                "\nFormat: " + this.details.passwordFormat + " Length: " + this.details.passwordLength +
                " Attempted: " + this.possible + "\nIs Valid: " + this.isValid());
        }
        else {
            this.ns.print("Connected Server:" + this.name + " Password:" + this.password);
            this.setupNewServer();
            await this.ns.sleep(10);
        }
        return this.result.success;
    }
    setupNewServer() {
        this.startProcess(dnetFiles[dnetFile], 1, this.host);
    }
    startProcess(file, threads, args) {
        if (!this.ns.scriptRunning(file, this.name)) {
            this.ns.scp(dnetFiles, this.name, "home");
            const id = this.ns.exec(file, this.name, { threads, temporary: true }, args);
            if (id == 0) { this.ns.print("Failed to exec " + file + " on " + this.name + " from " + this.host); }
            else { this.ns.print("Running " + file + " on " + this.name); }
            return id;
        }
        return 0;
    }
    async authenticateDynamic() {
        await this.ns.sleep(100);
        return { success: false };
    }
    async authenticateStatic() {
        if (this.possible == null) { return { success: false }; }
        for (const password of this.possible) {
            let result = await this.tryAuth(password);
            if (result.success) { return result; }
        }
        return { success: false };
    }
    async tryAuth(password) {
        if (!this.isValid() || password == null) { return { success: false }; }
        let result = await this.ns.dnet.authenticate(this.name, password);
        if (result.success) { this.password = password; }
        return result;
    }
    getDynamicPassword() {
        this.ns.alert("Test!");
        return null;
    }
    getStaticPassword() {
        if (this.details.passwordLength == 0) { return [""]; }
        if (this.details.passwordHint.length <= 0) { return null; }
        if (this.details.modelId == "ZeroLogon") { return ["0"]; }
        const hintSplit = this.details.passwordHint.split(" ");
        if (hintSplit.includes("default") || hintSplit.includes("factory") || hintSplit.includes("never")) {
            return ["0000", "12345", "admin", "password"];
        }
        if (this.details.data == "" && !isNaN(hintSplit.at(-1))) {
            return [hintSplit.at(-1)];
        }
        if (hintSplit.includes("human")) {
            let password = "";
            for (const char of this.details.data) { if (!isNaN(char)) { password += char; } }
            return [password];
        }
        if (hintSplit.includes("made") || hintSplit.includes("sorted") || hintSplit.includes("shuffled") || hintSplit.includes("uses")) {
            const data = this.details.data;
            if (data.length > 3) { this.ns.alert("Bad Assumption! shuffled " + this.name); return null; }
            return [data, data[0] + data[2] + data[1], data[1] + data[2] + data[0], data[1] + data[0] + data[2], data[2] + data[0] + data[1], data[2] + data[1] + data[0]];
        }
        if (hintSplit.includes("dog")) { return ["fido", "spot", "rover", "max"]; }
        if (hintSplit.includes("value")) {
            const roman = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
            let password = 0;
            for (let i = 0; i < this.details.data.length; i++) {
                if (roman[this.details.data[i]] < roman[this.details.data[i + 1]]) { password -= roman[this.details.data[i]]; }
                else { password += roman[this.details.data[i]]; }
            }
            return [password];
        }
        if (hintSplit.includes("base")) {
            if (hintSplit.at(-1) != "10") { this.ns.alert("Bad Assumption! base " + this.name); return null; }
            let parseData = this.details.data.split(",");
            return [parseInt(parseData[1], parseData[0])];
        }
        if (hintSplit.includes("between")) {
            let password = [];
            for (let i = Number(hintSplit[hintSplit.length - 3]) + 1; i < Number(hintSplit[hintSplit.length - 1]); i++) { password.push(i); }
            return password;
        }
        if (hintSplit.includes("divisible")) {
            if (hintSplit[hintSplit.length - 2] != "1") { this.ns.alert("Bad Assumption! divisible"); return null; }
            let password = [];
            for (let i = 1; i < Math.pow(10, this.details.passwordLength); i++) { password.push(i); }
            return password
        }
        return null;
    }
    getPasswordType() {
        return false;
    }
    refreshDetails() {
        if (this.isDarknetServer) this.details = this.ns.dnet.getServerDetails(this.name);
        return this.details;
    }
    isValid() {
        if (this.details.isOnline && this.details.isConnectedToCurrentServer) { return true; }
        return false;
    }
    isConnected() {
        return this.details.hasSession;
    }
    openCaches() {
        const files = this.ns.ls(this.name);
        for (const file of files) {
            const type = file.split(".").at(-1);
            if (type == "cache") {
                let result = this.ns.dnet.openCache(file);
                this.ns.print("\nCache result: " + result.message);
            }
        }
    }
    checkFiles() {
        const files = this.ns.ls(this.name);
        for (const file of files) {
            if (file.startsWith("data/")) continue;
            const type = file.split(".").at(-1);
            if (type == "lit" || type == "txt" || type == "msg") {
                this.ns.tryWritePort(MAILBOX_FEED_PORT, {
                    source: this.name,
                    filename: file,
                    type: type == "msg" ? "message" : type == "lit" ? "lore" : "other",
                    content: stripLitMarkup(this.ns.read(file)),
                    discoveredAt: Date.now(),
                });
            }
            if (type == "exe") {
                this.ns.print("Executable file found: " + file);
            }
        }
    }
}
