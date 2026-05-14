// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MemoryPass
 * @notice Non-transferable pass that defines a user's private vault identity.
 *
 * The token id is the canonical vault id used by the off-chain vault index and
 * encryption flows. Pass expiry blocks new writes and index updates, but the
 * vault id itself remains stable across renewals.
 */
contract MemoryPass {
    struct PassPlan {
        uint256 durationSeconds;
        uint256 storageQuotaBytes;
        uint256 writeQuotaPerPeriod;
        uint256 periodSeconds;
        uint256 priceWei;
        bool active;
    }

    struct PassState {
        uint256 vaultId;
        address owner;
        uint256 planId;
        uint256 expiresAt;
        uint256 storageQuotaBytes;
        uint256 writeQuotaPerPeriod;
        uint256 latestIndexVersion;
        bytes32 latestIndexRoot;
        bytes32 latestIndexBlobRoot;
    }

    error AlreadyHasPass();
    error InvalidPlan();
    error IncorrectPayment();
    error NotPassOwner();
    error PassInactive();
    error TransferDisabled();
    error ZeroAddress();
    error VersionNotIncreasing();

    string public constant name = "Kinetics Memory Pass";
    string public constant symbol = "KPASS";

    address public owner;
    uint256 public totalSupply;
    uint256 public nextPlanId = 1;

    mapping(uint256 => PassPlan) public passPlans;
    mapping(uint256 => PassState) private _passes;
    mapping(address => uint256) public ownerToVaultId;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PlanConfigured(
        uint256 indexed planId,
        uint256 durationSeconds,
        uint256 storageQuotaBytes,
        uint256 writeQuotaPerPeriod,
        uint256 periodSeconds,
        uint256 priceWei,
        bool active
    );
    event PassPurchased(address indexed buyer, uint256 indexed vaultId, uint256 indexed planId, uint256 expiresAt);
    event PassRenewed(address indexed buyer, uint256 indexed vaultId, uint256 indexed planId, uint256 expiresAt);
    event LatestIndexUpdated(
        uint256 indexed vaultId,
        uint256 indexed version,
        bytes32 indexRoot,
        bytes32 indexBlobRoot
    );
    event FundsWithdrawn(address indexed recipient, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "MemoryPass: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);

        _setPlan(1, 30 days, 25 * 1024 * 1024, 2_000, 30 days, 0.01 ether, true);
        _setPlan(2, 90 days, 200 * 1024 * 1024, 20_000, 90 days, 0.025 ether, true);
        nextPlanId = 3;
    }

    function buyPass(uint256 planId) external payable returns (uint256 vaultId) {
        if (ownerToVaultId[msg.sender] != 0) revert AlreadyHasPass();

        PassPlan memory plan = _requireActivePlan(planId);
        if (msg.value != plan.priceWei) revert IncorrectPayment();

        vaultId = ++totalSupply;

        _owners[vaultId] = msg.sender;
        _balances[msg.sender] = 1;
        ownerToVaultId[msg.sender] = vaultId;

        _passes[vaultId] = PassState({
            vaultId: vaultId,
            owner: msg.sender,
            planId: planId,
            expiresAt: block.timestamp + plan.durationSeconds,
            storageQuotaBytes: plan.storageQuotaBytes,
            writeQuotaPerPeriod: plan.writeQuotaPerPeriod,
            latestIndexVersion: 0,
            latestIndexRoot: bytes32(0),
            latestIndexBlobRoot: bytes32(0)
        });

        emit Transfer(address(0), msg.sender, vaultId);
        emit PassPurchased(msg.sender, vaultId, planId, _passes[vaultId].expiresAt);
    }

    function renewPass(uint256 vaultId, uint256 planId) external payable {
        if (_owners[vaultId] != msg.sender) revert NotPassOwner();

        PassPlan memory plan = _requireActivePlan(planId);
        if (msg.value != plan.priceWei) revert IncorrectPayment();

        PassState storage passState = _passes[vaultId];
        uint256 baseTime = passState.expiresAt > block.timestamp ? passState.expiresAt : block.timestamp;

        passState.planId = planId;
        passState.expiresAt = baseTime + plan.durationSeconds;
        passState.storageQuotaBytes = plan.storageQuotaBytes;
        passState.writeQuotaPerPeriod = plan.writeQuotaPerPeriod;

        emit PassRenewed(msg.sender, vaultId, planId, passState.expiresAt);
    }

    function getPass(uint256 vaultId) external view returns (PassState memory) {
        return _passes[vaultId];
    }

    function getPassByOwner(address passOwner) external view returns (PassState memory) {
        uint256 vaultId = ownerToVaultId[passOwner];
        return _passes[vaultId];
    }

    function setLatestIndex(
        uint256 vaultId,
        uint256 version,
        bytes32 indexRoot,
        bytes32 indexBlobRoot
    ) external {
        if (_owners[vaultId] != msg.sender) revert NotPassOwner();
        if (!isPassActive(vaultId)) revert PassInactive();

        PassState storage passState = _passes[vaultId];
        if (version <= passState.latestIndexVersion) revert VersionNotIncreasing();

        passState.latestIndexVersion = version;
        passState.latestIndexRoot = indexRoot;
        passState.latestIndexBlobRoot = indexBlobRoot;

        emit LatestIndexUpdated(vaultId, version, indexRoot, indexBlobRoot);
    }

    function isPassActive(uint256 vaultId) public view returns (bool) {
        PassState memory passState = _passes[vaultId];
        return passState.owner != address(0) && passState.expiresAt >= block.timestamp;
    }

    function ownerOf(uint256 vaultId) external view returns (address) {
        address passOwner = _owners[vaultId];
        if (passOwner == address(0)) revert ZeroAddress();
        return passOwner;
    }

    function balanceOf(address passOwner) external view returns (uint256) {
        if (passOwner == address(0)) revert ZeroAddress();
        return _balances[passOwner];
    }

    function setPlan(
        uint256 planId,
        uint256 durationSeconds,
        uint256 storageQuotaBytes,
        uint256 writeQuotaPerPeriod,
        uint256 periodSeconds,
        uint256 priceWei,
        bool active
    ) external onlyOwner {
        _setPlan(planId, durationSeconds, storageQuotaBytes, writeQuotaPerPeriod, periodSeconds, priceWei, active);

        if (planId >= nextPlanId) {
            nextPlanId = planId + 1;
        }
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function withdraw(address payable recipient) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        uint256 amount = address(this).balance;
        (bool ok, ) = recipient.call{value: amount}("");
        require(ok, "MemoryPass: withdraw failed");
        emit FundsWithdrawn(recipient, amount);
    }

    function approve(address, uint256) external pure {
        revert TransferDisabled();
    }

    function getApproved(uint256) external pure returns (address) {
        return address(0);
    }

    function transferFrom(address, address, uint256) external pure {
        revert TransferDisabled();
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert TransferDisabled();
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert TransferDisabled();
    }

    function _requireActivePlan(uint256 planId) internal view returns (PassPlan memory plan) {
        plan = passPlans[planId];
        if (!plan.active || plan.durationSeconds == 0 || plan.periodSeconds == 0) revert InvalidPlan();
    }

    function _setPlan(
        uint256 planId,
        uint256 durationSeconds,
        uint256 storageQuotaBytes,
        uint256 writeQuotaPerPeriod,
        uint256 periodSeconds,
        uint256 priceWei,
        bool active
    ) internal {
        require(planId != 0, "MemoryPass: invalid plan id");
        require(durationSeconds != 0, "MemoryPass: zero duration");
        require(periodSeconds != 0, "MemoryPass: zero period");

        passPlans[planId] = PassPlan({
            durationSeconds: durationSeconds,
            storageQuotaBytes: storageQuotaBytes,
            writeQuotaPerPeriod: writeQuotaPerPeriod,
            periodSeconds: periodSeconds,
            priceWei: priceWei,
            active: active
        });

        emit PlanConfigured(
            planId,
            durationSeconds,
            storageQuotaBytes,
            writeQuotaPerPeriod,
            periodSeconds,
            priceWei,
            active
        );
    }
}
