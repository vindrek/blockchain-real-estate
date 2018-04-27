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
            .then(contract => {
                log.debug('Appending enlistment to deployed contract of', contract);
                return contract.addEnlistment(enlistmentAddress);
            });
    },
    getEnlistments() {
        return EnlistmentRegistryContract.deployed()
            .then(contract => contract.getEnlistments.call());
    },
    /*
    @returns in form [[enlistment1Adr, enlistment2Adr, ...], [enlistment1Geohash, Enlistment2Geohash, ...]]
    */
    getEnlistmentsForGeosearch() {
        return EnlistmentRegistryContract.deployed()
            .then(contract => contract.getEnlistmentsForGeosearch.call());
    },
    /*
    @returns in form [[enlistment1Adr, enlistment2Adr, ...], [enlistment1OfferCount, enlistment2OfferCount, ...]]
    */
    getEnlistmentsForBidderFiltering() {
        return EnlistmentRegistryContract.deployed()
            .then(contract => contract.getEnlistmentsForBidderFiltering.call());
    }
};
