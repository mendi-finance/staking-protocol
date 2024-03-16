import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const shares = {
    "0xd9b677Aa52a5A1e761C93fe79dadD0c803c0C091": "20000000000000000000",
    "0xf283bd9566dF12C577c23Aac9D888f1e1df4F916": "40000000000000000000",
    "0x6130aCbDa5763c581365EAB9784d5Cb6B2a4B2Ba": "40000000000000000000",
    "0xa2886a8d6ba147a8dca5d09e66159b923c0400cf": "33333333333333333333",
    "0x2c99a11adbee017fdb9f1ff9cae66bbf09fbfb3b": "33333333333333333333",
    "0xd244cda840473c753205531959a4d1f729730298": "33333333333333333334",
};
const rewardTokens: string[] = [
    "0x176211869ca2b568f2a7d4ee941e073a821ee1ff",
    "0xcc22f6aa610d1b2a0e89ef228079cb3e1831b1d1",
    "0x43e8809ea748eff3204ee01f08872f063e44065f",
];

const func: DeployFunction = async ({
    getNamedAccounts,
    deployments: { deploy },
    ethers,
    network,
}: HardhatRuntimeEnvironment) => {
    return false;
    const { deployer } = await getNamedAccounts();

    const rewardHolderDeploy = await deploy("tMendiRewards", {
        from: deployer,
        log: true,
        contract: "contracts/RewardHolder.sol:RewardHolder",
        proxy: {
            proxyContract: "OpenZeppelinTransparentProxy",
            execute: {
                init: {
                    methodName: "initialize",
                    args: [],
                },
            },
        },
    });
    const rewardHolder = await ethers.getContractAt(
        "RewardHolder",
        rewardHolderDeploy.address
    );

    const stakeDeploy = await deploy("tMendi", {
        from: deployer,
        log: true,
        contract: "contracts/OwnedDistributor.sol:OwnedDistributor",
        proxy: {
            proxyContract: "OpenZeppelinTransparentProxy",
            execute: {
                init: {
                    methodName: "initialize",
                    args: [rewardHolderDeploy.address, "Team Mendi", "tMendi"],
                },
            },
        },
    });
    const staking = await ethers.getContractAt(
        "OwnedDistributor",
        stakeDeploy.address
    );

    // set reward holder recipient
    const curRecipient = await rewardHolder.recipient();
    if (curRecipient?.toLowerCase() !== staking.address.toLowerCase()) {
        await (await rewardHolder._setRecipient(staking.address)).wait(1);
    }

    // add reward tokens
    for (const rewardToken of rewardTokens) {
        if (!(await staking.tokenExists(rewardToken))) {
            await (await staking._whitelistToken(rewardToken)).wait(1);
        }
    }

    // mint shares
    for (const [address, share] of Object.entries(shares)) {
        const curShare = await staking.balanceOf(address);
        if (share > curShare) {
            const diff = ethers.BigNumber.from(share).sub(curShare);
            await (await staking.mintTo(address, diff)).wait(1);
        } else if (curShare > share) {
            const diff = curShare.sub(share);
            await (await staking.burnFrom(address, diff)).wait(1);
        }
    }
};

const tags = ["tMendi"];
export { tags };

export default func;
