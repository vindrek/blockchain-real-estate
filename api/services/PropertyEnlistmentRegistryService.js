'use strict';
const PropertyEnlistmentRegistryContractService = require('./PropertyEnlistmentRegistryContractService');
const PropertyEnlistmentContractService = require('./PropertyEnlistmentContractService');
const log = require('../../server/logger');

const mapAllRegistryEnlistments = async (inAreaRegistryEnlistments) => {
    return Promise.all(inAreaRegistryEnlistments.map(async (registryEnlistment) => {
        const contractEnlistment =
            await PropertyEnlistmentContractService
                .getEnlistment(registryEnlistment.address || registryEnlistment); // address may be mapped or unmapped
        return contractEnlistment;
    }));
};

module.exports = {
    async addEnlistment(enlistment) {
        log.verbose('Adding enlistment with contract address ' + enlistment.contractAddress + ' to the registry.');
        return PropertyEnlistmentRegistryContractService.addEnlistment(enlistment.contractAddress);
    },
    async getAll() {
        const registryEnlistments = await PropertyEnlistmentRegistryContractService.getEnlistments();
        return mapAllRegistryEnlistments(registryEnlistments);
    },
    // inputs need to be transformed to integers.
    // For optimal geographical precision, 6 decimal points of a coordinate are taken into account.
    // I.e. multiply params with 1e6
    async findInArea(latitude, longitude, distance = 5000) {
        const registryEnlistmentsByApproximity =
            await PropertyEnlistmentRegistryContractService.geosearch(latitude * 1e6, longitude * 1e6, distance * 1e6);
        log.verbose('The following enlistments match the geosearch:', registryEnlistmentsByApproximity);
        return mapAllRegistryEnlistments(registryEnlistmentsByApproximity);
    },
    async findLandlordEnlistments(landlordEmail) {
        const registryEnlistmentsByLandlord = await PropertyEnlistmentRegistryContractService.getEnlistmentsByLandlord(landlordEmail);
        log.verbose('Landlord with an email', landlordEmail, 'has', registryEnlistmentsByLandlord.length, 'enlistments.');
        return mapAllRegistryEnlistments(registryEnlistmentsByLandlord);
    },
    async findTenantBiddedEnlistments(bidderEmail) {
        const registryEnlistmentsByBidder = await PropertyEnlistmentRegistryContractService.getEnlistmentsByBidder(bidderEmail);
        log.verbose('Tenant with an email', bidderEmail, 'has bidded on', registryEnlistmentsByBidder.length, ' enlistments.');
        return mapAllRegistryEnlistments(registryEnlistmentsByBidder);
    }
};
