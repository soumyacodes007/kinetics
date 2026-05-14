// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IKnowledgePackNFT {
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
        );
}

/**
 * @title PackLicenseRegistry
 * @notice Timed entitlements for public knowledge pack access.
 *
 * Payments are accrued to creators and withdrawn explicitly to avoid inline
 * payout failures during purchase flows.
 */
contract PackLicenseRegistry {
    struct LicenseState {
        uint256 licenseId;
        uint256 packId;
        address buyer;
        uint256 startsAt;
        uint256 expiresAt;
        bytes buyerPubkey;
        uint256 latestGrantVersion;
        bytes32 latestGrantRoot;
        bool active;
    }

    error EmptyBuyerPubkey();
    error LicenseAlreadyExists();
    error IncorrectPayment();
    error LicenseInactive();
    error NotLicenseBuyer();
    error NotPackCreator();
    error UnknownLicense();
    error VersionNotIncreasing();

    IKnowledgePackNFT public immutable knowledgePackNFT;
    uint256 public totalSupply;

    mapping(uint256 => LicenseState) private _licenses;
    mapping(uint256 => mapping(address => uint256)) public packBuyerToLicenseId;
    mapping(address => uint256[]) private _buyerLicenseIds;
    mapping(address => uint256) public creatorBalances;

    event LicenseBought(
        uint256 indexed licenseId,
        uint256 indexed packId,
        address indexed buyer,
        uint256 startsAt,
        uint256 expiresAt
    );
    event LicenseRenewed(
        uint256 indexed licenseId,
        uint256 indexed packId,
        address indexed buyer,
        uint256 expiresAt
    );
    event AccessGrantPublished(
        uint256 indexed licenseId,
        uint256 indexed grantVersion,
        bytes32 grantRoot
    );
    event CreatorWithdrawal(address indexed creator, uint256 amount);

    constructor(address knowledgePackNFTAddress) {
        require(knowledgePackNFTAddress != address(0), "PackLicenseRegistry: zero pack contract");
        knowledgePackNFT = IKnowledgePackNFT(knowledgePackNFTAddress);
    }

    function buyLicense(uint256 packId, bytes calldata buyerPubkey) external payable returns (uint256 licenseId) {
        if (buyerPubkey.length == 0) revert EmptyBuyerPubkey();

        // Allow re-purchase if the existing license has expired.
        uint256 existingId = packBuyerToLicenseId[packId][msg.sender];
        if (existingId != 0) {
            LicenseState memory existing = _licenses[existingId];
            if (existing.expiresAt >= block.timestamp) revert LicenseAlreadyExists();
            // Existing license is expired — clear it so a fresh one can be issued.
            delete packBuyerToLicenseId[packId][msg.sender];
        }

        (
            address creator,
            uint256 priceWei,
            uint256 licenseDurationSeconds,
            bool active,
            uint256 currentVersion
        ) = knowledgePackNFT.getPackSaleTerms(packId);

        require(active, "PackLicenseRegistry: pack inactive");
        require(licenseDurationSeconds != 0, "PackLicenseRegistry: zero duration");
        require(currentVersion != 0, "PackLicenseRegistry: unknown pack version");
        if (msg.value != priceWei) revert IncorrectPayment();

        licenseId = ++totalSupply;
        uint256 startsAt = block.timestamp;
        uint256 expiresAt = startsAt + licenseDurationSeconds;

        _licenses[licenseId] = LicenseState({
            licenseId: licenseId,
            packId: packId,
            buyer: msg.sender,
            startsAt: startsAt,
            expiresAt: expiresAt,
            buyerPubkey: buyerPubkey,
            latestGrantVersion: 0,
            latestGrantRoot: bytes32(0),
            active: true
        });

        packBuyerToLicenseId[packId][msg.sender] = licenseId;
        _buyerLicenseIds[msg.sender].push(licenseId);
        creatorBalances[creator] += msg.value;

        emit LicenseBought(licenseId, packId, msg.sender, startsAt, expiresAt);
    }

    function renewLicense(uint256 licenseId) external payable {
        LicenseState storage licenseState = _licenses[licenseId];
        if (licenseState.buyer == address(0)) revert UnknownLicense();
        if (licenseState.buyer != msg.sender) revert NotLicenseBuyer();
        if (!licenseState.active) revert LicenseInactive();

        (
            address creator,
            uint256 priceWei,
            uint256 licenseDurationSeconds,
            bool active,
            uint256 currentVersion
        ) = knowledgePackNFT.getPackSaleTerms(licenseState.packId);

        require(active, "PackLicenseRegistry: pack inactive");
        require(licenseDurationSeconds != 0, "PackLicenseRegistry: zero duration");
        require(currentVersion != 0, "PackLicenseRegistry: unknown pack version");
        if (msg.value != priceWei) revert IncorrectPayment();

        uint256 baseTime = licenseState.expiresAt > block.timestamp
            ? licenseState.expiresAt
            : block.timestamp;

        licenseState.expiresAt = baseTime + licenseDurationSeconds;
        creatorBalances[creator] += msg.value;

        emit LicenseRenewed(licenseId, licenseState.packId, msg.sender, licenseState.expiresAt);
    }

    function hasActiveLicense(uint256 packId, address buyer) public view returns (bool) {
        uint256 licenseId = packBuyerToLicenseId[packId][buyer];
        if (licenseId == 0) {
            return false;
        }

        LicenseState memory licenseState = _licenses[licenseId];
        return licenseState.active && licenseState.expiresAt >= block.timestamp;
    }

    function publishAccessGrant(
        uint256 licenseId,
        uint256 grantVersion,
        bytes32 grantRoot
    ) external {
        LicenseState storage licenseState = _licenses[licenseId];
        if (licenseState.buyer == address(0)) revert UnknownLicense();
        if (!hasActiveLicense(licenseState.packId, licenseState.buyer)) revert LicenseInactive();

        (address creator, , , , uint256 currentVersion) = knowledgePackNFT.getPackSaleTerms(licenseState.packId);
        if (msg.sender != creator) revert NotPackCreator();
        if (grantVersion <= licenseState.latestGrantVersion) revert VersionNotIncreasing();
        require(grantVersion <= currentVersion, "PackLicenseRegistry: unknown pack version");

        licenseState.latestGrantVersion = grantVersion;
        licenseState.latestGrantRoot = grantRoot;

        emit AccessGrantPublished(licenseId, grantVersion, grantRoot);
    }

    function getLicense(uint256 licenseId) external view returns (LicenseState memory) {
        return _licenses[licenseId];
    }

    function getBuyerLicenseIds(address buyer) external view returns (uint256[] memory) {
        return _buyerLicenseIds[buyer];
    }

    function withdrawCreatorBalance() external {
        uint256 amount = creatorBalances[msg.sender];
        require(amount != 0, "PackLicenseRegistry: no balance");

        creatorBalances[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "PackLicenseRegistry: withdraw failed");

        emit CreatorWithdrawal(msg.sender, amount);
    }
}
