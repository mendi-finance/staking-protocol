import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async ({
    getNamedAccounts,
    deployments: { deploy },
    ethers,
    network,
}: HardhatRuntimeEnvironment) => {
    return false;
    const { deployer } = await getNamedAccounts();

    const rewardManagerDeploy = await deploy("RewardManager", {
        from: deployer,
        log: true,
        contract: "contracts/RewardManager.sol:RewardManager",
        args: [],
        proxy: {
            proxyContract: "OpenZeppelinTransparentProxy",
            owner: "0xe3CDa0A0896b70F0eBC6A1848096529AA7AEe9eE",
            execute: {
                init: {
                    methodName: "initialize",
                    args: [],
                },
            },
        },
    });
};

const tags = ["RewardManager"];
export { tags };

export default func;
