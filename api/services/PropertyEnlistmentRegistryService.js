'use strict';
const PropertyEnlistmentContractService = require('./PropertyEnlistmentRegistryContractService');
const log = require('../../server/logger');

module.exports = {
  async addEnlistment(enlistment) {
    return PropertyEnlistmentContractService.addEnlistment(enlistment.contractAddress);
  }
};
