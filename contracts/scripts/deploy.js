import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { ethers, ContractFactory } from "ethers";

const REQUIRED_ENV = ["PRIVATE_KEY", "RPC_URL"];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadArtifact(contractName) {
  const artifactPath = path.join(
    process.cwd(),
    "artifacts",
    "src",
    `${contractName}.sol`,
    `${contractName}.json`
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found for ${contractName}. Run npm run build first.`);
  }

  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

async function deployContract(wallet, contractName, args = []) {
  const artifact = loadArtifact(contractName);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  return contract;
}

async function main() {
  for (const name of REQUIRED_ENV) {
    requireEnv(name);
  }

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log("Deploying with:", wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "0G");

  const memoryPass = await deployContract(wallet, "MemoryPass");
  console.log("MemoryPass:", await memoryPass.getAddress());

  const memoryRegistry = await deployContract(wallet, "MemoryRegistry");
  console.log("MemoryRegistry:", await memoryRegistry.getAddress());

  const knowledgePackNFT = await deployContract(wallet, "KnowledgePackNFT");
  console.log("KnowledgePackNFT:", await knowledgePackNFT.getAddress());

  const packLicenseRegistry = await deployContract(wallet, "PackLicenseRegistry", [
    await knowledgePackNFT.getAddress(),
  ]);
  console.log("PackLicenseRegistry:", await packLicenseRegistry.getAddress());

  const deploymentRecord = {
    network: "0g-testnet",
    rpcUrl: process.env.RPC_URL,
    deployer: wallet.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      MemoryPass: await memoryPass.getAddress(),
      MemoryRegistry: await memoryRegistry.getAddress(),
      KnowledgePackNFT: await knowledgePackNFT.getAddress(),
      PackLicenseRegistry: await packLicenseRegistry.getAddress(),
    },
  };

  const deploymentsDir = path.join(process.cwd(), "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const filename = `0g-testnet-${Date.now()}.json`;
  const outputPath = path.join(deploymentsDir, filename);
  fs.writeFileSync(outputPath, JSON.stringify(deploymentRecord, null, 2));

  console.log("Saved deployment record to:", outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
