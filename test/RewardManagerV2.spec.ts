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

        const before_uUSDCRewards = await usdc.balanceOf(uRewards);
        const before_sLVCRewards = await olynx.balanceOf(sRewards);
        const before_uLVCRewards = await olynx.balanceOf(uRewards);

        await expect(
            rewardManager
                .connect(owner)
                .addRewards(
                    ethers.constants.MaxUint256,
                    ethers.constants.MaxUint256
                )
        ).not.to.reverted;

        const after_uUSDCRewards = await usdc.balanceOf(uRewards);
        const after_sLVCRewards = await olynx.balanceOf(sRewards);
        const after_uLVCRewards = await olynx.balanceOf(uRewards);

        expect(after_uUSDCRewards.sub(before_uUSDCRewards)).to.eq(uUsdc);
        expect(after_sLVCRewards.sub(before_sLVCRewards)).to.eq(sLVC);
        expect(after_uLVCRewards.sub(before_uLVCRewards)).to.eq(uLVC);

        expect(await olynx.balanceOf(rewardManager.address)).to.equal(0);
        expect(await usdc.balanceOf(rewardManager.address)).to.equal(0);
        expect(await mendi.balanceOf(rewardManager.address)).to.equal(0);
    });
});
