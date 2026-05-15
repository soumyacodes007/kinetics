"use client";

import { useEffect, useState } from "react";
import { BrowserProvider, type JsonRpcSigner } from "ethers";
import { useWalletClient } from "wagmi";

export function useEthersSigner() {
  const { data: walletClient } = useWalletClient();
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!walletClient?.account) {
        setSigner(null);
        return;
      }

      const provider = new BrowserProvider(walletClient.transport, {
        chainId: walletClient.chain.id,
        name: walletClient.chain.name
      });
      const nextSigner = await provider.getSigner(walletClient.account.address);
      if (!cancelled) {
        setSigner(nextSigner);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [walletClient]);

  return signer;
}
