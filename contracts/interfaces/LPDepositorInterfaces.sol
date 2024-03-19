//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

interface ILPDepositor {
    function harvest(address pair, address to) external;
}
