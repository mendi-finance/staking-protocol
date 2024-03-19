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

export type ManagerV2FixtureOutput = {
    owner: SignerWithAddress;
    rewardManager: Contract;
    reserveManager: Contract;
    sMendi: Contract;
    uMendi: Contract;
    mendi: Contract;
    usdc: Contract;
    olynx: Contract;
};
const managerV2Fixture = deployments.createFixture<ManagerV2FixtureOutput, any>(
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

        const olynxAddress = await rewardManager.olynx();
        const olynx = await ethers.getContractAt("IERC20", olynxAddress);

        // impersonate whale and transfer tokens to owner
        const usdcWhaleAddress = "0x7160570bb153edd0ea1775ec2b2ac9b65f1ab61b";
        const olynxWhaleAddress = "0xe8a4c9b6a2b79fd844c9e3adbc8dc841eece557b";
        const [usdcWhale, olynxWhale] = await Promise.all([
            getImpersonatedSigner(usdcWhaleAddress),
            getImpersonatedSigner(olynxWhaleAddress),
        ]);

        // transfer tokens to owner
        await Promise.all([
            usdc
                .connect(usdcWhale)
                .transfer(
                    owner.address,
                    await usdc.balanceOf(usdcWhaleAddress)
                ),
            olynx
                .connect(olynxWhale)
                .transfer(
                    owner.address,
                    await olynx.balanceOf(olynxWhaleAddress)
                ),
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
            olynx,
        };
    }
);

export type LPDepositorFixtureOutput = {
    owner: SignerWithAddress;
    lpDepositor: Contract;
    reserveManager: Contract;
    pair: Contract;
    olynx: Contract;
    pairWhale: SignerWithAddress;
    harvester: SignerWithAddress;
    DEPOSITOR_ROLE: string;
    WITHDRAWER_ROLE: string;
    HARVESTER_ROLE: string;
};
const lpDepositorFixture = deployments.createFixture<
    LPDepositorFixtureOutput,
    any
>(async ({ deployments, companionNetworks }, options) => {
    await deployments.fixture(undefined, {
        keepExistingDeployments: true,
    });

    const [owner, harvester] = await ethers.getSigners();

    const lpDepositor = await ethers.getContract("LPDepositor");
    console.log(lpDepositor.address);
    const reserveManager = await ethers.getContract("ReserveManager");

    const pairAddress = await reserveManager.pair();
    const pair = await ethers.getContractAt("IERC20", pairAddress);

    const olynxAddress = await reserveManager.olynx();
    const olynx = await ethers.getContractAt("IERC20", olynxAddress);

    // impersonate whale and transfer tokens to owner
    const pairWhaleAddress = "0x2c99A11ADbEe017FDB9F1fF9cae66BBf09fbFB3b";
    const [pairWhale] = await Promise.all([
        getImpersonatedSigner(pairWhaleAddress),
    ]);

    const DEPOSITOR_ROLE = await lpDepositor.DEPOSITOR_ROLE();
    await lpDepositor.grantRole(DEPOSITOR_ROLE, pairWhale.address);

    const WITHDRAWER_ROLE = await lpDepositor.WITHDRAWER_ROLE();
    await lpDepositor.grantRole(WITHDRAWER_ROLE, owner.address);

    const HARVESTER_ROLE = await lpDepositor.HARVESTER_ROLE();
    await lpDepositor.grantRole(HARVESTER_ROLE, harvester.address);

    const owner_hasRole = await lpDepositor.hasRole(
        DEPOSITOR_ROLE,
        pair.address
    );

    return {
        owner,
        harvester,
        lpDepositor,
        reserveManager,
        pair,
        olynx,
        pairWhale,
        DEPOSITOR_ROLE,
        WITHDRAWER_ROLE,
        HARVESTER_ROLE,
    };
});

export { managerFixture, managerV2Fixture, lpDepositorFixture };
