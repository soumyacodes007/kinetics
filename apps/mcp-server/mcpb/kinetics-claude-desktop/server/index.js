import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfigFromEnv } from "./config.js";
import { registerKineticsTools } from "./handlers.js";
import { KineticsMcpService } from "./service.js";
function logLifecycle(message, error) {
    console.error(`[kinetics-mcp] ${message}`);
    if (error) {
        console.error(error);
    }
}
async function main() {
    const config = loadConfigFromEnv();
    const service = new KineticsMcpService(config);
    const server = new McpServer({
        name: "kinetics-mcp",
        version: "0.1.0"
    }, {
        instructions: "This server manages private Kinetics memory vaults and public skill packs on 0G. Use memory_pass_list_plans before buying a pass. Use memory_pass_status before querying memory. Private memory tools operate on the configured wallet's vault only. Public skill tools search only preview manifests and mounted packs are session-local."
    });
    registerKineticsTools(server, service);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stdin.resume();
    const keepAlive = setInterval(() => {
        // Claude Desktop can otherwise let the process exit after initialize.
    }, 60_000);
    const shutdown = async (signal) => {
        logLifecycle(`received ${signal}, shutting down`);
        clearInterval(keepAlive);
        await server.close();
        process.exit(0);
    };
    process.on("SIGINT", () => {
        void shutdown("SIGINT");
    });
    process.on("SIGTERM", () => {
        void shutdown("SIGTERM");
    });
    process.on("uncaughtException", (error) => {
        logLifecycle("uncaught exception", error);
        process.exit(1);
    });
    process.on("unhandledRejection", (error) => {
        logLifecycle("unhandled rejection", error);
        process.exit(1);
    });
    process.on("beforeExit", (code) => {
        logLifecycle(`beforeExit ${code}`);
    });
    process.on("exit", (code) => {
        logLifecycle(`exit ${code}`);
    });
    await new Promise(() => {
        // Intentionally never resolves; lifetime is controlled by signals/transport shutdown.
    });
}
main().catch((error) => {
    logLifecycle("fatal startup error", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map