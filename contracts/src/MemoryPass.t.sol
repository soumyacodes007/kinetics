// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./MemoryPass.sol";

contract MemoryPassBuyer {
    function buy(MemoryPass memoryPass, uint256 planId) external payable {
        memoryPass.buyPass{value: msg.value}(planId);
    }

    function setLatestIndex(
        MemoryPass memoryPass,
        uint256 vaultId,
        uint256 version,
        bytes32 indexRoot,
        bytes32 indexBlobRoot
    ) external {
        memoryPass.setLatestIndex(vaultId, version, indexRoot, indexBlobRoot);
    }

    function transferPass(MemoryPass memoryPass, address to, uint256 vaultId) external {
        memoryPass.transferFrom(address(this), to, vaultId);
    }
}

contract MemoryPassTest {
    function test_DefaultPlansExistAndPurchaseWorks() public {
        MemoryPass memoryPass = new MemoryPass();
        MemoryPassBuyer buyer = new MemoryPassBuyer();

        (
            uint256 durationSeconds,
            uint256 storageQuotaBytes,
            uint256 writeQuotaPerPeriod,
            uint256 periodSeconds,
            uint256 priceWei,
            bool active
        ) = memoryPass.passPlans(1);

        require(active, "starter plan should be active");
        require(durationSeconds == 30 days, "starter duration mismatch");
        require(storageQuotaBytes == 25 * 1024 * 1024, "starter storage mismatch");
        require(writeQuotaPerPeriod == 2_000, "starter write quota mismatch");
        require(periodSeconds == 30 days, "starter period mismatch");

        buyer.buy{value: priceWei}(memoryPass, 1);

        uint256 vaultId = memoryPass.ownerToVaultId(address(buyer));
        require(vaultId == 1, "vault id mismatch");

        MemoryPass.PassState memory passState = memoryPass.getPass(vaultId);
        require(passState.owner == address(buyer), "owner mismatch");
        require(passState.planId == 1, "plan mismatch");
        require(memoryPass.isPassActive(vaultId), "pass should be active");
    }

    function test_CannotBuySecondPassForSameOwner() public {
        MemoryPass memoryPass = new MemoryPass();
        MemoryPassBuyer buyer = new MemoryPassBuyer();
        (, , , , uint256 priceWei, ) = memoryPass.passPlans(1);

        buyer.buy{value: priceWei}(memoryPass, 1);

        bool reverted = false;
        try buyer.buy{value: priceWei}(memoryPass, 1) {
            revert("expected second purchase to fail");
        } catch {
            reverted = true;
        }

        require(reverted, "expected revert on duplicate pass");
    }

    function test_PassIsNonTransferable() public {
        MemoryPass memoryPass = new MemoryPass();
        MemoryPassBuyer buyer = new MemoryPassBuyer();
        (, , , , uint256 priceWei, ) = memoryPass.passPlans(1);

        buyer.buy{value: priceWei}(memoryPass, 1);

        bool reverted = false;
        try buyer.transferPass(memoryPass, address(0xBEEF), 1) {
            revert("expected transfer to fail");
        } catch {
            reverted = true;
        }

        require(reverted, "transfer should be disabled");
    }

    function test_OnlyPassOwnerCanUpdateLatestIndex() public {
        MemoryPass memoryPass = new MemoryPass();
        MemoryPassBuyer buyer = new MemoryPassBuyer();
        (, , , , uint256 priceWei, ) = memoryPass.passPlans(1);

        buyer.buy{value: priceWei}(memoryPass, 1);
        buyer.setLatestIndex(
            memoryPass,
            1,
            1,
            keccak256("root-1"),
            keccak256("blob-1")
        );

        MemoryPass.PassState memory passState = memoryPass.getPass(1);
        require(passState.latestIndexVersion == 1, "index version should update");

        bool reverted = false;
        try memoryPass.setLatestIndex(1, 2, keccak256("root-2"), keccak256("blob-2")) {
            revert("expected non-owner update to fail");
        } catch {
            reverted = true;
        }

        require(reverted, "non-owner update should revert");
    }
}
