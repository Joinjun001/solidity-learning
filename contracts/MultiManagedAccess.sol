// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

abstract contract MultiManagedAccess {
    uint256 constant MIN_MANAGERS = 3;

    address public owner;
    address[] public managers;
    mapping(address => bool) public isManager;
    mapping(address => bool) public confirmed;

    constructor(address _owner, address[] memory _managers) {
        require(_managers.length >= MIN_MANAGERS, "At least 3 managers required");
        owner = _owner;
        for (uint256 i = 0; i < _managers.length; i++) {
            require(!isManager[_managers[i]], "Duplicate manager");
            managers.push(_managers[i]);
            isManager[_managers[i]] = true;
        }
    }

    modifier onlyManager() {
        require(isManager[msg.sender], "You are not a manager");
        _;
    }

    modifier onlyAllConfirmed() {
        require(isManager[msg.sender], "You are not a manager");
        require(allConfirmed(), "Not all confirmed yet");
        reset();
        _;
    }

    function confirm() external onlyManager {
        confirmed[msg.sender] = true;
    }

    function allConfirmed() internal view returns (bool) {
        for (uint256 i = 0; i < managers.length; i++) {
            if (!confirmed[managers[i]]) {
                return false;
            }
        }
        return true;
    }

    function reset() internal {
        for (uint256 i = 0; i < managers.length; i++) {
            confirmed[managers[i]] = false;
        }
    }
}
