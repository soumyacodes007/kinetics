"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccount, useChainId } from "wagmi";
import { ProductShell } from "@/components/product-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getMemoryPassClient, getMemoryRegistryClient } from "@/lib/chain";
import { formatBytes, formatCountdown, formatTimestamp, parseList } from "@/lib/format";
import { addMemoryFast, emptySnapshot, publishSnapshot, pullRemoteSnapshot, querySnapshot, summarizeSnapshot, unlockVaultKey } from "@/lib/memory";
import { useEthersSigner } from "@/hooks/use-ethers-signer";
import type { MemoryPassState, MemoryQueryResult, VaultSnapshot } from "@kinetics/core/browser";

export default function MemoryPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const signer = useEthersSigner();
  const [passState, setPassState] = useState<MemoryPassState | null>(null);
  const [vaultKey, setVaultKey] = useState<Uint8Array | null>(null);
  const [snapshot, setSnapshot] = useState<VaultSnapshot | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const [actionLabel, setActionLabel] = useState("");
  const [queryResults, setQueryResults] = useState<MemoryQueryResult[]>([]);
  const [composer, setComposer] = useState({
    title: "",
    text: "",
    summary: "",
    tags: "",
    namespaces: "",
    sourceClient: "web-app",
    memoryType: "episodic" as const
  });
  const [query, setQuery] = useState("");

  async function refreshPass() {
    if (!address) {
      setPassState(null);
      setSnapshot(null);
      setVaultKey(null);
      return;
    }

    const client = getMemoryPassClient();
    const nextPassState = await client.getPassByOwner(address);
    setPassState(nextPassState);
    if (nextPassState.vaultId === BigInt(0)) {
      setSnapshot(null);
      setVaultKey(null);
    }
  }

  useEffect(() => {
    void refreshPass();
  }, [address]);

  async function unlockVault() {
    if (!signer || !passState || passState.vaultId === BigInt(0)) {
      toast.error("Buy a pass first");
      return;
    }

    setActionLabel("Unlocking vault");
    try {
      const nextVaultKey = await unlockVaultKey({
        signer,
        chainId,
        vaultId: passState.vaultId
      });
      const remoteSnapshot = await pullRemoteSnapshot({
        passState,
        vaultMasterKey: nextVaultKey
      });
      setVaultKey(nextVaultKey);
      setSnapshot(remoteSnapshot ?? emptySnapshot(Number(passState.vaultId)));
      setPendingSync(false);
      toast.success("Vault unlocked");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to unlock vault");
    } finally {
      setActionLabel("");
    }
  }

  async function handleAddMemory() {
    if (!signer || !passState || !snapshot || !vaultKey) {
      toast.error("Unlock the vault first");
      return;
    }

    if (!composer.text.trim()) {
      toast.error("Memory text is required");
      return;
    }

    setActionLabel("Uploading encrypted memory");
    try {
      const result = await addMemoryFast({
        passState,
        snapshot,
        vaultMasterKey: vaultKey,
        input: {
          title: composer.title,
          text: composer.text,
          summary: composer.summary,
          tags: parseList(composer.tags),
          namespaces: parseList(composer.namespaces),
          sourceClient: composer.sourceClient,
          memoryType: composer.memoryType
        }
      });

      const registry = getMemoryRegistryClient(signer);
      await registry.updateRoot(result.merkleRoot, result.daCommitment);

      setSnapshot(result.nextSnapshot);
      setPendingSync(true);
      setComposer((current) => ({
        ...current,
        title: "",
        text: "",
        summary: "",
        tags: ""
      }));
      toast.success(`Saved memory ${result.memoryId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save memory");
    } finally {
      setActionLabel("");
    }
  }

  async function handlePushIndex() {
    if (!signer || !passState || !snapshot || !vaultKey) {
      return;
    }

    setActionLabel("Publishing vault snapshot");
    try {
      const published = await publishSnapshot({
        snapshot,
        vaultMasterKey: vaultKey
      });
      const memoryPass = getMemoryPassClient(signer);
      await memoryPass.setLatestIndex(passState.vaultId, BigInt(snapshot.version), snapshot.merkleRoot, published.snapshotBlobRoot);
      setPendingSync(false);
      await refreshPass();
      toast.success("Vault snapshot synced for other agents");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Snapshot publish failed");
    } finally {
      setActionLabel("");
    }
  }

  async function handlePullIndex() {
    if (!passState || !vaultKey || passState.vaultId === BigInt(0)) {
      return;
    }

    setActionLabel("Pulling latest snapshot");
    try {
      const remoteSnapshot = await pullRemoteSnapshot({
        passState,
        vaultMasterKey: vaultKey
      });
      setSnapshot(remoteSnapshot);
      setPendingSync(false);
      toast.success("Pulled latest published snapshot");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Snapshot pull failed");
    } finally {
      setActionLabel("");
    }
  }

  async function handleQuery() {
    if (!snapshot || !vaultKey) {
      toast.error("Unlock the vault first");
      return;
    }

    setActionLabel("Querying memory");
    try {
      const results = await querySnapshot({
        snapshot,
        vaultMasterKey: vaultKey,
        query,
        topK: 5
      });
      setQueryResults(results);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Memory query failed");
    } finally {
      setActionLabel("");
    }
  }

  return (
    <ProductShell
      eyebrow="Vault"
      title="Private memory stays local until you explicitly sync."
      description="The browser signs the vault key, encrypts memory client-side, pushes ciphertext through the 0G bridge, and only publishes the snapshot when you call sync."
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-6">
          <Card className="border-white/10 bg-black/30 text-white">
            <CardHeader>
              <CardTitle>Vault status</CardTitle>
              <CardDescription className="text-white/60">
                {isConnected ? "Read from MemoryPass and local session state." : "Connect your wallet, then unlock the vault."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm text-white/72">
              <div className="flex items-center justify-between">
                <span>Pass status</span>
                <Badge variant={!passState || passState.vaultId === BigInt(0) ? "outline" : "secondary"}>
                  {!passState || passState.vaultId === BigInt(0) ? "No pass" : "Ready"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Vault</span>
                <span>{passState?.vaultId.toString() ?? "0"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Expiry</span>
                <span>{passState ? formatCountdown(passState.expiresAt) : "Inactive"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Entries</span>
                <span>{snapshot?.entries.length ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Snapshot version</span>
                <span>{snapshot?.version ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Bytes used</span>
                <span>{formatBytes(snapshot?.bytesUsed ?? 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Latest published version</span>
                <span>{passState?.latestIndexVersion.toString() ?? "0"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Latest published at</span>
                <span>{passState ? formatTimestamp(passState.expiresAt) : "Not set"}</span>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button disabled={!signer || !passState || passState.vaultId === BigInt(0)} onClick={() => void unlockVault()}>
                  Unlock vault
                </Button>
                <Button variant="outline" disabled={!vaultKey || !pendingSync} onClick={() => void handlePushIndex()}>
                  Push index
                </Button>
                <Button variant="outline" disabled={!vaultKey} onClick={() => void handlePullIndex()}>
                  Pull index
                </Button>
              </div>
              {actionLabel ? <p className="font-mono text-xs text-white/50">{actionLabel}</p> : null}
              {pendingSync ? (
                <p className="rounded-2xl border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-amber-100">
                  Local writes are ahead of the published snapshot. Run <code>Push index</code> before switching clients.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardHeader>
              <CardTitle>Add memory</CardTitle>
              <CardDescription className="text-white/60">
                Fast path: upload encrypted blob, update local snapshot, anchor the new Merkle root, then sync later.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Input
                placeholder="Optional title"
                value={composer.title}
                onChange={(event) => setComposer((current) => ({ ...current, title: event.target.value }))}
              />
              <Textarea
                placeholder="Memory text"
                className="min-h-32"
                value={composer.text}
                onChange={(event) => setComposer((current) => ({ ...current, text: event.target.value }))}
              />
              <Input
                placeholder="Optional summary"
                value={composer.summary}
                onChange={(event) => setComposer((current) => ({ ...current, summary: event.target.value }))}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  placeholder="Tags: foundry, nextjs"
                  value={composer.tags}
                  onChange={(event) => setComposer((current) => ({ ...current, tags: event.target.value }))}
                />
                <Input
                  placeholder="Namespaces: personal, build"
                  value={composer.namespaces}
                  onChange={(event) => setComposer((current) => ({ ...current, namespaces: event.target.value }))}
                />
              </div>
              <Button disabled={!vaultKey || !signer || !composer.text.trim()} onClick={() => void handleAddMemory()}>
                Save memory
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card className="border-white/10 bg-black/30 text-white">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription className="text-white/60">Session-local view of the current vault snapshot.</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap font-mono text-sm leading-6 text-white/72">
                {snapshot ? summarizeSnapshot(snapshot) : "Unlock the vault to inspect local summary."}
              </pre>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03] text-white">
            <CardHeader>
              <CardTitle>Query vault</CardTitle>
              <CardDescription className="text-white/60">
                Query runs against the decrypted local snapshot and pulls only the ranked blobs for decryption.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex gap-3">
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search memories" />
                <Button variant="outline" disabled={!query.trim() || !vaultKey} onClick={() => void handleQuery()}>
                  Query
                </Button>
              </div>
              <div className="grid gap-3">
                {queryResults.length === 0 ? (
                  <p className="text-sm text-white/55">No query results yet.</p>
                ) : (
                  queryResults.map((result) => (
                    <div key={result.memoryId} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-white">{result.title}</p>
                          <p className="text-sm text-white/55">{result.summary}</p>
                        </div>
                        <Badge variant="outline">{result.score.toFixed(2)}</Badge>
                      </div>
                      <p className="mb-3 text-sm leading-6 text-white/72">{result.text}</p>
                      <div className="flex flex-wrap gap-2">
                        {result.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProductShell>
  );
}
