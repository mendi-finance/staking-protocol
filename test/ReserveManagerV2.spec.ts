import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import fetch from "node-fetch";
import { managerFixture } from "./_fixtures";

describe.only("ReserveManagerV2", () => {
    let deployer: SignerWithAddress;
    let rewardManager: Contract;
    let reserveManager: Contract;

    let comptroller: Contract;

    beforeEach(async () => {
        const fixture = await managerFixture();
        deployer = fixture.owner;
        rewardManager = fixture.rewardManager;
        reserveManager = fixture.reserveManager;

        const comptrollerAddress = "0x1b4d3b0421dDc1eB216D230Bc01527422Fb93103";
        comptroller = await ethers.getContractAt(
            "IComptroller",
            comptrollerAddress
        );
    });

    it("Should deploy RewardManager properly", async () => {
        expect(rewardManager.address).to.properAddress;
        expect(reserveManager.address).to.properAddress;
    });

    it.only("Should distribute reserves", async () => {
        const usdc = await reserveManager.usdc();

        const marketAddresses: string[] = await comptroller.getAllMarkets();
        const markets = await Promise.all(
            marketAddresses.map(addr => ethers.getContractAt("IMarket", addr))
        );
        const marketInfo = await Promise.all(
            markets.map(async m => {
                const underlyingAddress = await m.underlying();
                const underlying = await ethers.getContractAt(
                    "ERC20",
                    underlyingAddress
                );
                const underlyingDecimals = await underlying.decimals();
                const reserve = await m.totalReserves();
                const cash = await m.getCash();
                const amount = reserve.gt(cash) ? cash : reserve;
                const data = await fetchSwapDataV3(
                    underlying.address,
                    underlyingDecimals,
                    amount,
                    reserveManager.address
                );

                return {
                    market: m,
                    underlying,
                    underlyingDecimals,
                    reserve,
                    cash,
                    amount,
                    data,
                };
            })
        );
        const usdcMarketInfo = marketInfo.find(
            m => m.underlying.address.toLowerCase() === usdc.toLowerCase()
        );
        const otherMarketInfo = marketInfo.filter(
            m => m != usdcMarketInfo && m.amount > 0
        );

        console.log(otherMarketInfo.map(om => om.market.address));
        console.log(otherMarketInfo.map(om => om.amount));

        await expect(
            reserveManager.distributeReserves(
                usdcMarketInfo?.market.address,
                usdcMarketInfo?.amount,
                otherMarketInfo.map(om => om.market.address),
                otherMarketInfo.map(om => om.amount),
                otherMarketInfo.map(om => om.data)
            )
        ).not.reverted;
    });

    it("Should distribute olynx", async () => {
        await expect(reserveManager.distributeOLYNX()).not.reverted;
    });
});

const fetchSwapDataV3 = async (
    underlying: string,
    underlyingDecimals: number,
    amount: BigNumber,
    account: string
) => {
    // get routes
    const routeUrl = "https://aggregator-api.kyberswap.com/linea/api/v1/routes";
    const routeParams = new URLSearchParams();
    routeParams.append("tokenIn", underlying);
    routeParams.append(
        "tokenOut",
        "0x176211869cA2b568f2A7D4EE941E073a821EE1ff"
    );
    routeParams.append("amountIn", amount.toString());

    const routeResponse = await fetch(`${routeUrl}?${routeParams}`, {
        method: "GET",
    });
    const routeData = await routeResponse.json();
    if (routeData.code == 4000) return null;

    const routeSummary = routeData.data.routeSummary;

    // get swap data
    const swapUrl =
        "https://aggregator-api.kyberswap.com/linea/api/v1/route/build";
    const swapBody = {
        routeSummary,
        sender: account,
        recipient: account,
        slippageTolerance: 5000,
    };
    const swapResponse = await fetch(swapUrl, {
        method: "POST",
        body: JSON.stringify(swapBody),
    });
    const swapData = await swapResponse.json();

    return swapData.data.data;
};
