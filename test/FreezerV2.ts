import { ethers, network } from "hardhat";
import { FreezerV2, IERC20, IGhny } from "../typechain-types";
import { expect } from "chai";

const signerAddress = "0xa76334538e31c5271ce25201561944c4db41a4be";
const multisig = "0x981B04CBDCEE0C510D331fAdc7D6836a77085030";
const ghnyAddress = "0xa045E37a0D1dd3A45fefb8803D22457abc0A728a";
const stakingPoolAddress = "0x6F42895f37291ec45f0A307b155229b923Ff83F1";

let FreezerInstance: FreezerV2;
let GhnyToken: IGhny;
let signer: any;

describe("FreezerV2", function () {
    beforeEach(async function () {
        const Freezer = await ethers.getContractFactory("FreezerV2");
        FreezerInstance = await Freezer.deploy();

        GhnyToken = await ethers.getContractAt("IGhny", ghnyAddress);

        //grant minter role
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [multisig],
        });
        const multisigSigner = await ethers.getSigner(multisig);
        await GhnyToken.connect(multisigSigner).grantRole(await GhnyToken.MINTER_ROLE(), FreezerInstance.address);
        await GhnyToken.connect(multisigSigner).grantRole(await GhnyToken.MINTER_ROLE(), stakingPoolAddress);

        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [signerAddress],
        });
        signer = await ethers.getSigner(signerAddress);

    });

    it("Can not freeze zero amount", async function () {
        await expect(FreezerInstance.freeze(0, ethers.constants.AddressZero)).to.be.revertedWith("No amount provided")
    });
    it("Can not freeze when not approved", async function () {
        await expect(FreezerInstance.freeze(1, ethers.constants.AddressZero)).to.be.revertedWith("Token is not approved")
    });

    it("Can freeze", async function () {
        const depositAmount = ethers.utils.parseEther("1");
        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount);
        await FreezerInstance.connect(signer).freeze(depositAmount, ethers.constants.AddressZero);

        const participant = await FreezerInstance.participantData(await signer.getAddress());

        expect(participant.deposited).to.equal(depositAmount);
        expect(participant.honeyRewardMask).to.equal(0);
        expect(participant.level).to.equal(1);
    });

    it("Can freeze twice", async function () {
        const depositAmount = ethers.utils.parseEther("1");
        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount.mul(2));
        await FreezerInstance.connect(signer).freeze(depositAmount, ethers.constants.AddressZero);

        await network.provider.send("evm_mine")

        await FreezerInstance.connect(signer).freeze(depositAmount, ethers.constants.AddressZero);

        const participant = await FreezerInstance.participantData(await signer.getAddress());

        const totalDepositAmount = await FreezerInstance.totalFreezedAmount();

        expect(participant.deposited).to.be.greaterThan(depositAmount.mul(2));
        expect(participant.honeyRewardMask).to.equal(62243800000);
        expect(participant.level).to.equal(1);
        expect(totalDepositAmount).to.equal(depositAmount.mul(2).add(62243800000))
    })

    it("Can freeze from two accounts", async function () {
        const depositAmount = ethers.utils.parseEther("1");
        const depositAmount2 = ethers.utils.parseEther("2");
        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount);
        await FreezerInstance.connect(signer).freeze(depositAmount, ethers.constants.AddressZero);

        const [otherSigner] = await ethers.getSigners();

        await GhnyToken.connect(signer).transfer(otherSigner.address, depositAmount2);
        await GhnyToken.approve(FreezerInstance.address, depositAmount2);
        await FreezerInstance.freeze(depositAmount2, ethers.constants.AddressZero);

        const participant = await FreezerInstance.participantData(await signer.getAddress());
        const participant2 = await FreezerInstance.participantData(await otherSigner.getAddress());

        expect(participant.deposited).to.equal(depositAmount);
        expect(participant.honeyRewardMask).to.equal(0);
        expect(participant.level).to.equal(1);

        expect(participant2.deposited).to.equal(depositAmount2);
        expect(participant2.honeyRewardMask).to.equal(93365530000);
        expect(participant2.level).to.equal(1);

        const balance = await FreezerInstance.balanceOf(await signer.getAddress());
        const balance2 = await FreezerInstance.balanceOf(await otherSigner.getAddress());

        expect(balance).to.equal(depositAmount.add(93365530000));
        expect(balance2).to.equal(depositAmount2);

        const totalFreezedAmount = await FreezerInstance.totalFreezedAmount();

        expect(totalFreezedAmount).to.equal(depositAmount.add(depositAmount2));
    })

    it("Can not unfreeze when not invested", async function () {
        await expect(FreezerInstance.unfreeze()).to.be.revertedWith("No deposit found")
    });

    it("Can not unfreeze when freeze time has not passed", async function () {
        const depositAmount = ethers.utils.parseEther("1");
        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount);
        await FreezerInstance.connect(signer).freeze(depositAmount, ethers.constants.AddressZero);

        await expect(FreezerInstance.connect(signer).unfreeze()).to.be.revertedWith("Freezing period not over")
    });

    it("Can unfreeze", async function () {
        const depositAmount = ethers.utils.parseEther("1");
        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount);
        await FreezerInstance.connect(signer).freeze(depositAmount, ethers.constants.AddressZero);

        await network.provider.send("evm_increaseTime", [15768000])
        await network.provider.send("evm_mine")

        const ghnyBalanceBefore = await GhnyToken.balanceOf(await signer.getAddress());

        await FreezerInstance.connect(signer).unfreeze();

        const ghnyBalanceAfter = await GhnyToken.balanceOf(await signer.getAddress());

        expect(ghnyBalanceAfter.sub(ghnyBalanceBefore)).to.equal(depositAmount.add(62243120000))

        const participant = await FreezerInstance.participantData(await signer.getAddress());
        const totalFreezedAmount = await FreezerInstance.totalFreezedAmount();

        expect(totalFreezedAmount).to.equal(0);
        expect(participant.deposited).to.equal(0);
        expect(participant.honeyRewardMask).to.equal(0);
        expect(participant.level).to.equal(0);
    });
});
