const structEqual = require('./helpers').structEqual;
const bigNumberEqual = require('./helpers').bigNumberEqual;
const expectThrowMessage = require('./helpers').expectThrowMessage;
const toAscii = require('./helpers').toAscii;
const ER = artifacts.require("EnlistmentRegistry");
const ETC = artifacts.require("Enlistment");
const web3 = require('web3');
const util = require('util');
const web3utils = require('web3-utils');
const trig = require('../../api/utils/trigonometry');

/* tests run very unstable: sometimes all pass, sometimes there are multiple fails */


const revertErrorMsg = 'VM Exception while processing transaction: revert';
const ADDRESSES = 0;
const GEOHASHES = 1;
const OFFERCOUNTS = 1;

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

        it('should instantiate with an empty array of addresses', async() => {
            const enlistmentsArray = await contract.getEnlistments.call();
            assert.equal(enlistmentsArray.length, 0);
        });
    });

    contract('Adding enlistments to registry', async () => {
        let registry;
        let enlistmentInstance;

        before(async() => {
            registry = await ER.new();
            enlistmentInstance = await ETC.new('john@wick.xd', 'John Wick', 'Baker', 1, 2, 3, 45000, 'ud7h0k1f8', JSON.stringify(details));
            
            //let sendTx1 = await instance.sendOffer(100, 'Winston', 'winston@noreply.xd');
            //let sendTx2 = await instance.sendOffer(20, 'Ares', 'ares@willreply.xd');    
        });

        it('should add enlistment to registry', async() => {
            await registry.addEnlistment(enlistmentInstance.address);
            const enlistmentsArray = await registry.getEnlistments.call();
            assert.equal(enlistmentsArray.length, 1);
            assert.equal(enlistmentsArray[0], enlistmentInstance.address);
        });
    });

    contract('Registry retrieval methods', async () => {
        let registry;
        let enlistmentInstance;
        let enlistmentInstance2;

        before(async() => {
            registry = await ER.new();
            enlistmentInstance = await ETC.new('john@wick.xd', 'John Wick', 'Baker', 1, 2, 3, 45000, 'ud7h0k1f8', JSON.stringify(details));
            registry.addEnlistment(enlistmentInstance.address);
            let sendTx1 = await enlistmentInstance.sendOffer(100, 'Winston', 'winston@noreply.xd');
            let sendTx2 = await enlistmentInstance.sendOffer(20, 'Ares', 'ares@willreply.xd');
            enlistmentInstance2 = await ETC.new('cassian@reply.xd', 'Cassian', 'Waker', 3, 1, 2, 50000, 'du8h1k2f8', JSON.stringify(details));
            registry.addEnlistment(enlistmentInstance2.address);
            let sendTx3 = await enlistmentInstance2.sendOffer(200, 'Winston', 'winston@noreply.xd');
            let sendTx4 = await enlistmentInstance2.sendOffer(300, 'Ares', 'nores@willreply.xd');
        });

        // Uses up to 6 decimal points for geographic coordinates representation
        // calculation of cosine uses look-up tables
        // on-chain fn implements cosine-adjusted euclidean distance
        /*
         * accurate enough test: result difference with Haversine method must not be more than 1% of the distance radius provided by the user. Assumption: reasonable search distance radius input is considered to be in between 50m and 30km; latitude between 80...-80 (cosine-adjusted Euclidean distance algorithm gets worse near poles)
         * 
        */
        it('should calculate distance accurate enough for the purpose', async() => {
            const testData = [
                [[58382794, 26734081],[58381581, 26729116]], // sanity test google maps: around 317m
                [[58.656685, 25.031867], [58.646353, 25.039849]], // 1200m
                [[59.437370, 24.764514], [59.429104, 24.704972]],
                [[59.438949, 24.746067], [59.443220, 24.907159]],
                [[70.194714, 28.219365], [70.202357, 28.173399]],
                [[71.032318, 25.886381], [71.029887, 25.854855]],
                [[79.455461, -44.500578], [79.496105, -42.868747]],
                [[53.917973, -106.102446], [53.921176, -106.100428]],
                [[29.211981, -81.023547], [29.209254, -81.060835]],
                [[2.838028, -60.713435], [2.842637, -60.727385]],
                [[2.820023, -60.677811], [2.821309, -60.680547]],
                [[-33.931317, 18.461583], [-33.935322, 18.459772]],
                [[-33.950850, 18.546370], [-33.942021, 18.570400]],
                [[-33.967168, 18.507219], [-33.983652, 18.567050]],
                [[-33.932351, 18.453272], [-33.846686, 18.713618]]
            ];
            testData.forEach(async (points) => {
                const contractEuclideanDistance = await registry.distance.call(points.flatten());
                const haversineDistance = trig.haversine({lat: points[0][0], lng: points[0][1]}, {lat: points[1][0], lng: points[1][1]});
                const diff = Math.abs(contractEuclideanDistance - haversineDistance);
                assert.isAtMost(diff, 5);
            });
        });

        it('should retrieve enlistments and their respective geohashes', async() => {
            const enlistmentsAndGeohashes = await registry.getEnlistmentsForGeosearch.call();
            assert.equal(enlistmentsAndGeohashes[ADDRESSES][0], enlistmentInstance.address);
            assert.equal(toAscii(enlistmentsAndGeohashes[GEOHASHES][0]), 'ud7h0k1f8');
            assert.equal(enlistmentsAndGeohashes[ADDRESSES][1], enlistmentInstance2.address);
            assert.equal(toAscii(enlistmentsAndGeohashes[GEOHASHES][1]), 'du8h1k2f8');
        });

        it('should retrieve enlistments and their respective offer count', async() => {
            const enlistmentsAndBids = await registry.getEnlistmentsForBidderFiltering();
            assert.equal(enlistmentsAndBids[ADDRESSES][0], enlistmentInstance.address);
            assert.equal(enlistmentsAndBids[OFFERCOUNTS][0], 2);
            assert.equal(enlistmentsAndBids[ADDRESSES][1], enlistmentInstance2.address);
            assert.equal(enlistmentsAndBids[OFFERCOUNTS][1], 2);
        });
    });

});
