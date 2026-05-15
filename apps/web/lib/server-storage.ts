import { JsonRpcProvider, Wallet } from "ethers";
import { KINETICS_0G_TESTNET, ZeroGStorageReader, ZeroGStorageWriter } from "@kinetics/core";

function requiredPrivateKey(): string {
  const privateKey = process.env.KINETICS_PRIVATE_KEY ?? process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("KINETICS_PRIVATE_KEY or PRIVATE_KEY is required for the web storage bridge");
  }

  return privateKey;
}

export function storageBridgeConfig() {
  const rpcUrl = process.env.KINETICS_RPC_URL ?? process.env.RPC_URL ?? KINETICS_0G_TESTNET.rpcUrl;
  const indexerRpc =
    process.env.KINETICS_INDEXER_RPC ??
    process.env.INDEXER_RPC_URL ??
    process.env.INDEXER_RPC ??
    KINETICS_0G_TESTNET.storageIndexer;

  const provider = new JsonRpcProvider(rpcUrl);
  const signer = new Wallet(requiredPrivateKey(), provider);

  return {
    rpcUrl,
    indexerRpc,
    signer
  };
}

export function createStorageWriter() {
  const config = storageBridgeConfig();
  return new ZeroGStorageWriter({
    indexerRpc: config.indexerRpc,
    blockchainRpc: config.rpcUrl,
    signer: config.signer
  });
}

export function createStorageReader() {
  const config = storageBridgeConfig();
  return new ZeroGStorageReader(config.indexerRpc);
}
