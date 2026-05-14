import { BuyerAccessGrant } from "../types/license.js";
import { WritableStorage } from "../storage/upload.js";
import { ReadableStorage } from "../storage/download.js";
import { uploadBuyerAccessGrant, readBuyerAccessGrant } from "../storage/manifests.js";

export interface AccessGrantPublisher {
  publishAccessGrant(licenseId: number | bigint, grantVersion: number | bigint, grantRoot: string): Promise<string>;
}

export async function publishAccessGrant(args: {
  grant: BuyerAccessGrant;
  storage: WritableStorage;
  licenseRegistry: AccessGrantPublisher;
}): Promise<{ rootHash: string; transactionHash: string; publishTxHash: string }> {
  const uploaded = await uploadBuyerAccessGrant(args.storage, args.grant);
  const publishTxHash = await args.licenseRegistry.publishAccessGrant(
    args.grant.licenseId,
    args.grant.version,
    uploaded.rootHash
  );

  return {
    rootHash: uploaded.rootHash,
    transactionHash: uploaded.transactionHash,
    publishTxHash
  };
}

export async function loadAccessGrant(storage: ReadableStorage, grantRoot: string): Promise<BuyerAccessGrant> {
  return readBuyerAccessGrant(storage, grantRoot);
}
