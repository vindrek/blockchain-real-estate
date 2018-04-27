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

    return Promise.all(contractEnlistmentsAndOfferCounts[0].map(async (address, idx) => {
        let offers = [];
        for (let i = 0; i < contractEnlistmentsAndOfferCounts[1][idx]; i++) {
            const offer = await PropertyEnlistmentContractService.getOfferByIndex(address, i);
            offers.push(offer);
        }
        return { address, offers };
    }));
};

const filterByEnlistmentOfferAuthor = (registryEnlistments, bidderEmail) => {
    const filteringResult = registryEnlistments.filter((enlistmentWithOffers) => {
        for (let i = 0; i< enlistmentWithOffers.offers.length; i++) {
            if (enlistmentWithOffers.offers[i].tenantEmail === bidderEmail) {
                return true;
            }
        }
        return false;
    });
    return filteringResult;
};

const filterByEnlistmentLandlord = (mappedEnlistments, landlordEmail) => {
    const filteringResult = mappedEnlistments.filter((enlistment) => enlistment.landlordEmail === landlordEmail);
    return filteringResult;
};

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
    async findInArea(latitude, longitude, distance = 5000) {
        const registryEnlistments = await getEnlistmentsForGeosearch();
        log.verbose('Retrieved registry enlistments for filtering: ', registryEnlistments);
        const inAreaRegistryEnlistments = GeohashService.filterInArea3(registryEnlistments, latitude, longitude, distance);
        log.verbose('The following enlistments match the geosearch:', inAreaRegistryEnlistments);
        return mapAllRegistryEnlistments(inAreaRegistryEnlistments);
    },
    async findLandlordEnlistments(landlordEmail) {
        const mappedEnlistments = await this.getAll();
        const landlordEnlistments = filterByEnlistmentLandlord(mappedEnlistments, landlordEmail);
        log.verbose('Landlord with an email', landlordEmail, 'has', landlordEnlistments.length, 'enlistments.');
        return landlordEnlistments;
    },
    async findTenantBiddedEnlistments(bidderEmail) {
        const registryEnlistmentsWithOffers = await getEnlistmentsForBidderFiltering();
        const bidderRegistryEnlistments = filterByEnlistmentOfferAuthor(registryEnlistmentsWithOffers, bidderEmail);
        log.verbose('Tenant with an email', bidderEmail, 'has bidded on', bidderRegistryEnlistments.length, ' enlistments.');
        return mapAllRegistryEnlistments(bidderRegistryEnlistments);
    }
};
