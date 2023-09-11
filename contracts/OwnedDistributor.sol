//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

import "./libraries/SafeToken.sol";
import "./Distributor.sol";

contract OwnedDistributor is Distributor, ERC20Upgradeable {
    using SafeToken for address;

    function initialize(
        address claimable_,
        string memory name,
        string memory symbol
    ) public initializer {
        __Distributor_init(claimable_);
        __ERC20_init(name, symbol);
    }

    function mintTo(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }

    function burnFrom(address account, uint256 amount) public onlyOwner {
        _burn(account, amount);
    }

    function burn(uint256 amount) public {
        if (amount > 0) {
            _burn(msg.sender, amount);
        }
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 /* amount */
    ) internal override {
        if (from != address(0)) {
            _editRecipientInternal(from, balanceOf(from));
        }

        if (to != address(0)) {
            _editRecipientInternal(to, balanceOf(to));
        }
    }
}
