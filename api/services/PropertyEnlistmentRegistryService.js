'use strict';
const PropertyEnlistmentRegistryContractService = require('./PropertyEnlistmentRegistryContractService');
const PropertyEnlistmentContractService = require('./PropertyEnlistmentContractService');
const GeohashService = require('./GeohashService');
const log = require('../../server/logger');
const web3utils = require('web3-utils');

const getEnlistmentsForGeosearch = async () => {
    const contractEnlistmentsAndGeohashes = await PropertyEnlistmentRegistryContractService.getEnlistmentsForGeosearch();

    if (contractEnlistmentsAndGeohashes[0].length === 0) {
        return [];
    }

    return contractEnlistmentsAndGeohashes[0].map((address, idx) =>
        ({ address, geohash: web3utils.toAscii(contractEnlistmentsAndGeohashes[1][idx]) }));
};

const getEnlistmentsForBidderFiltering = async () => {
    const contractEnlistmentsAndOfferCounts = await PropertyEnlistmentRegistryContractService.getEnlistmentsForBidderFiltering();

    if (contractEnlistmentsAndOfferCounts[0].length === 0) {
        return [];
    }

    return contractEnlistmentsAndOfferCounts[0].map((address, idx) =>
        ({ address, offerCount: contractEnlistmentsAndOfferCounts[1][idx]}));
};

// using the length of the offerAuthors array, loop over and retrieve them
const filterByEnlistmentOfferAuthors = async (registryEnlistments, bidderEmail) => {
    return Promise.all(registryEnlistments.filter(async (registryEnlistment) => {
        for (let i = 0; i < registryEnlistment.offerCount; i++) {
            const offer = await PropertyEnlistmentContractService.getOfferByIndex(i);
            if (offer.tenantEmail === bidderEmail) {
                return true;
            }
        }
        return false;
    }));
};

const mapAllRegistryEnlistments = async (inAreaRegistryEnlistments) => {
    return Promise.all(inAreaRegistryEnlistments.map(async (registryEnlistment) => {
        const contractEnlistment =
            await PropertyEnlistmentContractService.getEnlistment(registryEnlistment.address);
        return contractEnlistment;
    }));
};

module.exports = {
    async addEnlistment(enlistment) {
        log.verbose('Adding enlistment with contract address ' + enlistment.contractAddress + ' to the registry.');
        return PropertyEnlistmentRegistryContractService.addEnlistment(enlistment.contractAddress);
    },
    async findInArea(latitude, longitude, distance = 5000) {
        const registryEnlistments = await getEnlistmentsForGeosearch();
        log.verbose('Retrieved registry enlistments for filtering: ', registryEnlistments);
        const inAreaRegistryEnlistments = GeohashService.filterInArea3(registryEnlistments, latitude, longitude, distance);
        log.verbose('The following enlistments match the geosearch:', inAreaRegistryEnlistments);
        return mapAllRegistryEnlistments(inAreaRegistryEnlistments);
    },
    async findTenantBiddedEnlistments(bidderEmail) {
        const registryEnlistments = await getEnlistmentsForBidderFiltering();
        const bidderEnlistments = await filterByEnlistmentOfferAuthors(registryEnlistments, bidderEmail);
        return mapAllRegistryEnlistments(bidderEnlistments);
    }
};
