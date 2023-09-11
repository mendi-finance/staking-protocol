// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IRewardManager {
    function addRewards(uint256 usdcAmount, uint256 lvcAmount) external;
}
