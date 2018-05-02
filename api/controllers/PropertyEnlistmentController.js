'use strict';

const PropertyEnlistmentService = require('../services/PropertyEnlistmentService');
const log = require('../../server/logger');

module.exports = {
  async createEnlistment(req, res) {
    const enlistment = await PropertyEnlistmentService.createEnlistment(req.body);

    log.info(`Enlistment created`);

    res.status(201).json(enlistment);
  },

  async getEnlistment(req, res) {
    if (!(req.query.from)) {
      return res.status(400).send('Specify origin of the data through "from" query param: "off-chain" || "on-chain"');
    } else if (['off-chain', 'on-chain'].indexOf(req.query.from) === -1) {
      return res.status(400).send('Invalid "from" value: ' + req.query.from + '. Must be either "off-chain" or "on-chain".');
    }

    let enlistment;
    if (req.query.from === 'off-chain') {
      enlistment = await PropertyEnlistmentService.getOffChainEnlistment(req.params.idOrContractAddress);
    } else {
      enlistment = await PropertyEnlistmentService.getOnChainEnlistment(req.params.idOrContractAddress);
    }

    res.json(enlistment);
  },

  async approveEnlistment(req, res) {
    const contractAddress = await PropertyEnlistmentService.approveEnlistment(req.params.id);

    log.info(`Enlistment with id: ${req.params.id} approved and added to registry`);

    res.status(200).send(contractAddress);
  },

  async rejectEnlistment(req, res) {
    await PropertyEnlistmentService.rejectEnlistment(req.params.id);

    log.info(`Enlistment with id: ${req.params.id} rejected`);

    res.status(200).send();
  },

  async findEnlistments(req, res) {
    if ((req.query.latitude || req.query.longitude || req.query.distance) &&
      !(req.query.latitude && req.query.longitude && req.query.distance)) {
      return res.status(400).send('Latitude, longitude and distance are all required for geosearch');
    }

    let enlistments;

    if (req.query.admin) {
      enlistments = await PropertyEnlistmentService.findAllUnpublished();
    } else if (req.query.latitude && req.query.longitude && req.query.distance) {
      enlistments = await PropertyEnlistmentService.findInArea(
        parseFloat(req.query.latitude), parseFloat(req.query.longitude), parseFloat(req.query.distance)) || [];
    } else if (req.query.bidder) {
      enlistments = await PropertyEnlistmentService.findWithOffersByBidder(req.query.bidder);
    } else if (req.query.landlord) {
      enlistments = await PropertyEnlistmentService.findByLandlord(req.query.landlord);
    } else {
      enlistments = await PropertyEnlistmentService.findAllReviewed();
    }
    res.json(enlistments);
  }
};
