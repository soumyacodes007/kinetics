// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./KnowledgePackNFT.sol";
import "./PackLicenseRegistry.sol";

contract PackCreatorCaller {
    receive() external payable {}

    function mintPack(
        KnowledgePackNFT pack,
        string calldata slug,
        uint8 packKind,
        bytes32 previewRoot,
        bytes32 bundleRoot
    ) external {
        pack.mintPack(slug, packKind, previewRoot, bundleRoot);
    }

    function setSaleTerms(
        KnowledgePackNFT pack,
        uint256 packId,
        uint256 priceWei,
        uint256 licenseDurationSeconds,
        bool active
    ) external {
        pack.setSaleTerms(packId, priceWei, licenseDurationSeconds, active);
    }

    function publishVersion(
        KnowledgePackNFT pack,
        uint256 packId,
        uint256 version,
        bytes32 previewRoot,
        bytes32 bundleRoot
    ) external {
        pack.publishVersion(packId, version, previewRoot, bundleRoot);
    }

    function publishGrant(
        PackLicenseRegistry licenseRegistry,
        uint256 licenseId,
        uint256 grantVersion,
        bytes32 grantRoot
    ) external {
        licenseRegistry.publishAccessGrant(licenseId, grantVersion, grantRoot);
    }

    function withdraw(PackLicenseRegistry licenseRegistry) external {
        licenseRegistry.withdrawCreatorBalance();
    }
}

contract PackBuyerCaller {
    function buyLicense(
        PackLicenseRegistry licenseRegistry,
        uint256 packId,
        bytes calldata buyerPubkey
    ) external payable {
        licenseRegistry.buyLicense{value: msg.value}(packId, buyerPubkey);
    }
}

contract PackMarketplaceTest {
    function test_MintSetSaleTermsAndBuyLicense() public {
        KnowledgePackNFT pack = new KnowledgePackNFT();
        PackLicenseRegistry licenseRegistry = new PackLicenseRegistry(address(pack));
        PackCreatorCaller creator = new PackCreatorCaller();
        PackBuyerCaller buyer = new PackBuyerCaller();

        creator.mintPack(
            pack,
            "solidity-research-pack",
            2,
            keccak256("preview-v1"),
            keccak256("bundle-v1")
        );
        creator.setSaleTerms(pack, 1, 0.01 ether, 30 days, true);

        buyer.buyLicense{value: 0.01 ether}(licenseRegistry, 1, bytes("buyer-pubkey"));

        require(licenseRegistry.hasActiveLicense(1, address(buyer)), "license should be active");
        require(licenseRegistry.creatorBalances(address(creator)) == 0.01 ether, "creator balance mismatch");
    }

    function test_CreatorCanPublishPackVersionAndAccessGrant() public {
        KnowledgePackNFT pack = new KnowledgePackNFT();
        PackLicenseRegistry licenseRegistry = new PackLicenseRegistry(address(pack));
        PackCreatorCaller creator = new PackCreatorCaller();
        PackBuyerCaller buyer = new PackBuyerCaller();

        creator.mintPack(pack, "audit-pack", 0, keccak256("preview-v1"), keccak256("bundle-v1"));
        creator.setSaleTerms(pack, 1, 0.02 ether, 30 days, true);
        buyer.buyLicense{value: 0.02 ether}(licenseRegistry, 1, bytes("buyer-pubkey"));

        creator.publishVersion(pack, 1, 2, keccak256("preview-v2"), keccak256("bundle-v2"));
        creator.publishGrant(licenseRegistry, 1, 2, keccak256("grant-v2"));

        PackLicenseRegistry.LicenseState memory licenseState = licenseRegistry.getLicense(1);
        require(licenseState.latestGrantVersion == 2, "grant version mismatch");
        require(licenseState.latestGrantRoot == keccak256("grant-v2"), "grant root mismatch");
    }

    function test_CreatorCanWithdrawAccruedBalance() public {
        KnowledgePackNFT pack = new KnowledgePackNFT();
        PackLicenseRegistry licenseRegistry = new PackLicenseRegistry(address(pack));
        PackCreatorCaller creator = new PackCreatorCaller();
        PackBuyerCaller buyer = new PackBuyerCaller();

        creator.mintPack(pack, "knowledge-pack", 1, keccak256("preview"), keccak256("bundle"));
        creator.setSaleTerms(pack, 1, 0.005 ether, 7 days, true);
        buyer.buyLicense{value: 0.005 ether}(licenseRegistry, 1, bytes("buyer-pubkey"));

        uint256 balanceBefore = address(creator).balance;
        creator.withdraw(licenseRegistry);
        uint256 balanceAfter = address(creator).balance;

        require(balanceAfter == balanceBefore + 0.005 ether, "withdraw balance mismatch");
        require(licenseRegistry.creatorBalances(address(creator)) == 0, "creator balance should clear");
    }
}
