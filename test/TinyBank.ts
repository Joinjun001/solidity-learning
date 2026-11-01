import { expect } from "chai";
import { network } from "hardhat";
import { DECIMALS, MINTING_AMOUNT } from "./constant";

const { ethers } = await network.create();

describe("TinyBank", () => {
  let signers: any[];
  let myTokenC: any;
  let tinyBankC: any;
  let managers: any[];

  beforeEach(async () => {
    signers = await ethers.getSigners();
    myTokenC = await ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      DECIMALS,
      MINTING_AMOUNT,
    ]);
    managers = [signers[0], signers[1], signers[2]];
    tinyBankC = await ethers.deployContract("TinyBank", [
      await myTokenC.getAddress(),
      managers.map((m) => m.address),
    ]);
    await myTokenC.setManager(await tinyBankC.getAddress());
  });

  describe("Initialized state check", () => {
    it("should return totalStaked 0", async () => {
      expect(await tinyBankC.totalStaked()).equal(0);
    });
    it("should return staked 0 amount of signer0", async () => {
      const signer0 = signers[0];
      expect(await tinyBankC.staked(signer0.address)).equal(0);
    });
  });

  describe("Staking", async () => {
    it("should return staked amount", async () => {
      const signer0 = signers[0];
      const stakingAmount = ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);
      expect(await tinyBankC.staked(signer0.address)).equal(stakingAmount);
      expect(await tinyBankC.totalStaked()).equal(stakingAmount);
      expect(await myTokenC.balanceOf(tinyBankC)).equal(
        await tinyBankC.totalStaked()
      );
    });
  });

  describe("Withdraw", () => {
    it("should return 0 staked after withdrawing total token", async () => {
      const signer0 = signers[0];
      const stakingAmount = ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);
      await tinyBankC.withdraw(stakingAmount);
      expect(await tinyBankC.staked(signer0.address)).equal(0);
    });
  });

  describe("reward", () => {
    it("should reward 1MT every blocks", async () => {
      const signer0 = signers[0];
      const stakingAmount = ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);

      const BLOCKS = 5n;
      const transferAmount = ethers.parseUnits("1", DECIMALS);
      for (var i = 0; i < BLOCKS; i++) {
        await myTokenC.transfer(transferAmount, signer0.address);
      }

      await tinyBankC.withdraw(stakingAmount);
      expect(await myTokenC.balanceOf(signer0.address)).equal(
        ethers.parseUnits((BLOCKS + MINTING_AMOUNT + 1n).toString(), DECIMALS)
      );
    });

    it("Should revert when changing rewardPerBlock by hacker", async () => {
      const hacker = signers[3];
      const rewardToChange = ethers.parseUnits("10000", DECIMALS);
      await expect(
        tinyBankC.connect(hacker).setRewardPerBlock(rewardToChange)
      ).to.be.revertedWith("You are not a manager");
    });
  });

  describe("Multi Manager", () => {
    it("should register at least 3 managers", async () => {
      for (const manager of managers) {
        expect(await tinyBankC.isManager(manager.address)).equal(true);
      }
      expect(await tinyBankC.isManager(signers[3].address)).equal(false);
    });

    it("should revert when confirm is called by non-manager", async () => {
      const hacker = signers[3];
      await expect(tinyBankC.connect(hacker).confirm()).to.be.revertedWith(
        "You are not a manager"
      );
    });

    it("should revert when not all managers confirmed", async () => {
      const rewardToChange = ethers.parseUnits("10", DECIMALS);
      await tinyBankC.connect(managers[0]).confirm();
      await tinyBankC.connect(managers[1]).confirm();
      await expect(
        tinyBankC.connect(managers[0]).setRewardPerBlock(rewardToChange)
      ).to.be.revertedWith("Not all confirmed yet");
    });

    it("should change rewardPerBlock after all managers confirmed", async () => {
      const signer0 = signers[0];
      const rewardToChange = ethers.parseUnits("10", DECIMALS);
      for (const manager of managers) {
        await tinyBankC.connect(manager).confirm();
      }
      await tinyBankC.connect(managers[0]).setRewardPerBlock(rewardToChange);

      const stakingAmount = ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);
      await tinyBankC.withdraw(stakingAmount);
      expect(await myTokenC.balanceOf(signer0.address)).equal(
        ethers.parseUnits((MINTING_AMOUNT + 10n).toString(), DECIMALS)
      );
    });

    it("should reset confirmation after rewardPerBlock is changed", async () => {
      const rewardToChange = ethers.parseUnits("10", DECIMALS);
      for (const manager of managers) {
        await tinyBankC.connect(manager).confirm();
      }
      await tinyBankC.connect(managers[0]).setRewardPerBlock(rewardToChange);
      await expect(
        tinyBankC.connect(managers[0]).setRewardPerBlock(rewardToChange)
      ).to.be.revertedWith("Not all confirmed yet");
    });
  });
});
