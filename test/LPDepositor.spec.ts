import { expect } from "chai";
import { LPDepositorFixtureOutput, lpDepositorFixture } from "./_fixtures";
import { ethers } from "ethers";

describe.only("LPDepositor", () => {
    let fixture: LPDepositorFixtureOutput;

    beforeEach(async () => {
        fixture = await lpDepositorFixture();
    });

    it("Should stake lp", async () => {
        const { lpDepositor, pairWhale, pair, owner, DEPOSITOR_ROLE } = fixture;

        var pairBalance = await pair.balanceOf(pairWhale.address);
        await pair.connect(pairWhale).approve(lpDepositor.address, pairBalance);

        await expect(
            lpDepositor
                .connect(owner)
                ._stakeLP(pair.address, ethers.constants.MaxUint256)
        ).to.revertedWith(
            `AccessControl: account ${owner.address?.toLowerCase()} is missing role ${DEPOSITOR_ROLE?.toLowerCase()}`
        );

        await expect(
            lpDepositor
                .connect(pairWhale)
                ._stakeLP(pair.address, ethers.constants.MaxUint256)
        ).to.not.reverted;

        expect(await pair.balanceOf(pairWhale.address)).to.equal(0);
    });

    it("Should unstake lp", async () => {
        const { lpDepositor, pairWhale, pair, owner, WITHDRAWER_ROLE } =
            fixture;

        var pairBalance = await pair.balanceOf(pairWhale.address);
        await pair.connect(pairWhale).approve(lpDepositor.address, pairBalance);

        await expect(
            lpDepositor
                .connect(pairWhale)
                ._stakeLP(pair.address, ethers.constants.MaxUint256)
        ).to.not.reverted;

        await expect(
            lpDepositor
                .connect(pairWhale)
                ._unstakeLP(pair.address, pairWhale.address)
        ).to.revertedWith(
            `AccessControl: account ${pairWhale.address?.toLowerCase()} is missing role ${WITHDRAWER_ROLE?.toLowerCase()}`
        );

        await expect(
            lpDepositor
                .connect(owner)
                ._unstakeLP(pair.address, pairWhale.address)
        ).to.not.reverted;

        expect(await pair.balanceOf(lpDepositor.address)).to.equal(0);
        expect(await pair.balanceOf(pairWhale.address)).to.equal(pairBalance);
    });

    it("Should harvest", async () => {
        const {
            lpDepositor,
            pairWhale,
            pair,
            olynx,
            owner,
            harvester,
            HARVESTER_ROLE,
        } = fixture;

        var pairBalance = await pair.balanceOf(pairWhale.address);
        await pair.connect(pairWhale).approve(lpDepositor.address, pairBalance);

        await lpDepositor
            .connect(pairWhale)
            ._stakeLP(pair.address, ethers.constants.MaxUint256);

        await expect(
            lpDepositor
                .connect(pairWhale)
                .harvest(pair.address, pairWhale.address)
        ).to.revertedWith(
            `AccessControl: account ${pairWhale.address?.toLowerCase()} is missing role ${HARVESTER_ROLE?.toLowerCase()}`
        );

        await expect(
            lpDepositor.connect(harvester).harvest(pair.address, owner.address)
        ).to.not.reverted;

        expect(await olynx.balanceOf(lpDepositor.address)).to.eq(0);
        //expect(await olynx.balanceOf(owner.address)).to.gt(0);
    });
});
