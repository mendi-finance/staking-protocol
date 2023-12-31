import { BigNumber } from "ethers";
import { ethers, network } from "hardhat";
import { SignerWithAddress } from "hardhat-deploy-ethers/signers";

const sumArray = (array: BigNumber[][]) => {
    const newArray: BigNumber[] = [];
    array.forEach(sub => {
        sub.forEach((num: BigNumber, index: number) => {
            if (newArray[index]) {
                newArray[index] = newArray[index].add(num);
            } else {
                newArray[index] = num;
            }
        });
    });
    return newArray;
};

const getTokenContract = async (opts: {
    admin: SignerWithAddress;
    mintAmount?: BigNumber;
    existingAddress?: string;
    whaleAddress?: string;
    decimals?: string;
}) => {
    if (opts.existingAddress) {
        const token = await ethers.getContractAt(
            "MockERC20Token",
            opts.existingAddress
        );

        if (opts.whaleAddress) {
            const whale = await ethers.getSigner(opts.whaleAddress);

            const balance = await token.balanceOf(whale.address);
            await (
                await token.connect(whale).transfer(opts.admin.address, balance)
            ).wait(1);
        }

        return token;
    } else {
        const Token = await ethers.getContractFactory("MockERC20Token");
        const token = await Token.connect(opts.admin).deploy(
            opts.mintAmount || ethers.utils.parseEther("100000000"),
            18
        );
        return token;
    }
};

const getImpersonatedSigner = async (account: string) => {
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [account],
    });

    const newBalanceHex = ethers.utils
        .parseEther("100")
        .toHexString()
        .replace("0x0", "0x");
    await network.provider.request({
        method: "hardhat_setBalance",
        params: [account, newBalanceHex],
    });
    return ethers.getSigner(account);
};

function anyValue() {
    return true;
}

export { sumArray, getTokenContract, getImpersonatedSigner, anyValue };
