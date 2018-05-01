'use strict';

const Web3 = require('web3');
const contract = require('truffle-contract');
const log = require('../../server/logger');

const config = require('../../config/ethereum');
const artifact = require('../../ethereum/build/contracts/EnlistmentRegistry.json');

const provider = new Web3.providers.HttpProvider(config.provider);
const web3 = new Web3(config.provider);

const EnlistmentRegistryContract = contract(artifact);
EnlistmentRegistryContract.setProvider(provider);
EnlistmentRegistryContract.defaults({
    from: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
    gas: 8000000,
    gasPrice: 1000000000
});

const filterNonEmptyAddresses = (addresses) => addresses.filter(addr => !(web3.toBigNumber(addr).isZero()));

module.exports = {
    addEnlistment(enlistmentAddress) {
        return EnlistmentRegistryContract.deployed()
            .then(contract => {
                log.debug('Appending enlistment to deployed contract of', contract);
                return contract.addEnlistment(enlistmentAddress);
            });
    },
    getEnlistments() {
        return EnlistmentRegistryContract.deployed()
            .then(contract => contract.getEnlistments.call());
    },
    async geosearch(lat, lng, distance) {
        return EnlistmentRegistryContract.deployed()
            .then(async contract => {
                const addresses = await contract.geosearch.call(lat, lng, distance);
                return filterNonEmptyAddresses(addresses);
            });
    },
    async getEnlistmentsByLandlord(landlordEmail) {
        return EnlistmentRegistryContract.deployed()
            .then(async contract => {
                const addresses = await contract.getEnlistmentsByLandlord.call(landlordEmail);
                return filterNonEmptyAddresses(addresses);
            });
    },
    async getEnlistmentsByBidder(tenantEmail) {
        return EnlistmentRegistryContract.deployed()
            .then(async contract => {
                const addresses = await contract.getEnlistmentsByBidder.call(tenantEmail);
                return filterNonEmptyAddresses(addresses);
            });
    }
};
