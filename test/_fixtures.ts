import { Contract } from "ethers";
import { deployments, ethers } from "hardhat";
import { getImpersonatedSigner } from "./_utils";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";

export type ManagerFixtureOutput = {
    owner: SignerWithAddress;
    rewardManager: Contract;
    reserveManager: Contract;
    sMendi: Contract;
    uMendi: Contract;
    mendi: Contract;
    usdc: Contract;
    lvc: Contract;
};
const managerFixture = deployments.createFixture<ManagerFixtureOutput, any>(
    async ({ deployments, companionNetworks }, options) => {
        const [deployer] = await ethers.getSigners();

        await deployments.fixture(undefined, {
            keepExistingDeployments: true,
        });

        const [owner] = await ethers.getSigners();

        // Reward Manager
        const rewardManager = await ethers.getContract("RewardManager");

        const sMendiAddress = await rewardManager.sMendi();
        const sMendi = await ethers.getContractAt(
            "StakedDistributor",
            sMendiAddress
        );

        const uMendiAddress = await rewardManager.uMendi();
        const uMendi = await ethers.getContractAt(
            "StakedDistributor",
            uMendiAddress
        );

        const mendiAddress = await rewardManager.mendi();
        const mendi = await ethers.getContractAt("IERC20", mendiAddress);

        const usdcAddress = await rewardManager.usdc();
        const usdc = await ethers.getContractAt("IERC20", usdcAddress);

        const lvcAddress = await rewardManager.lvc();
        const lvc = await ethers.getContractAt("IERC20", lvcAddress);

        // impersonate whale and transfer tokens to owner
        const usdcWhaleAddress = "0xfbedc4ebeb2951ff96a636c934fce35117847c9d";
        const lvcWhaleAddress = "0xc29d6792e81086788fd485b345b4b2d3fad2897e";
        const [usdcWhale, varaWhale] = await Promise.all([
            getImpersonatedSigner(usdcWhaleAddress),
            getImpersonatedSigner(lvcWhaleAddress),
        ]);

        // transfer tokens to owner
        await Promise.all([
            usdc
                .connect(usdcWhale)
                .transfer(
                    owner.address,
                    await usdc.balanceOf(usdcWhaleAddress)
                ),
            lvc
                .connect(varaWhale)
                .transfer(owner.address, await lvc.balanceOf(lvcWhaleAddress)),
        ]);

        // Reserve Manager
        const reserveManager = await ethers.getContract("ReserveManager");

        // add distributor role to deployer
        const distributorRole = await reserveManager.DISTRIBUTOR_ROLE();
        await reserveManager.grantRole(distributorRole, deployer.address);

        // set reserveManager as markets reserve guardian
        const comptrollerAddress = "0x1b4d3b0421dDc1eB216D230Bc01527422Fb93103";
        const comptroller = await ethers.getContractAt(
            "IComptroller",
            comptrollerAddress
        );
        const marketAddresses: string[] = await comptroller.getAllMarkets();
        await Promise.all(
            marketAddresses.map(async addr => {
                const market = await ethers.getContractAt("IMarket", addr);
                const admin = await market.admin();
                const adminSigner = await getImpersonatedSigner(admin);
                await market
                    .connect(adminSigner)
                    ._setReserveGuardian(reserveManager.address);
            })
        );

        return {
            owner,
            rewardManager,
            reserveManager,
            sMendi,
            uMendi,
            mendi,
            usdc,
            lvc,
        };
    }
);

export { managerFixture };
