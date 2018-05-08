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

const getEnlistmentAddressByIndex = async (idx) => {
    return EnlistmentRegistryContract.deployed()
        .then(contract => {
            return contract.getEnlistmentAddressByIndex(idx);
        });
};

const bitsetToAddresses = async (bitset) => {
    const bitsetArray = bitset.split('');
    const idxRange = bitsetArray.length - 1;
    let result = [];
    for (let i = idxRange; i >= 0; i--) {
        const bit = bitsetArray[i];
        if (bit === '1') {
            const idxMappedAddress = await getEnlistmentAddressByIndex(idxRange - i);
            result.push(idxMappedAddress);
        }
    }
    return result;
    /* return Promise.all(bitsetArray.reduceRight(async (acc, el, idx) => {
        if (el === '1') {
            const idxMappedAddress = await getEnlistmentAddressByIndex(idxRange - idx);
            console.log('acc', acc);
            return acc.concat(idxMappedAddress);
        } else {
            return acc;
        }
    }, []));*/
};

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
                const bitset = (await contract.geosearch.call(lat, lng, distance)).toString(2);
                log.info('bitset', bitset);
                return bitsetToAddresses(bitset);
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
