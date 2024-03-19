import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";
import fetch from "node-fetch";
import { managerFixture } from "./_fixtures";

describe("ReserveManagerV2", () => {
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

    it("Should distribute reserves", async () => {
        const usdt = await reserveManager.usdc();

        const marketAddresses: string[] = await comptroller.getAllMarkets();
        const markets = await Promise.all(
            marketAddresses.map(addr => ethers.getContractAt("IMarket", addr))
        );
        const marketInfo = await Promise.all(
            markets.map(async m => {
                console.log("market", m.address);
                const underlyingAddress = await m.underlying();
                const underlying = await ethers.getContractAt(
                    "ERC20",
                    underlyingAddress
                );
                console.log("underlying", underlying.address);
                const underlyingDecimals = await underlying.decimals();
                const reserve = await m.totalReserves();
                const cash = await m.getCash();
                const amount = reserve.gt(cash) ? cash : reserve;
                const data = (
                    await fetchSwapDataV3(
                        underlying.address,
                        underlyingDecimals,
                        amount,
                        reserveManager.address
                    )
                ).data;

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
        const usdtMarketInfo = marketInfo.find(
            m => m.underlying.address.toLowerCase() === usdt.toLowerCase()
        );
        const otherMarketInfo = marketInfo.filter(m => m != usdtMarketInfo);

        await expect(
            reserveManager.distributeReserves(
                usdtMarketInfo?.market.address,
                usdtMarketInfo?.amount,
                otherMarketInfo.map(om => om.market.address),
                otherMarketInfo.map(om => om.amount),
                otherMarketInfo.map(om => om.data.data)
            )
        ).not.reverted;
    });

    it("Should distribute vara", async () => {
        await expect(reserveManager.distributeLVC()).not.reverted;
    });
});

const fetchSwapDataV3 = async (
    underlying: string,
    underlyingDecimals: number,
    amount: BigNumber,
    account: string
) => {
    const url = "https://open-api.openocean.finance/v3/linea/swap_quote";
    const queryParams = new URLSearchParams();
    queryParams.append("chain", "linea");
    queryParams.append("inTokenAddress", underlying);
    queryParams.append(
        "outTokenAddress",
        "0x176211869cA2b568f2A7D4EE941E073a821EE1ff"
    );
    queryParams.append(
        "amount",
        ethers.utils.formatUnits(amount, underlyingDecimals)
    );
    queryParams.append("gasPrice", "1");
    queryParams.append("slippage", "1");
    queryParams.append("account", account);

    console.log(`${url}?${queryParams}`);
    const response = await fetch(`${url}?${queryParams}`, {
        method: "GET",
    });
    const data = await response.json();
    return data;
};
