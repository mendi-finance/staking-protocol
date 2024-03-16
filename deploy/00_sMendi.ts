import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const underlying: string = "0x43E8809ea748EFf3204ee01F08872F063e44065f";
const rewardTokens: string[] = ["0x43E8809ea748EFf3204ee01F08872F063e44065f"];

const func: DeployFunction = async ({
    getNamedAccounts,
    deployments: { deploy },
    ethers,
    network,
}: HardhatRuntimeEnvironment) => {
    return false;
    const { deployer } = await getNamedAccounts();

    const rewardHolderDeploy = await deploy("sMendiRewards", {
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

    const stakeDeploy = await deploy("sMendi", {
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
                        "sMendi",
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

const tags = ["sMendi"];
export { tags };

export default func;
