// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MemoryRegistry
 * @notice Append-only history of memory state roots anchored on-chain.
 *
 * This is kept intentionally small for the hackathon MVP. The shared package
 * and MCP server can use it to prove that a given vault state existed at a
 * specific point in time.
 */
contract MemoryRegistry {
    struct MemoryState {
        bytes32 merkleRoot;
        uint256 blockNumber;
        bytes32 daTxHash;
        uint256 timestamp;
    }

    mapping(address => MemoryState) public latest;
    mapping(address => MemoryState[]) private history;

    event MemoryUpdated(
        address indexed agent,
        bytes32 indexed merkleRoot,
        bytes32 daTxHash,
        uint256 blockNumber
    );

    function updateRoot(bytes32 merkleRoot, bytes32 daTxHash) external {
        MemoryState memory state = MemoryState({
            merkleRoot: merkleRoot,
            blockNumber: block.number,
            daTxHash: daTxHash,
            timestamp: block.timestamp
        });

        latest[msg.sender] = state;
        history[msg.sender].push(state);

        emit MemoryUpdated(msg.sender, merkleRoot, daTxHash, block.number);
    }

    function getLatest(address agent) external view returns (MemoryState memory) {
        return latest[agent];
    }

    function getAt(address agent, uint256 index) external view returns (MemoryState memory) {
        require(index < history[agent].length, "MemoryRegistry: index out of bounds");
        return history[agent][index];
    }

    function historyLength(address agent) external view returns (uint256) {
        return history[agent].length;
    }

    function verifyInclusion(
        address,
        bytes32 leaf,
        bytes32[] calldata proof,
        bytes32 root
    ) external pure returns (bool) {
        bytes32 computed = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 sibling = proof[i];
            if (computed <= sibling) {
                computed = keccak256(abi.encodePacked(computed, sibling));
            } else {
                computed = keccak256(abi.encodePacked(sibling, computed));
            }
        }

        return computed == root;
    }
}
