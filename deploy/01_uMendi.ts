import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const underlying: string = "";
const rewardTokens: string[] = [];

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
                        underlying,
                        "Staked Mendi",
                        "uMendi",
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
        await (await staking.addToken(rewardToken)).wait(1);
    }
};

const tags = ["uMendi"];
export { tags };

export default func;
