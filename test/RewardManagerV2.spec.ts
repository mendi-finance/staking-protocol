import { expect } from "chai";
import { ethers } from "hardhat";
import { ManagerV2FixtureOutput, managerV2Fixture } from "./_fixtures";

describe("RewardManagerV2", () => {
    let fixture: ManagerV2FixtureOutput;

    beforeEach(async () => {
        fixture = await managerV2Fixture();
    });

    it("Should deploy RewardManager properly", async () => {
        const { rewardManager } = fixture;
        expect(rewardManager.address).to.properAddress;
    });

    it("Should add usdc and lynx rewards", async () => {
        const { owner, rewardManager, sMendi, uMendi, mendi, usdc, olynx } =
            fixture;

        const sRewards = await sMendi.claimable();
        const uRewards = await uMendi.claimable();

        const sSupply = await sMendi.totalSupply();
        const uSupply = await uMendi.totalSupply();
        const totalStaked = sSupply.add(uSupply);

        const usdcBalance = await usdc.balanceOf(owner.address);
        const uUsdc = usdcBalance.mul(uSupply).div(totalStaked);
        const olnxBalance = await olynx.balanceOf(owner.address);
        const uLVC = olnxBalance.mul(uSupply).div(totalStaked);
        const sLVC = olnxBalance.sub(uLVC);

        await expect(
            olynx
                .connect(owner)
                .approve(rewardManager.address, ethers.constants.MaxUint256)
        ).not.to.reverted;
        await expect(
            usdc
                .connect(owner)
                .approve(rewardManager.address, ethers.constants.MaxUint256)
        ).not.to.reverted;

        await expect(
            rewardManager
                .connect(owner)
                .addRewards(
                    ethers.constants.MaxUint256,
                    ethers.constants.MaxUint256
                )
        ).not.to.reverted;

        const sMendiRewards = await mendi.balanceOf(sRewards);
        const uUSDCRewards = await usdc.balanceOf(uRewards);
        const sLVCRewards = await olynx.balanceOf(sRewards);
        const uLVCRewards = await olynx.balanceOf(uRewards);
        expect(uUSDCRewards).to.eq(uUsdc);
        expect(sLVCRewards).to.eq(sLVC);
        expect(uLVCRewards).to.eq(uLVC);

        expect(await olynx.balanceOf(rewardManager.address)).to.equal(0);
        expect(await usdc.balanceOf(rewardManager.address)).to.equal(0);
        expect(await mendi.balanceOf(rewardManager.address)).to.equal(0);
    });
});
