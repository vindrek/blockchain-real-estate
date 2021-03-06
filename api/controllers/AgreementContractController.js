'use strict';

const PropertyEnlistmentService = require('../services/PropertyEnlistmentService');
const log = require('../../server/logger');

module.exports = {
  async submitAgreementDraft(req, res) {
    const tenantEmail = req.body.tenantEmail;
    delete req.body.tenantEmail; // req.body is now the tenancyAgreement
    await PropertyEnlistmentService.submitAgreementDraft(req.params.id, tenantEmail, req.body);

    log.info('Agreement draft submitted');
    res.status(201).send();
  },

  async getAgreement(req, res) {
    const agreement = await PropertyEnlistmentService.getAgreement(req.params.id, req.params.tenantEmail);

    res.json(agreement);
  },

  async reviewAgreement(req, res) {
    await PropertyEnlistmentService.reviewAgreement(req.params.id, req.params.tenantEmail, req.body.confirmed);

    log.info(`Agreement reviewed with resolution ${req.body.confirmed}`);
    res.status(200).send();
  },

  async signAgreement(req, res) {
    await PropertyEnlistmentService.signAgreement(req.params.id, req.params.tenantEmail, req.body.party, req.body.signature);

    log.info(`Agreement signed by ${req.body.party}`);
    res.status(200).send();
  },

  async cancelAgreement(req, res) {
    await PropertyEnlistmentService.cancelAgreement(req.params.id, req.params.tenantEmail);

    log.info(`Agreement cancelled`);

    res.status(200).send();
  },

  async receiveFirstMonthRent(req, res) {
    await PropertyEnlistmentService.receiveFirstMonthRent(req.params.id, req.params.tenantEmail);

    log.info(`First month payment received`);
    res.status(200).send();
  }
};
