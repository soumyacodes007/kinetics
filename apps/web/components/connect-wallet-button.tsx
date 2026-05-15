"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";

export function ConnectWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
        if (!mounted || !account) {
          return (
            <Button onClick={openConnectModal}>
              Connect Wallet
            </Button>
          );
        }

        if (chain?.unsupported) {
          return (
            <Button variant="outline" onClick={openChainModal}>
              Switch Network
            </Button>
          );
        }

        return (
          <Button variant="outline" onClick={openAccountModal}>
            {account.displayName}
          </Button>
        );
      }}
    </ConnectButton.Custom>
  );
}
