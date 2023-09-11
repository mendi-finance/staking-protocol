import { expect } from "chai";
import { ethers } from "hardhat";
import { ManagerFixtureOutput, managerFixture } from "./_fixtures";
import { anyValue } from "./_utils";

describe("RewardManager", () => {
    let fixture: ManagerFixtureOutput;

    beforeEach(async () => {
        fixture = await managerFixture();
    });

    it("Should deploy RewardManager properly", async () => {
        const { rewardManager } = fixture;
        expect(rewardManager.address).to.properAddress;
    });

    it("Should add vara and wkava rewards", async () => {
        const { owner, rewardManager, sMendi, uMendi, mendi, usdc, lvc } =
            fixture;

        const sRewards = await sMendi.claimable();
        const uRewards = await uMendi.claimable();

        const sSupply = await sMendi.totalSupply();
        const uSupply = await uMendi.totalSupply();
        const totalStaked = sSupply.add(uSupply);

        const usdcBalance = await usdc.balanceOf(owner.address);
        const uUsdc = usdcBalance.mul(uSupply).div(totalStaked);
        const lvcBalance = await lvc.balanceOf(owner.address);
        const uLVC = lvcBalance.mul(uSupply).div(totalStaked);
        const sLVC = lvcBalance.sub(uLVC);

        await expect(
            lvc
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
        const sLVCRewards = await lvc.balanceOf(sRewards);
        const uLVCRewards = await lvc.balanceOf(uRewards);
        expect(uUSDCRewards).to.eq(uUsdc);
        expect(sLVCRewards).to.eq(sLVC);
        expect(uLVCRewards).to.eq(uLVC);

        expect(await lvc.balanceOf(rewardManager.address)).to.equal(0);
        expect(await usdc.balanceOf(rewardManager.address)).to.equal(0);
        expect(await mendi.balanceOf(rewardManager.address)).to.equal(0);
    });
});
