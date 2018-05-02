module.exports = {
  'POST /enlistments': {
    controller: 'PropertyEnlistmentController',
    action: 'createEnlistment'
  },

  'GET /enlistments': {
    controller: 'PropertyEnlistmentController',
    action: 'findEnlistments'
  },

  'GET /enlistments/:idOrContractAddress': {
    controller: 'PropertyEnlistmentController',
    action: 'getEnlistment'
  },

  'POST /enlistments/:id/approve': {
    controller: 'PropertyEnlistmentController',
    action: 'approveEnlistment'
  },

  'POST /enlistments/:id/reject': {
    controller: 'PropertyEnlistmentController',
    action: 'rejectEnlistment'
  },

  'POST /enlistments/:contractAddress/offers': {
    controller: 'OfferController',
    action: 'sendOffer'
  },

  'GET /enlistments/:contractAddress/offers': {
    controller: 'OfferController',
    action: 'getOffers'
  },

  'GET /enlistments/:id/offers/:tenantEmail': {
    controller: 'OfferController',
    action: 'getOffer'
  },

  'POST /enlistments/:contractAddress/offers/:tenantEmail/cancel': {
    controller: 'OfferController',
    action: 'cancelOffer'
  },

  'POST /enlistments/:contractAddress/offers/review': {
    controller: 'OfferController',
    action: 'reviewOffer'
  },

  'POST /enlistments/:contractAddress/agreements': {
    controller: 'AgreementContractController',
    action: 'submitAgreementDraft'
  },

  'GET /enlistments/:contractAddress/agreements/:tenantEmail': {
    controller: 'AgreementContractController',
    action: 'getAgreement'
  },

  'POST /enlistments/:contractAddress/agreements/:tenantEmail/review': {
    controller: 'AgreementContractController',
    action: 'reviewAgreement'
  },

  'POST /enlistments/:contractAddress/agreements/:tenantEmail/sign': {
    controller: 'AgreementContractController',
    action: 'signAgreement'
  },

  'POST /enlistments/:contractAddress/agreements/:tenantEmail/cancel': {
    controller: 'AgreementContractController',
    action: 'cancelAgreement'
  },

  'POST /enlistments/:contractAddress/agreements/:tenantEmail/payments': {
    controller: 'AgreementContractController',
    action: 'receiveFirstMonthRent'
  },
};
