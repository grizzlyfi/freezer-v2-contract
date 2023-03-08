# Grizzly Freezer V2

This project contains the grizzly freezer V2, which freezes GHNY tokens and stakes them into the honey pot (Staking pool). It supports autocompounding, referrals and a level system. The project uses Hardhat and openzeppelin upgradeable contracts.

## Specification

The following specification should be represented in the contract:

- The user can freeze a defined amount of GHNY tokens for a defined time. The tokens are staked in the honey pot where it generates GHNY-BNB Lp rewards and GHNY block rewards.
- Depending on the frozen amount, the user gets a level between 0-4.
- A user can always freeze more if he wants. If he passes the threshold to another level, the freezing period is reseted.
- After the freezing period, the user can withdraw all GHNY tokens including all autocompounded rewards.
- The user can manually trigger a level up. This can happen, when he reaches a new level by getting GHNY rewards.
- The freezer adds a freezer bonus (currently 70% tbd) on top of the staking GHNY rewards which will be minted, added to the staking rewards and restaked into the honey pot.
- The BNB rewards (originating from GHNY-BNB Lp rewards) are not tracked and stay in the contract, which can be withdrawn by the owner.

## Set up the project

Initialize the hardhat project by doing the following:

1. Run `npm i`
2. Create a .env file using the example.env

Now you should be able to run scripts and tests.

## Run tests

Run `npx hardhat test` to run the predefined tests using hardhat forking.

## Deploy Contract

### BSC Mainnet
Run `npx hardhat run scripts/deploy.ts --network bsc` to deploy the contract to mainnet. After that the freezer needs to be granted `MINTER_ROLE` on the GHNY token.

### Ganache Fork
Run `npx hardhat run scripts/forkDeploy.ts --network fork` to deploy the contract to a ganache fork. It automatically sets the `MINTER_ROLE` on the GHNY token.
