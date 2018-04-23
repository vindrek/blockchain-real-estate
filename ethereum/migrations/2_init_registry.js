const EnlistmentRegistry = artifacts.require('./EnlistmentRegistry.sol');

module.exports = function(deployer) {
  deployer.deploy(EnlistmentRegistry, {
    from: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
    gas: 8000000,
    gasPrice: 1000000000
  });
};
