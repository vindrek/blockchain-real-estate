'use strict';

const Web3 = require('web3');
const contract = require('truffle-contract');
const log = require('../../server/logger');

const config = require('../../config/ethereum');
const artifact = require('../../ethereum/build/contracts/EnlistmentRegistry.json');

const provider = new Web3.providers.HttpProvider(config.provider);

const EnlistmentRegistryContract = contract(artifact);
EnlistmentRegistryContract.setProvider(provider);
EnlistmentRegistryContract.defaults({
  from: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
  gas: 8000000,
  gasPrice: 1000000000
});

module.exports = {
    addEnlistment(enlistmentAddress) {
        return EnlistmentRegistryContract.deployed()
          .then(contract => contract.addEnlistment(enlistmentAddress));
      }
};
