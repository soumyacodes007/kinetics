import { BuyerAccessGrant } from "../types/license.js";
import { WritableStorage } from "../storage/upload.js";
import { ReadableStorage } from "../storage/download.js";
export interface AccessGrantPublisher {
    publishAccessGrant(licenseId: number | bigint, grantVersion: number | bigint, grantRoot: string): Promise<string>;
}
export declare function publishAccessGrant(args: {
    grant: BuyerAccessGrant;
    storage: WritableStorage;
    licenseRegistry: AccessGrantPublisher;
}): Promise<{
    rootHash: string;
    transactionHash: string;
    publishTxHash: string;
}>;
export declare function loadAccessGrant(storage: ReadableStorage, grantRoot: string): Promise<BuyerAccessGrant>;
//# sourceMappingURL=access-grant.d.ts.map