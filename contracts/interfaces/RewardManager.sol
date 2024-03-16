// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IRewardManager {
    function addRewards(uint256 usdcAmount, uint256 lvcAmount) external;
}

interface IRewardManagerV2 {
    function addRewards(
        uint256 usdcAmount,
        uint256 lvcAmount,
        uint256 lynxAmount
    ) external;
}
