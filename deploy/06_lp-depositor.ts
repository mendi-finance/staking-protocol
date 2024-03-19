import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async ({
    getNamedAccounts,
    deployments: { deploy },
    ethers,
    network,
}: HardhatRuntimeEnvironment) => {
    const { deployer } = await getNamedAccounts();

    const lpDepositor = await deploy("LPDepositor", {
        from: deployer,
        log: true,
        contract: "contracts/LPDepositor.sol:LPDepositor",
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

const tags = ["LPDepositor"];
export { tags };

export default func;
