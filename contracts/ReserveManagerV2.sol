//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./interfaces/LendingInterfaces.sol";
import "./interfaces/VelocoreInterfaces.sol";
import "./interfaces/LPDepositorInterfaces.sol";
import "./interfaces/RewardManager.sol";
import "./libraries/SafeToken.sol";

contract ReserveManagerV2 is AccessControlUpgradeable {
    using TokenLib for Token;
    using SafeToken for address;

    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    /* Tokens */
    address public constant usdc = 0x176211869cA2b568f2A7D4EE941E073a821EE1ff;
    address public constant olynx = 0x63349BA5E1F71252eCD56E8F950D1A518B400b60;
    address public constant mendi = 0x43E8809ea748EFf3204ee01F08872F063e44065f;
    address public constant pair = 0xE5e19bBF39c76A8c980B48F2Ec89d0dE877bF567;

    /* OpenOcean */
    address public constant OORouter =
        0x6352a56caadC4F1E25CD6c75970Fa768A3304e64;

    /* LGE */
    address public constant lpDepositor =
        0x8f1b13497326857011B0b9A2b066054E1849F14D;

    /* Distribution */
    address public constant rewardManager =
        0x04A716725E43f6618b11d280BFa12491D9AB7BD5;

    function initialize() public initializer {
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /* Guarded Distribution Functions */
    function distributeReserves(
        IMarket usdcMarket,
        uint56 usdcAmount,
        IMarket[] calldata markets,
        uint256[] calldata amounts,
        bytes[] calldata swapQuoteData
    ) external onlyRole(DISTRIBUTOR_ROLE) {
        require(
            markets.length == amounts.length &&
                markets.length == swapQuoteData.length,
            "ReserveManager: INVALID_INPUT"
        );

        reduceReserveInternal(usdcMarket, usdcAmount);

        for (uint256 i = 0; i < markets.length; i++) {
            if (markets[i].reserveGuardian() == address(this)) {
                reduceReserveInternal(markets[i], amounts[i]);
                address underlying = markets[i].underlying();
                swapToBaseInternal(underlying, amounts[i], swapQuoteData[i]);
            }
        }

        uint256 distAmount = usdc.myBalance();

        usdc.safeApprove(rewardManager, distAmount);
        IRewardManager(rewardManager).addRewards(distAmount, 0);
    }

    function distributeOLYNX() external onlyRole(DISTRIBUTOR_ROLE) {
        claimOLYNXInternal();

        uint256 distAmount = olynx.myBalance();

        olynx.safeApprove(rewardManager, distAmount);
        IRewardManager(rewardManager).addRewards(0, distAmount);
    }

    /* Internal Market Management Functions */
    function reduceReserveInternal(IMarket market, uint256 amount) internal {
        market.accrueInterest();

        require(market.getCash() >= amount, "ReserveManager: NOT_ENOUGH_CASH");
        require(
            market.totalReserves() >= amount,
            "ReserveManager: NOT_ENOUGH_RESERVE"
        );

        market._reduceReserves(amount);
    }

    function swapToBaseInternal(
        address underlying,
        uint256 amount,
        bytes memory swapQuoteDatum
    ) internal {
        underlying.safeApprove(OORouter, amount);

        (bool success, bytes memory result) = OORouter.call{value: 0}(
            swapQuoteDatum
        );
        require(success, "ReserveManager: OO_API_SWAP_FAILED");
    }

    function claimOLYNXInternal() internal {
        ILPDepositor(lpDepositor).harvest(pair, address(this));
    }
}
