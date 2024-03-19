//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./interfaces/LynxInterfaces.sol";
import "./libraries/SafeToken.sol";

import "./StakedDistributor.sol";

contract RewardManagerV2 is OwnableUpgradeable {
    using SafeToken for address;

    StakedDistributor public constant sMendi =
        StakedDistributor(0x150b1e51738CdF0cCfe472594C62d7D6074921CA);
    StakedDistributor public constant uMendi =
        StakedDistributor(0xcf8deDCdC62317beAEdfBee3C77C08425F284486);

    /* Tokens */
    address public constant mendi = 0x43E8809ea748EFf3204ee01F08872F063e44065f;
    address public constant usdc = 0x176211869cA2b568f2A7D4EE941E073a821EE1ff;
    address public constant olynx = 0x63349BA5E1F71252eCD56E8F950D1A518B400b60;

    /* Lynx */
    IRouter public immutable router =
        IRouter(0x610D2f07b7EdC67565160F587F37636194C34E74);

    function initialize() public initializer {
        __Ownable_init();
    }

    function addRewards(uint256 usdcAmount, uint256 lynxAmount) public {
        // calculate supplies
        uint256 sMendiSupply = sMendi.totalSupply();
        uint256 uMendiSupply = uMendi.totalSupply();
        uint256 totalSupply = sMendiSupply + uMendiSupply;

        // add lynx
        if (lynxAmount > 0) {
            pullTokenInternal(olynx, lynxAmount);
            addTokenRewardInternal(olynx, uMendiSupply, totalSupply);
        }

        // add usdc
        if (usdcAmount > 0) {
            pullTokenInternal(usdc, usdcAmount);
            addUSDCRewardInternal(uMendiSupply, totalSupply);
        }
    }

    function pullTokenInternal(address token, uint256 amount) internal {
        if (amount == type(uint256).max) {
            amount = token.balanceOf(msg.sender);
        }

        token.safeTransferFrom(msg.sender, address(this), amount);
    }

    function addTokenRewardInternal(
        address token,
        uint256 uMendiSupply,
        uint256 totalSupply
    ) internal {
        uint256 amount = token.myBalance();
        if (amount == 0) return;

        // add to uMendi
        uint256 uMendiAmount = (amount * uMendiSupply) / totalSupply;
        address uRewardHolder = uMendi.claimable();
        token.safeTransfer(uRewardHolder, uMendiAmount);

        // add to sMendi
        uint256 sMendiAmount = amount = token.myBalance();
        address sRewardHolder = sMendi.claimable();
        token.safeTransfer(sRewardHolder, sMendiAmount);
    }

    function addUSDCRewardInternal(
        uint256 uMendiSupply,
        uint256 totalSupply
    ) internal {
        uint256 amount = usdc.myBalance();
        if (amount == 0) return;

        // add to uMendi
        uint256 uMendiUSDCAmount = (amount * uMendiSupply) / totalSupply;
        address uRewardHolder = uMendi.claimable();
        usdc.safeTransfer(uRewardHolder, uMendiUSDCAmount);

        // swap usdc to mendi
        uint256 sMendiUSDCAmount = usdc.myBalance();
        swapUSDCtoMendiInternal(sMendiUSDCAmount);

        // add to sMendi
        uint256 mendiAmount = mendi.myBalance();
        address sRewardHolder = sMendi.claimable();
        mendi.safeTransfer(sRewardHolder, mendiAmount);
    }

    function swapUSDCtoMendiInternal(uint256 usdcAmount) internal {
        IRouter.route[] memory path = new IRouter.route[](1);
        path[0] = IRouter.route({from: usdc, to: mendi, stable: false});

        usdc.safeApprove(address(router), usdcAmount);
        router.swapExactTokensForTokens(
            usdcAmount,
            0,
            path,
            address(this),
            block.timestamp
        );
    }
}
