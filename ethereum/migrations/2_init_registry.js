const EnlistmentRegistry = artifacts.require('./EnlistmentRegistry.sol');
const Trigonometry = artifacts.require('./Trigonometry.sol');
const GeoDistance = artifacts.require('./GeoDistance.sol');

const opts = {
  from: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
  gas: 8000000,
  gasPrice: 1000000000
};

module.exports = function (deployer) {
  deployer.deploy(Trigonometry, opts);
  deployer.link(Trigonometry, GeoDistance);
  deployer.deploy(GeoDistance, opts);
  deployer.link(GeoDistance, EnlistmentRegistry);
  deployer.deploy(EnlistmentRegistry, opts);

  /*deployer.deploy(Trigonometry).then(() => {
    deployer.deploy(GeoDistance, {
      from: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
      gas: 8000000,
      gasPrice: 1000000000
    }).then(() => {
      deployer.link(Trigonometry, GeoDistance);
      deployer.deploy(EnlistmentRegistry, {
        from: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
        gas: 8000000,
        gasPrice: 1000000000
      }).then(() => {
        deployer.link(GeoDistance, EnlistmentRegistry);
      });
    });
  });*/
  
};
