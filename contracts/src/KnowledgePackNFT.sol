// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title KnowledgePackNFT
 * @notice Lightweight iNFT-style registry for creator-owned public skill packs.
 *
 * The MVP uses this as a provenance and marketplace anchor. It intentionally
 * avoids a heavy ERC-721 dependency and keeps transfer semantics out of scope.
 */
contract KnowledgePackNFT {
    struct PackState {
        uint256 packId;
        address creator;
        string slug;
        uint8 packKind; // 0 = skill_only, 1 = knowledge_only, 2 = hybrid
        uint256 currentVersion;
        bytes32 currentPreviewRoot;
        bytes32 currentBundleRoot;
        uint256 priceWei;
        uint256 licenseDurationSeconds;
        bool active;
    }

    error EmptySlug();
    error InvalidPackKind();
    error NotPackCreator();
    error SlugAlreadyUsed();
    error InvalidVersion();
    error UnknownPack();

    uint8 public constant PACK_KIND_SKILL_ONLY = 0;
    uint8 public constant PACK_KIND_KNOWLEDGE_ONLY = 1;
    uint8 public constant PACK_KIND_HYBRID = 2;

    uint256 public totalSupply;

    mapping(uint256 => PackState) private _packs;
    mapping(bytes32 => bool) private _slugTaken;
    mapping(address => uint256[]) private _creatorPackIds;

    event PackMinted(
        uint256 indexed packId,
        address indexed creator,
        string slug,
        uint8 packKind,
        bytes32 previewRoot,
        bytes32 bundleRoot
    );
    event PackVersionPublished(
        uint256 indexed packId,
        uint256 indexed version,
        bytes32 previewRoot,
        bytes32 bundleRoot
    );
    event PackSaleTermsUpdated(
        uint256 indexed packId,
        uint256 priceWei,
        uint256 licenseDurationSeconds,
        bool active
    );

    function mintPack(
        string calldata slug,
        uint8 packKind,
        bytes32 previewRoot,
        bytes32 bundleRoot
    ) external returns (uint256 packId) {
        if (bytes(slug).length == 0) revert EmptySlug();
        if (packKind > PACK_KIND_HYBRID) revert InvalidPackKind();

        bytes32 slugHash = keccak256(bytes(slug));
        if (_slugTaken[slugHash]) revert SlugAlreadyUsed();

        packId = ++totalSupply;
        _slugTaken[slugHash] = true;

        _packs[packId] = PackState({
            packId: packId,
            creator: msg.sender,
            slug: slug,
            packKind: packKind,
            currentVersion: 1,
            currentPreviewRoot: previewRoot,
            currentBundleRoot: bundleRoot,
            priceWei: 0,
            licenseDurationSeconds: 0,
            active: false
        });

        _creatorPackIds[msg.sender].push(packId);

        emit PackMinted(packId, msg.sender, slug, packKind, previewRoot, bundleRoot);
    }

    function publishVersion(
        uint256 packId,
        uint256 version,
        bytes32 previewRoot,
        bytes32 bundleRoot
    ) external {
        PackState storage pack = _packs[packId];
        if (pack.creator == address(0)) revert UnknownPack();
        if (pack.creator != msg.sender) revert NotPackCreator();
        if (version != pack.currentVersion + 1) revert InvalidVersion();

        pack.currentVersion = version;
        pack.currentPreviewRoot = previewRoot;
        pack.currentBundleRoot = bundleRoot;

        emit PackVersionPublished(packId, version, previewRoot, bundleRoot);
    }

    function setSaleTerms(
        uint256 packId,
        uint256 priceWei,
        uint256 licenseDurationSeconds,
        bool active
    ) external {
        PackState storage pack = _packs[packId];
        if (pack.creator == address(0)) revert UnknownPack();
        if (pack.creator != msg.sender) revert NotPackCreator();
        if (active) {
            require(licenseDurationSeconds != 0, "KnowledgePackNFT: zero duration");
        }

        pack.priceWei = priceWei;
        pack.licenseDurationSeconds = licenseDurationSeconds;
        pack.active = active;

        emit PackSaleTermsUpdated(packId, priceWei, licenseDurationSeconds, active);
    }

    function getPack(uint256 packId) external view returns (PackState memory) {
        return _packs[packId];
    }

    function getCreatorPackIds(address creator) external view returns (uint256[] memory) {
        return _creatorPackIds[creator];
    }

    function getPackSaleTerms(
        uint256 packId
    )
        external
        view
        returns (
            address creator,
            uint256 priceWei,
            uint256 licenseDurationSeconds,
            bool active,
            uint256 currentVersion
        )
    {
        PackState memory pack = _packs[packId];
        if (pack.creator == address(0)) revert UnknownPack();

        return (
            pack.creator,
            pack.priceWei,
            pack.licenseDurationSeconds,
            pack.active,
            pack.currentVersion
        );
    }
}
