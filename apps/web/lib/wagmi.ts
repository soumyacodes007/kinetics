import { getDefaultConfig, midnightTheme } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { defineChain } from "viem";

export const zeroGTestnet = defineChain({
  id: 16602,
  name: "0G Testnet",
  nativeCurrency: {
    name: "0G",
    symbol: "0G",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ["https://evmrpc-testnet.0g.ai"]
    }
  },
  blockExplorers: {
    default: {
      name: "0G Chainscan",
      url: "https://chainscan-galileo.0g.ai"
    }
  },
  testnet: true
});

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "11111111111111111111111111111111";

export const wagmiConfig = getDefaultConfig({
  appName: "Kinetics",
  projectId: walletConnectProjectId,
  chains: [zeroGTestnet],
  ssr: true,
  transports: {
    [zeroGTestnet.id]: http(zeroGTestnet.rpcUrls.default.http[0])
  }
});

export const rainbowTheme = midnightTheme({
  accentColor: "#f5f5f4",
  accentColorForeground: "#09090b",
  borderRadius: "medium",
  fontStack: "system"
});
