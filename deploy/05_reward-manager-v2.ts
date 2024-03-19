import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async ({
    getNamedAccounts,
    deployments: { deploy },
    ethers,
    network,
}: HardhatRuntimeEnvironment) => {
    const { deployer } = await getNamedAccounts();

    const rewardManagerDeploy = await deploy("RewardManager", {
        from: deployer,
        log: true,
        contract: "contracts/RewardManagerV2.sol:RewardManagerV2",
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

const tags = ["RewardManagerV2"];
export { tags };

export default func;
