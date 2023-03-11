import { ethers, network, upgrades } from "hardhat";
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
        const ProxyInstance = await upgrades.deployProxy(Freezer, []);
        FreezerInstance = Freezer.attach(ProxyInstance.address);

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
        await expect(FreezerInstance.freeze(await signer.getAddress(), 0, ethers.constants.AddressZero)).to.be.revertedWith("No amount provided")
    });
    it("Can not freeze when not approved", async function () {
        await expect(FreezerInstance.freeze(await signer.getAddress(), 1, ethers.constants.AddressZero)).to.be.revertedWith("Token is not approved")
    });

    it("Can freeze", async function () {
        const depositAmount = ethers.utils.parseEther("1");
        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount);
        await FreezerInstance.connect(signer).freeze(await signer.getAddress(), depositAmount, ethers.constants.AddressZero);

        const participant = await FreezerInstance.participantData(await signer.getAddress());

        expect(participant.deposited).to.equal(depositAmount);
        expect(participant.honeyRewardMask).to.equal(0);
        expect(participant.level).to.equal(0);
    });

    it("Can freeze twice", async function () {
        const depositAmount = ethers.utils.parseEther("1");
        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount.mul(2));
        await FreezerInstance.connect(signer).freeze(await signer.getAddress(), depositAmount, ethers.constants.AddressZero);

        await network.provider.send("evm_mine")

        const participantBefore = await FreezerInstance.participantData(await signer.getAddress());

        await FreezerInstance.connect(signer).freeze(await signer.getAddress(), depositAmount, ethers.constants.AddressZero);

        const participant = await FreezerInstance.participantData(await signer.getAddress());

        const totalDepositAmount = await FreezerInstance.totalFreezedAmount();

        expect(participant.deposited).to.be.greaterThan(depositAmount.mul(2));
        expect(participant.honeyRewardMask).to.equal(62243800000);
        expect(participant.level).to.equal(0);
        expect(totalDepositAmount).to.equal(depositAmount.mul(2).add(62243800000))
        expect(participantBefore.startTime).to.equal(participant.startTime)
    })

    it("Can freeze from two accounts", async function () {
        const depositAmount = ethers.utils.parseEther("1");
        const depositAmount2 = ethers.utils.parseEther("2");
        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount);
        await FreezerInstance.connect(signer).freeze(await signer.getAddress(), depositAmount, ethers.constants.AddressZero);

        const [otherSigner] = await ethers.getSigners();

        await GhnyToken.connect(signer).transfer(otherSigner.address, depositAmount2);
        await GhnyToken.approve(FreezerInstance.address, depositAmount2);
        await FreezerInstance.freeze(await otherSigner.getAddress(), depositAmount2, ethers.constants.AddressZero);

        const participant = await FreezerInstance.participantData(await signer.getAddress());
        const participant2 = await FreezerInstance.participantData(await otherSigner.getAddress());

        expect(participant.deposited).to.equal(depositAmount);
        expect(participant.honeyRewardMask).to.equal(0);
        expect(participant.level).to.equal(0);

        expect(participant2.deposited).to.equal(depositAmount2);
        expect(participant2.honeyRewardMask).to.equal(93365530000);
        expect(participant2.level).to.equal(0);

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
        await FreezerInstance.connect(signer).freeze(await signer.getAddress(), depositAmount, ethers.constants.AddressZero);

        await expect(FreezerInstance.connect(signer).unfreeze()).to.be.revertedWith("Freezing period not over")
    });

    it("Can unfreeze", async function () {
        const depositAmount = ethers.utils.parseEther("1");
        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount);
        await FreezerInstance.connect(signer).freeze(await signer.getAddress(), depositAmount, ethers.constants.AddressZero);

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

    it("Can increase level", async function () {
        const depositAmount = ethers.utils.parseEther("9.999999999999999");
        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount);
        await FreezerInstance.connect(signer).freeze(await signer.getAddress(), depositAmount, ethers.constants.AddressZero);

        const participant = await FreezerInstance.participantData(await signer.getAddress());

        expect(participant.level).to.equal(0);

        await network.provider.send("evm_increaseTime", [3600])
        await network.provider.send("evm_mine")

        await FreezerInstance.compound();

        const participant2 = await FreezerInstance.participantData(await signer.getAddress());

        expect(participant2.level).to.equal(0);

        const canUpgrade = await FreezerInstance.canIncreaseLevel(await signer.getAddress());

        expect(canUpgrade).to.be.true;

        await FreezerInstance.connect(signer).triggerLevelUp();

        const participant3 = await FreezerInstance.participantData(await signer.getAddress());

        expect(participant3.level).to.equal(1);
        expect(participant3.startTime).to.be.greaterThan(participant.startTime)

        const canUpgrade2 = await FreezerInstance.canIncreaseLevel(await signer.getAddress());

        expect(canUpgrade2).to.be.false;

    });
    it("Can increase level without increase", async function () {
        const depositAmount = ethers.utils.parseEther("1");
        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount);
        await FreezerInstance.connect(signer).freeze(await signer.getAddress(), depositAmount, ethers.constants.AddressZero);

        const participant = await FreezerInstance.participantData(await signer.getAddress());

        await network.provider.send("evm_increaseTime", [3600])
        await network.provider.send("evm_mine")

        await FreezerInstance.connect(signer).triggerLevelUp();

        const participantAfter = await FreezerInstance.participantData(await signer.getAddress());

        expect(participantAfter.deposited).to.be.greaterThan(participant.deposited);
        expect(participantAfter.startTime).to.equal(participant.startTime);
        expect(participantAfter.level).to.equal(participant.level);

    });

    it("Can increase level without deposit", async function () {

        await FreezerInstance.connect(signer).triggerLevelUp();

        const participantAfter = await FreezerInstance.participantData(await signer.getAddress());

        expect(participantAfter.deposited).to.equal(0);
        expect(participantAfter.startTime).to.equal(0);
        expect(participantAfter.level).to.equal(0);
        expect(participantAfter.honeyRewardMask).to.equal(0);

    });

    it("Can increase level with deposit", async function () {

        const depositAmount = ethers.utils.parseEther("1");
        const depositAmount2 = ethers.utils.parseEther("10");
        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount.add(depositAmount2));
        await FreezerInstance.connect(signer).freeze(await signer.getAddress(), depositAmount, ethers.constants.AddressZero);

        const participant = await FreezerInstance.participantData(await signer.getAddress());

        expect(participant.level).to.equal(0);

        await network.provider.send("evm_increaseTime", [3600])
        await network.provider.send("evm_mine")

        await FreezerInstance.connect(signer).freeze(await signer.getAddress(), depositAmount2, ethers.constants.AddressZero);

        const participant2 = await FreezerInstance.participantData(await signer.getAddress());

        expect(participant2.level).to.equal(1);
        expect(participant2.startTime).to.be.greaterThan(participant.startTime);

    });

    it("Can not do same referral", async function () {
        await expect(FreezerInstance.connect(signer).freeze(await signer.getAddress(), 1, await signer.getAddress())).to.be.revertedWith("Referral and for must be different")
    });

    it("Can do referral", async function () {
        const depositAmount = ethers.utils.parseEther("1");
        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount);

        const [otherSigner] = await ethers.getSigners();

        await FreezerInstance.connect(signer).freeze(await signer.getAddress(), depositAmount, await otherSigner.getAddress());

        const referralReward = await FreezerInstance.referralRewards(await otherSigner.getAddress());

        expect(referralReward).to.equal(ethers.utils.parseEther("0.01"));

        await FreezerInstance.claimReferralRewards();

        expect(await GhnyToken.balanceOf(await otherSigner.getAddress())).to.equal(ethers.utils.parseEther("0.01"));

        const referralData = await FreezerInstance.referralDataArray(otherSigner.address);
        expect(referralData[0].depositor).to.equal(await signer.getAddress());
        expect(referralData[0].reward).to.equal(ethers.utils.parseEther("0.01"));
        expect(referralData[0].depositAmount).to.equal(ethers.utils.parseEther("1"));

    });

    it("Can do referral with level up 1", async function () {
        const depositAmount = ethers.utils.parseEther("11");
        const depositAmount1 = ethers.utils.parseEther("1");

        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount);

        const [otherSigner] = await ethers.getSigners();

        await FreezerInstance.connect(signer).freeze(await signer.getAddress(), depositAmount, ethers.constants.AddressZero);

        await GhnyToken.connect(signer).transfer(await otherSigner.getAddress(), depositAmount1);

        await GhnyToken.approve(FreezerInstance.address, depositAmount1);
        await FreezerInstance.freeze(await otherSigner.getAddress(), depositAmount1, await signer.getAddress());

        const referralReward = await FreezerInstance.referralRewards(await signer.getAddress());

        expect(referralReward).to.equal(ethers.utils.parseEther("0.02"));

        const balanceBefore = await GhnyToken.balanceOf(await signer.getAddress());

        await FreezerInstance.connect(signer).claimReferralRewards();

        const balanceAfter = await GhnyToken.balanceOf(await signer.getAddress());

        expect(balanceAfter.sub(balanceBefore)).to.equal(ethers.utils.parseEther("0.02"));

        const referralData = await FreezerInstance.referralDataArray(await signer.getAddress());
        expect(referralData[0].depositor).to.equal(await otherSigner.getAddress());
        expect(referralData[0].reward).to.equal(ethers.utils.parseEther("0.02"));
        expect(referralData[0].depositAmount).to.equal(ethers.utils.parseEther("1"));

    });

    it("Can do referral with level up 2", async function () {
        const depositAmount = ethers.utils.parseEther("101");
        const depositAmount1 = ethers.utils.parseEther("1");

        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount);

        const [otherSigner] = await ethers.getSigners();

        await FreezerInstance.connect(signer).freeze(await signer.getAddress(), depositAmount, ethers.constants.AddressZero);

        await GhnyToken.connect(signer).transfer(await otherSigner.getAddress(), depositAmount1);

        await GhnyToken.approve(FreezerInstance.address, depositAmount1);
        await FreezerInstance.freeze(await otherSigner.getAddress(), depositAmount1, await signer.getAddress());

        const referralReward = await FreezerInstance.referralRewards(await signer.getAddress());

        expect(referralReward).to.equal(ethers.utils.parseEther("0.05"));

        const balanceBefore = await GhnyToken.balanceOf(await signer.getAddress());

        await FreezerInstance.connect(signer).claimReferralRewards();

        const balanceAfter = await GhnyToken.balanceOf(await signer.getAddress());

        expect(balanceAfter.sub(balanceBefore)).to.equal(ethers.utils.parseEther("0.05"));

        const referralData = await FreezerInstance.referralDataArray(await signer.getAddress());
        expect(referralData[0].depositor).to.equal(await otherSigner.getAddress());
        expect(referralData[0].reward).to.equal(ethers.utils.parseEther("0.05"));
        expect(referralData[0].depositAmount).to.equal(ethers.utils.parseEther("1"));

    });

    it("Can do referral with level up 3", async function () {
        const depositAmount = ethers.utils.parseEther("1001");
        const depositAmount1 = ethers.utils.parseEther("1");

        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount);

        const [otherSigner] = await ethers.getSigners();

        await FreezerInstance.connect(signer).freeze(await signer.getAddress(), depositAmount, ethers.constants.AddressZero);

        await GhnyToken.connect(signer).transfer(await otherSigner.getAddress(), depositAmount1);

        await GhnyToken.approve(FreezerInstance.address, depositAmount1);
        await FreezerInstance.freeze(await otherSigner.getAddress(), depositAmount1, await signer.getAddress());

        const referralReward = await FreezerInstance.referralRewards(await signer.getAddress());

        expect(referralReward).to.equal(ethers.utils.parseEther("0.07"));

        const balanceBefore = await GhnyToken.balanceOf(await signer.getAddress());

        await FreezerInstance.connect(signer).claimReferralRewards();

        const balanceAfter = await GhnyToken.balanceOf(await signer.getAddress());

        expect(balanceAfter.sub(balanceBefore)).to.equal(ethers.utils.parseEther("0.07"));

        const referralData = await FreezerInstance.referralDataArray(await signer.getAddress());
        expect(referralData[0].depositor).to.equal(await otherSigner.getAddress());
        expect(referralData[0].reward).to.equal(ethers.utils.parseEther("0.07"));
        expect(referralData[0].depositAmount).to.equal(ethers.utils.parseEther("1"));

    });

    it("Can do referral with level up 4", async function () {
        const depositAmount = ethers.utils.parseEther("10001");
        const depositAmount1 = ethers.utils.parseEther("1");

        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount);

        const [otherSigner] = await ethers.getSigners();

        await FreezerInstance.connect(signer).freeze(await signer.getAddress(), depositAmount, ethers.constants.AddressZero);

        await GhnyToken.connect(signer).transfer(await otherSigner.getAddress(), depositAmount1);

        await GhnyToken.approve(FreezerInstance.address, depositAmount1);
        await FreezerInstance.freeze(await otherSigner.getAddress(), depositAmount1, await signer.getAddress());

        const referralReward = await FreezerInstance.referralRewards(await signer.getAddress());

        expect(referralReward).to.equal(ethers.utils.parseEther("0.1"));

        const balanceBefore = await GhnyToken.balanceOf(await signer.getAddress());

        await FreezerInstance.connect(signer).claimReferralRewards();

        const balanceAfter = await GhnyToken.balanceOf(await signer.getAddress());

        expect(balanceAfter.sub(balanceBefore)).to.equal(ethers.utils.parseEther("0.1"));

        const referralData = await FreezerInstance.referralDataArray(await signer.getAddress());
        expect(referralData[0].depositor).to.equal(await otherSigner.getAddress());
        expect(referralData[0].reward).to.equal(ethers.utils.parseEther("0.1"));
        expect(referralData[0].depositAmount).to.equal(ethers.utils.parseEther("1"));

    });

    it("Can claim 0 referral rewards", async function () {
        const [otherSigner] = await ethers.getSigners();
        const balanceBefore = await GhnyToken.balanceOf(otherSigner.address);
        await FreezerInstance.claimReferralRewards();
        const balance = await GhnyToken.balanceOf(otherSigner.address);
        expect(balance.sub(balanceBefore)).to.equal(0);

    });

    it("Can not call in emergency mode", async function () {
        await FreezerInstance.toggleContractActive();

        await expect(FreezerInstance.freeze(await signer.getAddress(), 10, ethers.constants.AddressZero)).to.be.revertedWith("Paused");
        await expect(FreezerInstance.unfreeze()).to.be.revertedWith("Paused");
        await expect(FreezerInstance.triggerLevelUp()).to.be.revertedWith("Paused");
        await expect(FreezerInstance.claimReferralRewards()).to.be.revertedWith("Paused");
        await expect(FreezerInstance.compound()).to.be.revertedWith("Paused");
    });

    it("Can not call owner functions", async function () {
        await expect(FreezerInstance.connect(signer).toggleContractActive()).to.be.revertedWith("Ownable: caller is not the owner");
        await expect(FreezerInstance.connect(signer).withdrawEth()).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Can recover BNB", async function () {

        const [otherSigner] = await ethers.getSigners();

        const Intermediate = await ethers.getContractFactory("Intermediate");
        const IntermediateInstance = await Intermediate.deploy(FreezerInstance.address);

        await IntermediateInstance.sendEth({ value: ethers.utils.parseEther("1") });

        expect(await ethers.provider.getBalance(FreezerInstance.address)).to.equal(ethers.utils.parseEther("1"));

        await FreezerInstance.withdrawEth();

        expect(await ethers.provider.getBalance(FreezerInstance.address)).to.equal(ethers.utils.parseEther("0"));
    });

    it("Can get referral percentage", async function () {

        const [otherSigner] = await ethers.getSigners();
        const percentage = await FreezerInstance.getReferralPercentage(otherSigner.address);

        expect(percentage).to.equal(1);

        const depositAmount = ethers.utils.parseEther("11");

        await GhnyToken.connect(signer).approve(FreezerInstance.address, depositAmount);

        await FreezerInstance.connect(signer).freeze(await signer.getAddress(), depositAmount, ethers.constants.AddressZero);

        const percentage2 = await FreezerInstance.getReferralPercentage(await signer.getAddress());

        expect(percentage2).to.equal(2);
    });
});