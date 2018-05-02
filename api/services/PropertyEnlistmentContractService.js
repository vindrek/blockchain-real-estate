'use strict';

const Web3 = require('web3');
const contract = require('truffle-contract');
const log = require('../../server/logger');
const web3utils = require('web3-utils');
const config = require('../../config/ethereum');
const artifact = require('../../ethereum/build/contracts/Enlistment.json');
const ngeohash = require('ngeohash');

const provider = new Web3.providers.HttpProvider(config.provider);

const PropertyEnlistmentContract = contract(artifact);
PropertyEnlistmentContract.setProvider(provider);
PropertyEnlistmentContract.defaults({
  from: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
  gas: 8000000,
  gasPrice: 1000000000
});

const offerStatusMap = {
  0: 'PENDING',
  1: 'REJECTED',
  2: 'CANCELLED',
  3: 'ACCEPTED'
};

const agreementStatusMap = {
  0: 'UNINITIALIZED', // internal
  1: 'PENDING',
  2: 'REJECTED',
  3: 'CONFIRMED',
  4: 'CANCELLED',
  5: 'LANDLORD_SIGNED',
  6: 'TENANT_SIGNED',
  7: 'STARTED'
};

module.exports = {
  createEnlistment(landlordEmail, landlordName, streetName, floor, apartment, house, zipCode, lat, lng, detailsJson) {
    return PropertyEnlistmentContract.new(landlordEmail, landlordName, streetName, floor, apartment, house, zipCode, lat, lng, detailsJson)
      .then(contract => {
        log.info(`PropertyEnlistment smart contract created on address: ${contract.address}`);

        return contract.address;
      });
  },

  getEnlistment(contractAddress) {
    return PropertyEnlistmentContract.at(contractAddress)
      .then(contract => contract.getEnlistment.call())
      .then(([landlordEmail, landlordName, streetName, [floor, apartment, house, zipCode], [lat, lng], detailsJson, locked]) => {
        return Object.assign({}, { contractAddress, landlordEmail, landlordName,
          streetName, floor, apartment, house, zipCode, lat: lat / 1e6, lng: lng / 1e6, locked }, JSON.parse(detailsJson));
      });
  },

  sendOffer(contractAddress, { amount, tenantName, tenantEmail }) {
    // https://github.com/trufflesuite/truffle-contract#usage
    return PropertyEnlistmentContract.at(contractAddress).then(contract => contract.sendOffer(amount, tenantName, tenantEmail));
  },

  getOffer(contractAddress, tenantEmail) {
    return PropertyEnlistmentContract.at(contractAddress).then(contract => contract.getOffer.call(tenantEmail))
      // TODO: convert BigNumber
      .then(([initialized, amount, tenantName, tenantEmail, status]) =>
        ({ initialized, amount, tenantName, tenantEmail, status: offerStatusMap[status] }));
  },

  getOfferAuthorsLength(contractAddress) {
    return PropertyEnlistmentContract.at(contractAddress).then(contract => contract.getOfferAuthorsLength.call());
  },

  getOfferByIndex(contractAddress, index) {
    return PropertyEnlistmentContract.at(contractAddress).then(contract => contract.getOfferByIndex.call(index))
      .then(([initialized, amount, tenantName, tenantEmail, status]) =>
        ({initialized, amount, tenantName, tenantEmail, status: offerStatusMap[status]}));
  },

  cancelOffer(contractAddress, tenantEmail) {
    return PropertyEnlistmentContract.at(contractAddress).then(contract => contract.cancelOffer(tenantEmail));
  },

  reviewOffer(contractAddress, tenantEmail, approved = true) {
    return PropertyEnlistmentContract.at(contractAddress).then(contract => contract.reviewOffer(approved, tenantEmail));
  },

  submitAgreementDraft(contractAddress, tenantEmail, {
    landlordName, agreementTenantName, agreementTenantEmail, leaseStart, handoverDate, leasePeriod, otherTerms, hash
  }) {
    return PropertyEnlistmentContract.at(contractAddress).then(contract => {
      return contract.submitDraft(
        tenantEmail,
        landlordName,
        agreementTenantName,
        agreementTenantEmail,
        leaseStart,
        handoverDate,
        leasePeriod,
        otherTerms,
        hash
      );
    });
  },

  getAgreement(contractAddress, tenantEmail) {
    return PropertyEnlistmentContract.at(contractAddress).then(contract => {
      return Promise.all([
        contract.getAgreementParticipants.call(tenantEmail),
        contract.getAgreementDetails.call(tenantEmail),
        contract.getAgreementHashes.call(tenantEmail),
        contract.getAgreementStatus.call(tenantEmail)
      ]);
    }).then(([
      [landlordName, tenantName, tenantEmail],
      [amount, leaseStart, handoverDate, leasePeriod, otherTerms], // TODO: convert BigNumber
      [hash, landlordSignature, tenantSignature],
      status
    ]) => {
      return {
        landlordName,
        tenantName,
        tenantEmail,
        amount,
        leaseStart,
        handoverDate,
        leasePeriod,
        otherTerms,
        hash,
        landlordSignature,
        tenantSignature,
        status: agreementStatusMap[status]
      };
    });
  },

  reviewAgreement(contractAddress, tenantEmail, confirmed = true) {
    return PropertyEnlistmentContract.at(contractAddress).then(contract => contract.reviewAgreement(tenantEmail, confirmed));
  },

  landlordSignAgreement(contractAddress, tenantEmail, signature) {
    return PropertyEnlistmentContract.at(contractAddress).then(contract => contract.landlordSignAgreement(tenantEmail, signature));
  },

  tenantSignAgreement(contractAddress, tenantEmail, signature) {
    return PropertyEnlistmentContract.at(contractAddress).then(contract => contract.tenantSignAgreement(tenantEmail, signature));
  },

  cancelAgreement(contractAddress, tenantEmail) {
    return PropertyEnlistmentContract.at(contractAddress).then(contract => contract.cancelAgreement(tenantEmail));
  },

  receiveFirstMonthRent(contractAddress, tenantEmail) {
    return PropertyEnlistmentContract.at(contractAddress).then(contract => contract.receiveFirstMonthRent(tenantEmail));
  }
};
