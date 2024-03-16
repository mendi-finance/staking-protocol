import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const underlying: string = "0x43E8809ea748EFf3204ee01F08872F063e44065f";
const rewardTokens: string[] = ["0x176211869ca2b568f2a7d4ee941e073a821ee1ff"];

const func: DeployFunction = async ({
    getNamedAccounts,
    deployments: { deploy },
    ethers,
    network,
}: HardhatRuntimeEnvironment) => {
    return false;
    const { deployer } = await getNamedAccounts();

    const rewardHolderDeploy = await deploy("uMendiRewards", {
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

    const stakeDeploy = await deploy("uMendi", {
        from: deployer,
        log: true,
        contract: "contracts/StakedDistributor.sol:StakedDistributor",
        proxy: {
            proxyContract: "OpenZeppelinTransparentProxy",
            execute: {
                init: {
                    methodName: "initialize",
                    args: [
                        rewardHolderDeploy.address,
                        "Staked Mendi",
                        "uMendi",
                        underlying,
                    ],
                },
            },
        },
    });
    const staking = await ethers.getContractAt(
        "StakedDistributor",
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
};

const tags = ["uMendi"];
export { tags };

export default func;
