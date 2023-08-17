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
    const { deployer } = await getNamedAccounts();

    if (await ethers.getContractOrNull("uMendi")) {
        console.log("uMendi already deployed");
        return;
    }

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

    for (const rewardToken of rewardTokens) {
        await (await staking._whitelistToken(rewardToken)).wait(1);
    }
};

const tags = ["sMendi"];
export { tags };

export default func;
