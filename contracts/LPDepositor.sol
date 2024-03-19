//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./interfaces/LynxInterfaces.sol";
import "./libraries/SafeToken.sol";

import "hardhat/console.sol";

contract LPDepositor is AccessControlUpgradeable {
    using SafeToken for address;

    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");
    bytes32 public constant HARVESTER_ROLE = keccak256("HARVESTER_ROLE");

    /* Tokens */
    address public constant mendi = 0x43E8809ea748EFf3204ee01F08872F063e44065f;
    address public constant oLYNX = 0x1a51b19CE03dbE0Cb44C1528E34a7EDD7771E9Af;

    /* Lynx */
    address public constant voter = 0x0B2c83B6e39E32f694a86633B4d1Fe69d13b63c5;

    function initialize() public initializer {
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function harvest(
        address pair,
        address to
    ) external onlyRole(HARVESTER_ROLE) {
        claimRewardInternal(pair);

        uint256 amount = oLYNX.myBalance();
        oLYNX.safeTransfer(to, amount);
    }

    /* Guarded Lynx Management Function */
    function _stakeLP(
        address pair,
        uint256 amount
    ) public onlyRole(DEPOSITOR_ROLE) {
        if (amount == type(uint256).max) {
            amount = pair.balanceOf(msg.sender);
        }

        pair.safeTransferFrom(msg.sender, address(this), amount);

        stakeLPInternal(pair);
    }

    function _unstakeLP(
        address pair,
        address to
    ) public onlyRole(WITHDRAWER_ROLE) {
        unstakeLPInternal(pair);

        uint256 amount = pair.myBalance();
        pair.safeTransfer(to, amount);
    }

    /* Internal Equilibre Management Functions */
    function stakeLPInternal(address pair) internal {
        address gauge = IVoter(voter).gauges(pair);

        uint256 amountPair = pair.myBalance();
        pair.safeApprove(gauge, amountPair);
        IGauge(gauge).deposit(amountPair);
    }

    function unstakeLPInternal(address pair) internal {
        address gauge = IVoter(voter).gauges(pair);
        IGauge(gauge).withdrawAll();
    }

    function claimRewardInternal(address pair) internal {
        address[] memory tokens = new address[](1);
        tokens[0] = oLYNX;

        address gauge = IVoter(voter).gauges(pair);
        IGauge(gauge).getReward(address(this), tokens);
    }
}
