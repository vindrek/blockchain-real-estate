'use strict';

const ngeohash = require('ngeohash');
const PropertyEnlistmentContractService = require('./PropertyEnlistmentContractService');
const PropertyEnlistmentRegistryService = require('./PropertyEnlistmentRegistryService');
const Status = require('../models/enums/PropertyEnlistmentStatus');
const log = require('../../server/logger');

async function mapAllContractEnlistments(registryEnlistments) {
  return Promise.all(registryEnlistments.map(async (enlistmentContractAddress) => {
    const contractEnlistment =
      await PropertyEnlistmentContractService.getEnlistment(enlistmentContractAddress);
    return contractEnlistment;
  }));
}

module.exports = {
  createEnlistment(enlistment) {
    enlistment.geolocation = {
      type: 'Point',
      coordinates: [enlistment.latitude, enlistment.longitude]
    };
    enlistment.offerAuthors = [];

    return Models.PropertyEnlistment.create(enlistment);
  },

  async getOffChainEnlistment(id) {
    return Models.PropertyEnlistment.findById(id);
  },

  async getOnChainEnlistment(enlistmentAddress) {
    return PropertyEnlistmentContractService.getEnlistment(enlistmentAddress);
  },

  async findInArea(latitude, longitude, distance = 5000) {
    const filteredEnlistments = await PropertyEnlistmentRegistryService.findInArea(latitude, longitude, distance);
    log.verbose('Returning mapped geosearch filtered enlistments:', filteredEnlistments);
    return filteredEnlistments;
  },

  findAllUnpublished() {
    return Models.PropertyEnlistment.findAll(
      {
        where: { status: [Status.REJECTED, Status.PENDING, Status.CANCELLED] }
      }
    );
  },

  async findAllReviewed() {
    return PropertyEnlistmentRegistryService.getAll();
  },

  async findByLandlord(landlordEmail) {
    const filteredEnlistments = await PropertyEnlistmentRegistryService.findLandlordEnlistments(landlordEmail);
    return filteredEnlistments;
  },

  async findWithOffersByBidder(bidderEmail) {
    const filteredEnlistments = await PropertyEnlistmentRegistryService.findTenantBiddedEnlistments(bidderEmail);
    return filteredEnlistments;
  },

  async approveEnlistment(enlistmentId) {
    const enlistment = await Models.PropertyEnlistment.findOne({ where: { id: enlistmentId } });

    enlistment.approve();
    await enlistment.save();

    const coords = enlistment.geolocation.coordinates;
    const enlistmentGeohash = ngeohash.encode(coords[0], coords[1]);

    const plainEnlistment = enlistment.get({plain: true});
    const detailsProps = ['propertyType', 'rentalType', 'availableFrom', 'availableUntil', 'nrOfBedrooms',
    'nrOfBathrooms', 'minPrice', 'floorSize', 'description', 'furniture', 'photos'];

    const detailsJson = JSON.stringify(
      Object.keys(plainEnlistment).reduce((obj, key) => {
      if (detailsProps.indexOf(key) !== -1) {
        obj[key] = plainEnlistment[key];
      }
      return obj;
    }, {}));

    enlistment.contractAddress = await PropertyEnlistmentContractService.createEnlistment(
      enlistment.landlordEmail,
      enlistment.landlordName,
      enlistment.streetName,
      enlistment.floor,
      enlistment.apartment,
      enlistment.house,
      enlistment.zipCode,
      enlistmentGeohash,
      detailsJson
    );

    await PropertyEnlistmentRegistryService.addEnlistment(enlistment);

    return enlistment.contractAddress;
  },

  async rejectEnlistment(enlistmentId) {
    const enlistment = await Models.PropertyEnlistment.findOne({ where: { id: enlistmentId } });

    enlistment.reject();

    return enlistment.save();
  },

  async sendOffer(enlistmentAddress, { amount, tenantName, tenantEmail }) {
    await PropertyEnlistmentContractService.sendOffer(enlistmentAddress, { amount, tenantName, tenantEmail });
  },

  async getOffers(enlistmentAddress) {
    const offerCount = await PropertyEnlistmentContractService.getOfferAuthorsLength(enlistmentAddress);
    let offers = [];
    for (let i = 0; i < offerCount; i++) {
      const offer = await PropertyEnlistmentContractService.getOfferByIndex(enlistmentAddress, i);
      offers.push(offer);
    }
    return offers;
  },

  async getOffer(enlistmentAddress, tenantEmail) {
    const contractOffer = await PropertyEnlistmentContractService.getOffer(enlistmentAddress, tenantEmail);
    if (!contractOffer.initialized) {
      throw new Error(404);
    }
    return contractOffer;
  },

  async cancelOffer(enlistmentAddress, tenantEmail) {
    return PropertyEnlistmentContractService.cancelOffer(enlistmentAddress, tenantEmail);
  },

  async reviewOffer(enlistmentAddress, tenantEmail, approved = true) {
    return PropertyEnlistmentContractService.reviewOffer(enlistmentAddress, tenantEmail, approved);
  },

  async submitAgreementDraft(enlistmentAddress, agreementDraft) {
    return PropertyEnlistmentContractService.submitAgreementDraft(enlistmentAddress, agreementDraft);
  },

  async getAgreement(enlistmentAddress, tenantEmail) {
    return PropertyEnlistmentContractService.getAgreement(enlistmentAddress, tenantEmail);
  },

  async reviewAgreement(enlistmentAddress, tenantEmail, confirmed = true) {
    return PropertyEnlistmentContractService.reviewAgreement(enlistmentAddress, tenantEmail, confirmed);
  },

  async signAgreement(enlistmentAddress, tenantEmail, party, signatureHash) {
    if (party === 'landlord') {
      return PropertyEnlistmentContractService.landlordSignAgreement(enlistmentAddress, tenantEmail, signatureHash);
    } else {
      return PropertyEnlistmentContractService.tenantSignAgreement(enlistmentAddress, tenantEmail, signatureHash);
    }
  },

  async cancelAgreement(enlistmentAddress, tenantEmail) {
    return PropertyEnlistmentContractService.cancelAgreement(enlistmentAddress, tenantEmail);
  },

  async receiveFirstMonthRent(enlistmentAddress, tenantEmail) {
    return PropertyEnlistmentContractService.receiveFirstMonthRent(enlistmentAddress, tenantEmail);
  }
};
