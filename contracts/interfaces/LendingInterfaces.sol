//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

interface IMarket {
    function reserveGuardian() external view returns (address);

    function underlying() external view returns (address);

    function totalReserves() external view returns (uint256);

    function getCash() external view returns (uint256);

    function accrueInterest() external returns (uint256);

    function _reduceReserves(uint256 reduceAmount) external returns (uint256);

    /* For testing */
    function admin() external view returns (address);

    function _setReserveGuardian(
        address newReserveGuardian
    ) external returns (uint256);
}

interface IComptroller {
    function getAllMarkets() external view returns (address[] memory);
}
