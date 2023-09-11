//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./interfaces/VelocoreInterfaces.sol";
import "./libraries/SafeToken.sol";

import "./StakedDistributor.sol";

contract RewardManager is OwnableUpgradeable {
    using SafeToken for address;

    uint256 private constant teamShare = 0.2e18;

    StakedDistributor public immutable sMendi =
        StakedDistributor(0x150b1e51738CdF0cCfe472594C62d7D6074921CA);
    StakedDistributor public immutable uMendi =
        StakedDistributor(0xcf8deDCdC62317beAEdfBee3C77C08425F284486);
    StakedDistributor public immutable tMendi =
        StakedDistributor(0xE17D41790ee5b794C22ce7276905490F60ACF662);

    /* Tokens */
    address public immutable mendi = 0x43E8809ea748EFf3204ee01F08872F063e44065f;
    address public immutable usdc = 0x176211869cA2b568f2A7D4EE941E073a821EE1ff;
    address public immutable lvc = 0xcc22F6AA610D1b2a0e89EF228079cB3e1831b1D1;

    /* Velocore */
    IVault public constant vault =
        IVault(0x1d0188c4B276A09366D05d6Be06aF61a73bC7535);
    IFactory public constant factory =
        IFactory(0xBe6c6A389b82306e88d74d1692B67285A9db9A47);
    Token public mendiToken;
    Token public usdcToken;
    Token public lvcToken;
    IPool public mendiUSDCPool;
    Token public mendiUSDCPoolToken;

    function initialize() public initializer {
        __Ownable_init();

        mendiToken = toToken(IERC20(address(mendi)));
        usdcToken = toToken(IERC20(address(usdc)));
        lvcToken = toToken(IERC20(address(lvc)));

        mendiUSDCPool = factory.pools(mendiToken, usdcToken);
        mendiUSDCPoolToken = toToken(IERC20(address(mendiUSDCPool)));
    }

    function addRewards(uint256 usdcAmount, uint256 lvcAmount) public {
        // calculate supplies
        uint256 sMendiSupply = sMendi.totalSupply();
        uint256 uMendiSupply = uMendi.totalSupply();
        uint256 totalSupply = sMendiSupply + uMendiSupply;

        // add lvc
        if (lvcAmount > 0) {
            pullTokenInternal(lvc, lvcAmount);
            addTokenRewardInternal(lvc, uMendiSupply, totalSupply);
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

        // add to tMendi
        uint256 tMendiAmount = (amount * teamShare) / 1e18;
        address tRewardHolder = tMendi.claimable();
        token.safeTransfer(tRewardHolder, tMendiAmount);

        amount = token.myBalance();

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

        // add to tMendi
        uint256 tMendiAmount = (amount * teamShare) / 1e18;
        address tRewardHolder = tMendi.claimable();
        usdc.safeTransfer(tRewardHolder, tMendiAmount);

        amount = usdc.myBalance();

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
        usdc.safeApprove(address(vault), usdcAmount);

        run2Internal(
            0,
            mendiUSDCPool,
            VC_POOL_SWAP,
            usdcToken,
            VC_EXACTLY,
            int128(uint128(usdcAmount)),
            mendiToken,
            VC_AT_MOST,
            0
        );
    }

    function run2Internal(
        uint256 value,
        IPool pool,
        uint8 method,
        Token t1,
        uint8 m1,
        int128 a1,
        Token t2,
        uint8 m2,
        int128 a2
    ) internal {
        Token[] memory tokens = new Token[](2);

        VelocoreOperation[] memory ops = new VelocoreOperation[](1);

        tokens[0] = (t1);
        tokens[1] = (t2);

        ops[0].poolId =
            bytes32(bytes1(method)) |
            bytes32(uint256(uint160(address(pool))));
        ops[0].tokenInformations = new bytes32[](2);
        ops[0].data = "";

        ops[0].tokenInformations[0] =
            bytes32(bytes1(0x00)) |
            bytes32(bytes2(uint16(m1))) |
            bytes32(uint256(uint128(uint256(int256(a1)))));
        ops[0].tokenInformations[1] =
            bytes32(bytes1(0x01)) |
            bytes32(bytes2(uint16(m2))) |
            bytes32(uint256(uint128(uint256(int256(a2)))));
        vault.execute{value: value}(tokens, new int128[](2), ops);
    }
}
