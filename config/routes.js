module.exports = {
  'POST /enlistments': {
    controller: 'PropertyEnlistmentController',
    action: 'createEnlistment'
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
    action: 'getOffer'
  },

  'POST /enlistments/:id/offers/review': {
    controller: 'OfferController',
    action: 'reviewOffer'
  },

  'POST /enlistments/:id/agreements': {
    controller: 'PropertyEnlistmentController',
    action: 'submitAgreementDraft'
  },

  'GET /enlistments/:id/agreements': {
    controller: 'PropertyEnlistmentController',
    action: 'getAgreement'
  },

  'POST /enlistments/:id/agreements/review': {
    controller: 'PropertyEnlistmentController',
    action: 'reviewAgreement'
  },

  'POST /enlistments/:id/agreements/sign': {
    controller: 'PropertyEnlistmentController',
    action: 'signAgreement'
  },

  'POST /enlistments/:id/payments': {
    controller: 'PropertyEnlistmentController',
    action: 'receiveFirstMonthRent'
  },
};
