//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./libraries/SafeToken.sol";
import "./interfaces/IClaimable.sol";

abstract contract Distributor is OwnableUpgradeable {
    using SafeMath for uint256;
    using SafeToken for address;

    uint256 public constant MANTISSA2 = 2 ** 160;

    struct Recipient {
        uint256 lastShareIndex;
        uint256 credit;
    }
    // token => account => recipient
    mapping(address => mapping(address => Recipient)) public recipients;

    // account => shares
    mapping(address => uint256) public shares;

    // token => shareIndex
    mapping(address => uint256) public shareIndex;

    // token => totalShares
    uint256 public totalShares;

    event ClaimableUpdate(address oldClaimable, address newClaimable);
    event UpdateShareIndex(address indexed token, uint256 shareIndex);
    event UpdateCredit(
        address indexed token,
        address indexed account,
        uint256 lastShareIndex,
        uint256 credit
    );
    event EditRecipient(
        address indexed account,
        uint256 shares,
        uint256 totalShares
    );
    event Claim(address indexed token, address indexed account, uint256 amount);

    /// @notice Reward holder where can be claimed
    address public claimable;

    /// @notice Added reward tokens
    address[] public tokens;
    /// @notice Flag to check if reward token added before
    mapping(address => bool) public tokenExists;

    function __Distributor_init(address claimable_) internal onlyInitializing {
        __Ownable_init();
        __Distributor_init_unchained(claimable_);
    }

    function __Distributor_init_unchained(
        address claimable_
    ) internal onlyInitializing {
        claimable = claimable_;
    }

    /* Admin functions */
    function _whitelistToken(address token_) external onlyOwner {
        require(
            token_ != address(0),
            "Distributor: reward token cannot be zero address"
        );
        require(
            !tokenExists[token_],
            "Distributor: reward token already exists"
        );

        tokens.push(token_);
        tokenExists[token_] = true;
    }

    function _setClaimable(address newClaimable) external onlyOwner {
        require(
            newClaimable != address(0),
            "Distributor: claimable cannot be zero"
        );
        address oldClaimable = claimable;

        claimable = newClaimable;

        emit ClaimableUpdate(oldClaimable, newClaimable);
    }

    function updateShareIndex(
        address token
    ) public virtual nonReentrant returns (uint256 _shareIndex) {
        if (totalShares == 0) return shareIndex[token];
        uint256 amount = IClaimable(claimable).claim(token);
        if (amount == 0) return shareIndex[token];

        _shareIndex = amount.mul(MANTISSA2).div(totalShares).add(
            shareIndex[token]
        );
        shareIndex[token] = _shareIndex;
        emit UpdateShareIndex(token, _shareIndex);
    }

    function updateCredit(
        address token,
        address account
    ) public returns (uint256 credit) {
        require(tokenExists[token], "Distributor: Invalid token");

        uint256 _shareIndex = updateShareIndex(token);
        if (_shareIndex == 0) return 0;

        Recipient storage recipient = recipients[token][account];
        uint256 _shares = shares[account];

        credit =
            recipient.credit +
            _shareIndex.sub(recipient.lastShareIndex).mul(_shares) /
            MANTISSA2;
        recipient.lastShareIndex = _shareIndex;
        recipient.credit = credit;

        emit UpdateCredit(token, account, _shareIndex, credit);
    }

    function claim(address token) external returns (uint256 amount) {
        return claimInternal(token, msg.sender);
    }

    function claimAll() external returns (uint256[] memory amounts) {
        amounts = new uint256[](tokens.length);
        for (uint256 i = 1; i < tokens.length; i++) {
            amounts[i] = claimInternal(tokens[i], msg.sender);
        }
    }

    function claimInternal(
        address token,
        address account
    ) internal returns (uint256 amount) {
        require(tokenExists[token], "Distributor: Invalid token");

        amount = updateCredit(token, account);
        if (amount > 0) {
            recipients[token][account].credit = 0;

            IERC20(token).transfer(account, amount);
            //token.safeTransfer(account, amount);

            emit Claim(token, account, amount);
        }
    }

    function _editRecipientInternal(address account, uint256 shares_) internal {
        for (uint256 i = 1; i < tokens.length; i++) {
            updateCredit(tokens[i], account);
        }

        uint256 prevShares = shares[account];
        uint256 _totalShares = shares_ > prevShares
            ? totalShares.add(shares_ - prevShares)
            : totalShares.sub(prevShares - shares_);
        totalShares = _totalShares;
        shares[account] = shares_;
        emit EditRecipient(account, shares_, _totalShares);
    }

    /** Getters */
    function getTokens() public view returns (address[] memory) {
        return tokens;
    }

    // Prevents a contract from calling itself, directly or indirectly.
    bool internal _notEntered = true;
    modifier nonReentrant() {
        require(_notEntered, "Distributor: REENTERED");
        _notEntered = false;
        _;
        _notEntered = true;
    }
}