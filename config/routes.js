module.exports = {
  'POST /enlistments': {
    controller: 'PropertyEnlistmentController',
    action: 'createEnlistment'
  },

  'GET /enlistments': {
    controller: 'PropertyEnlistmentController',
    action: 'findEnlistments'
  },

  'GET /enlistments/:id': {
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

  'POST /enlistments/:id/offers': {
    controller: 'OfferController',
    action: 'sendOffer'
  },

  'GET /enlistments/:id/offers': {
    controller: 'OfferController',
    action: 'getOffers'
  },

  'GET /enlistments/:id/offers/:tenantEmail': {
    controller: 'OfferController',
    action: 'getOffer'
  },

  'POST /enlistments/:id/offers/:tenantEmail/cancel': {
    controller: 'OfferController',
    action: 'cancelOffer'
  },

  'POST /enlistments/:id/offers/:tenantEmail/review': {
    controller: 'OfferController',
    action: 'reviewOffer'
  },

  'POST /enlistments/:id/agreements': {
    controller: 'AgreementContractController',
    action: 'submitAgreementDraft'
  },

  'GET /enlistments/:id/agreements/:tenantEmail': {
    controller: 'AgreementContractController',
    action: 'getAgreement'
  },

  'POST /enlistments/:id/agreements/:tenantEmail/review': {
    controller: 'AgreementContractController',
    action: 'reviewAgreement'
  },

  'POST /enlistments/:id/agreements/:tenantEmail/sign': {
    controller: 'AgreementContractController',
    action: 'signAgreement'
  },

  'POST /enlistments/:id/agreements/:tenantEmail/cancel': {
    controller: 'AgreementContractController',
    action: 'cancelAgreement'
  },

  'POST /enlistments/:id/agreements/:tenantEmail/payments': {
    controller: 'AgreementContractController',
    action: 'receiveFirstMonthRent'
  },
};
