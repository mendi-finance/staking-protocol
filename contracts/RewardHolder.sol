//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./libraries/SafeToken.sol";
import "./interfaces/IClaimable.sol";

contract RewardHolder is IClaimable, OwnableUpgradeable {
    using SafeToken for address;

    event RecipientUpdate(address oldRecipient, address newRecipient);

    // guy who can claim
    address public recipient;

    function initialize() public initializer {
        __Ownable_init();
    }

    /** Admin Functions */
    function _setRecipient(address newRecipient) public onlyOwner {
        require(
            newRecipient != address(0),
            "RewardHolder: recipient cannot be zero"
        );

        address oldRecipient = recipient;
        recipient = newRecipient;
        emit RecipientUpdate(oldRecipient, newRecipient);
    }

    function claim(address token) public returns (uint256 amount) {
        require(
            _msgSender() == recipient,
            "RewardHolder: only recipient can claim"
        );

        amount = token.balanceOf(address(this));
        if (amount > 0) {
            token.safeTransfer(_msgSender(), amount);
            emit Claim(token, _msgSender(), amount);
        }
    }
}
