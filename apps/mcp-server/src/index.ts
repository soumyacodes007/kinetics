import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfigFromEnv } from "./config.js";
import { registerKineticsTools } from "./handlers.js";
import { KineticsMcpService } from "./service.js";

async function main(): Promise<void> {
  const config = loadConfigFromEnv();
  const service = new KineticsMcpService(config);
  const server = new McpServer(
    {
      name: "kinetics-mcp",
      version: "0.1.0"
    },
    {
      instructions:
        "This server manages private Kinetics memory vaults and public skill packs on 0G. Use memory_pass_list_plans before buying a pass. Use memory_pass_status before querying memory. Private memory tools operate on the configured wallet's vault only. Public skill tools search only preview manifests and mounted packs are session-local."
    }
  );

  registerKineticsTools(server, service);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error: unknown) => {
  console.error("[kinetics-mcp] fatal startup error");
  console.error(error);
  process.exit(1);
});
