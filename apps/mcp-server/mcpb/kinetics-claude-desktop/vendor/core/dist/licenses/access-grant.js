import { uploadBuyerAccessGrant, readBuyerAccessGrant } from "../storage/manifests.js";
export async function publishAccessGrant(args) {
    const uploaded = await uploadBuyerAccessGrant(args.storage, args.grant);
    const publishTxHash = await args.licenseRegistry.publishAccessGrant(args.grant.licenseId, args.grant.version, uploaded.rootHash);
    return {
        rootHash: uploaded.rootHash,
        transactionHash: uploaded.transactionHash,
        publishTxHash
    };
}
export async function loadAccessGrant(storage, grantRoot) {
    return readBuyerAccessGrant(storage, grantRoot);
}
//# sourceMappingURL=access-grant.js.map