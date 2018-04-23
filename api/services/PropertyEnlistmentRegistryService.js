'use strict';
const ngeohash = require('ngeohash');
const PropertyEnlistmentContractService = require('./PropertyEnlistmentRegistryContractService');
const log = require('../../server/logger');

module.exports = {
  async addEnlistment(enlistment) {
    const coords = enlistment.geolocation.coordinates;
    const enlistmentGeohash = ngeohash.encode(coords[0], coords[1]);
    return PropertyEnlistmentContractService.addEnlistment(enlistmentGeohash, enlistment.contractAddress);
  }
};
