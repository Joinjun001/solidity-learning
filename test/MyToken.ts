// test/MyToken.ts

import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("My Token", function () {
  const decimals = 18;
  const mintingAmount = 10n;

  it("signer1 should transfer signer0 MT to itself", async function () {
    const [signer0, signer1] = await ethers.getSigners();

    const myTokenC = await ethers.deployContract("MyToken", [
      "My Token",
      "MT",
      decimals,
      mintingAmount,
    ]);

    const amount = ethers.parseUnits("1", decimals);

    // 0. 초기 balance 확인
    console.log("[before] signer0:", ethers.formatUnits(await myTokenC.balanceOf(signer0.address), decimals), "MT");
    console.log("[before] signer1:", ethers.formatUnits(await myTokenC.balanceOf(signer1.address), decimals), "MT");
    expect(await myTokenC.balanceOf(signer0.address)).to.equal(ethers.parseUnits(mintingAmount.toString(), decimals));
    expect(await myTokenC.balanceOf(signer1.address)).to.equal(0n);

    // 1. approve: signer1에게 signer0의 자산 이동권한 부여
    await myTokenC.connect(signer0).approve(signer1.address, amount);
    expect(await myTokenC.allowance(signer0.address, signer1.address)).to.equal(amount);

    // 2. transferFrom: signer1이 signer0의 MT를 자신에게 전송
    await myTokenC.connect(signer1).transferFrom(signer0.address,signer1.address,amount);

    // 3. balance 확인
    console.log("[after]  signer0:", ethers.formatUnits(await myTokenC.balanceOf(signer0.address), decimals), "MT");
    console.log("[after]  signer1:", ethers.formatUnits(await myTokenC.balanceOf(signer1.address), decimals), "MT");

    expect(await myTokenC.balanceOf(signer1.address)).to.equal(amount);

    expect(await myTokenC.balanceOf(signer0.address)).to.equal(
      ethers.parseUnits((mintingAmount - 1n).toString(),decimals)
    );
  });
});
