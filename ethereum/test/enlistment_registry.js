const structEqual = require('./helpers').structEqual;
const bigNumberEqual = require('./helpers').bigNumberEqual;
const expectThrowMessage = require('./helpers').expectThrowMessage;
const bigNumberToNumber = require('./helpers').toNumber;
const toAscii = require('./helpers').toAscii;
const ER = artifacts.require("EnlistmentRegistry");
const ETC = artifacts.require("Enlistment");
const web3 = require('web3');
const util = require('util');
const web3utils = require('web3-utils');
const trig = require('../../api/utils/trigonometry');
const BigNumber = require('bignumber.js');

/* tests run very unstable: sometimes all pass, sometimes there are multiple fails */


const revertErrorMsg = 'VM Exception while processing transaction: revert';
const ADDRESSES = 0;
const GEOHASHES = 1;
const HAS_BID = 1;

const details = {
    propertyType: "PRIVATE_APARTMENT",
    rentalType: "ROOM",
    availableFrom: "2018-08-08",
    availableUntil: "2018-10-08",
    nrOfBedrooms: 2,
    nrOfBathrooms: 1,
    minPrice: 100,
    floorSize: 55.6,
    description: "nice house. no cats.",
    furniture: ["DRYER", "OVEN"],
    photos: ["https://URL1.com", "https://URL2.com"]
};

contract('EnlistmentRegistry', async ([owner]) => {

    contract('Registry instantiation', async ([deployerAddress]) => {
        let contract;

        before(async () => {
            contract = await ER.new();
        });

        it('should deploy a registry contract instance', async () => {
            assert.isOk(contract.address);
        });

        it('should set the owner property to the address that was used for deployment', async () => {
            let contractOwner = await contract.getOwner.call();
            assert.equal(deployerAddress, contractOwner);
        });

        it('should instantiate with an empty array of addresses', async () => {
            const enlistmentsArray = await contract.getEnlistments.call();
            assert.equal(enlistmentsArray.length, 0);
        });
    });

    contract('Adding enlistments to registry', async () => {
        let registry;
        let enlistmentInstance;

        before(async () => {
            registry = await ER.new();
            enlistmentInstance = await ETC.new('john@wick.xd', 'John Wick', 'Baker', 1, 2, 3, 45000, 58382794, 26734081, JSON.stringify(details));

            //let sendTx1 = await instance.sendOffer(100, 'Winston', 'winston@noreply.xd');
            //let sendTx2 = await instance.sendOffer(20, 'Ares', 'ares@willreply.xd');    
        });

        it('should add enlistment to registry', async () => {
            await registry.addEnlistment(enlistmentInstance.address);
            const enlistmentsArray = await registry.getEnlistments.call();
            assert.equal(enlistmentsArray.length, 1);
            assert.equal(enlistmentsArray[0], enlistmentInstance.address);
        });
    });

    contract('Filtering by bidder or landlord', async () => {
        let registry;
        let enlistmentInstance;
        let enlistmentInstance2;

        before(async () => {
            registry = await ER.new();
            enlistmentInstance = await ETC.new('john@wick.xd', 'John Wick', 'Baker', 1, 2, 3, 45000, 58382794, 26734081, JSON.stringify(details));
            registry.addEnlistment(enlistmentInstance.address);
            let sendTx1 = await enlistmentInstance.sendOffer(100, 'Winston', 'winston@noreply.xd');
            let sendTx2 = await enlistmentInstance.sendOffer(20, 'Ares', 'ares@willreply.xd');
            enlistmentInstance2 = await ETC.new('cassian@reply.xd', 'Cassian', 'Waker', 3, 1, 2, 50000, 58382794, 26735081, JSON.stringify(details));
            registry.addEnlistment(enlistmentInstance2.address);
            let sendTx3 = await enlistmentInstance2.sendOffer(200, 'Winston', 'winston@noreply.xd');
            let sendTx4 = await enlistmentInstance2.sendOffer(300, 'Ares', 'nores@willreply.xd');
        });

        it('should retrieve enlistments for a given tenant for which he/she has made an offers', async () => {
            const enlistments = await registry.getEnlistmentsByBidder.call('ares@willreply.xd');
            const bitset = enlistments.toString(2);
            assert.equal(bitset, '1');

            const enlistments2 = await registry.getEnlistmentsByBidder.call('winston@noreply.xd');
            const bitset2 = enlistments2.toString(2);
            assert.equal(bitset2, '11');
        });

        it('should retrieve enlistments for a given landlord', async () => {
            let enlistmentInstance3 = await ETC.new('cassian@reply.xd', 'Cassian', 'Waker', 3, 1, 2, 50000, 58382794, 26735081, JSON.stringify(details));
            await registry.addEnlistment(enlistmentInstance3.address);

            const enlistments = await registry.getEnlistmentsByLandlord('john@wick.xd');
            assert.include(enlistments, enlistmentInstance.address);
            assert.notInclude(enlistments, enlistmentInstance2.address);
            assert.notInclude(enlistments, enlistmentInstance3.address);

            const enlistments2 = await registry.getEnlistmentsByLandlord('cassian@reply.xd');
            assert.notInclude(enlistments2, enlistmentInstance.address);
            assert.include(enlistments2, enlistmentInstance2.address);
            assert.include(enlistments2, enlistmentInstance3.address);

            const enlistments3 = await registry.getEnlistmentsByLandlord('cassian@noreply.xd');
            assert.notInclude(enlistments3, enlistmentInstance.address);
            assert.notInclude(enlistments3, enlistmentInstance2.address);
            assert.notInclude(enlistments3, enlistmentInstance3.address);
        });

    });

    contract('Geosearch filtering', async () => {

        let registry;
        let loc1, loc2, loc3, loc4, loc5, loc6, loc7;
        let testData = {
            loc1, // Raatuse dormitory
            loc2, // Tasku centre
            loc3, // Tamme stadium
            loc4, // Trainstation
            loc5, // Kaubamaja
            loc6, // Vanemuine theatre
            loc7 // Viru centre
        };

        const addEnlistmentsToRegistry = async () => {
            const locs = Object.keys(testData);
            for (let i = 0; i < locs.length; i++) {
                await registry.addEnlistment(testData[locs[i]]);
            }
        }

        before(async () => {
            registry = await ER.new();
            testData.loc1 = (await ETC.new('john@wick.xd', 'John Wick', 'Baker', 1, 2, 3, 45000, 58382508, 26731971, JSON.stringify(details))).address;
            testData.loc2 = (await ETC.new('john@wick.xd', 'John Wick', 'Baker', 1, 2, 3, 45000, 58377964, 26730725, JSON.stringify(details))).address;
            testData.loc3 = (await ETC.new('john@wick.xd', 'John Wick', 'Baker', 1, 2, 3, 45000, 58366366, 26713680, JSON.stringify(details))).address;
            testData.loc4 = (await ETC.new('john@wick.xd', 'John Wick', 'Baker', 1, 2, 3, 45000, 58373669, 26706901, JSON.stringify(details))).address;
            testData.loc5 = (await ETC.new('john@wick.xd', 'John Wick', 'Baker', 1, 2, 3, 45000, 58377960, 26727514, JSON.stringify(details))).address;
            testData.loc6 = (await ETC.new('john@wick.xd', 'John Wick', 'Baker', 1, 2, 3, 45000, 58376270, 26724055, JSON.stringify(details))).address;
            testData.loc7 = (await ETC.new('john@wick.xd', 'John Wick', 'Baker', 1, 2, 3, 45000, 59436104, 24756290, JSON.stringify(details))).address;
            await addEnlistmentsToRegistry();
        });

        // todo: add more tests for more diverse latitudes
        context('should filter enlistments based on geographical proximity', async () => {
            it('bitset test', async () => {
                const result = await registry.geosearch.call(58377270, 26726120, 350 * 1e6); // 350m radius search with the marker in between Kaubamaja and Vanemuine
                const bitset = result.toString(2);
                assert.equal(bitset, '110010');
            });
            it('350m radius', async () => {
                const result = await registry.geosearch.call(58377270, 26726120, 350 * 1e6); // 350m radius search with the marker in between Kaubamaja and Vanemuine
                const bitset = result.toString(2);
                assert.equal(bitset, '110010');
            });
            it('30m radius', async () => {
                const result = await registry.geosearch.call(58366195, 26713644, 100 * 1e6); // 30m radius search with the marker right next to Tamme stadium
                const bitset = result.toString(2);
                assert.equal(bitset, '100');
            });

            it('10km radius', async () => {
                const result = await registry.geosearch.call(58377270, 26726120, 10000 * 1e6); // 10km radius search with the marker in between Kaubamaja and Vanemuine. Should include all Tartu enlistments
                const bitset = result.toString(2);
                assert.equal(bitset, '111111');
            });

            it('5m accuracy test: 93m radius', async () => {
                const result = await registry.geosearch.call(58377953, 26729051, 93 * 1e6); // 89m to kaubamaja, 98m to tasku
                const bitset = result.toString(2);
                assert.equal(bitset, '10000');
            });
        })

    });

});
