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

    contract('Registry retrieval methods', async () => {
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

        // Uses up to 6 decimal points for geographic coordinates representation
        // calculation of cosine uses look-up tables
        // on-chain fn implements cosine-adjusted euclidean distance
        /*
         * accurate enough test: result difference with Haversine method must not be more than 1% of the distance radius provided by the user. Assumption: reasonable search distance radius input is considered to be in between 50m and 30km; latitude between 80...-80 (cosine-adjusted Euclidean distance algorithm gets worse near poles)
         * 
        */
        it('should calculate distance accurate enough for the purpose', async () => {
            const rawTestData = [
                [[58.382794, 26.734081], [58.381581, 26.729116]], // sanity test: around 320m (source: https://rechneronline.de/geo-coordinates/#distance)
                [[58.656685, 25.031867], [58.646353, 25.039849]], // 1240m
                [[59.437370, 24.764514], [59.429104, 24.704972]], // 3494m
                [[59.438949, 24.746067], [59.443220, 24.907159]], // 9130m
                [[70.194714, 28.219365], [70.202357, 28.173399]], // 1931m
                [[71.032318, 25.886381], [71.029887, 25.854855]], // 1172m
                [[79.455461, -44.500578], [79.496105, -42.868747]], // 33485m
                [[53.917973, -106.102446], [53.921176, -106.100428]], // 380m
                [[29.211981, -81.023547], [29.209254, -81.060835]], // 3636m
                [[2.838028, -60.713435], [2.842637, -60.727385]], // 1634m
                [[2.820023, -60.677811], [2.821309, -60.680547]], // 336m
                [[-33.931317, 18.461583], [-33.935322, 18.459772]], // 476m
                [[-33.950850, 18.546370], [-33.942021, 18.570400]], // 2427m
                [[-33.967168, 18.507219], [-33.983652, 18.567050]], // 5820m
                [[-33.932351, 18.453272], [-33.846686, 18.713618]] // 25879m
            ];
            const intTestData = rawTestData.map((pointPair) => {
                return pointPair.map((coordPair) => {
                    return coordPair.map((coord) => coord * 1e6);
                });
            });
            var maxError = 0;
            for (let idx = 0; idx < intTestData.length; idx++) {
                const points = intTestData[idx];
                const contractEuclideanDistance = (await registry.distance.call(points[0][0], points[0][1], points[1][0], points[1][1])) / 1e6; // response is in micrometres, convert it back
                const haversineDistance = trig.haversine({ lat: rawTestData[idx][0][0], lng: rawTestData[idx][0][1] }, { lat: rawTestData[idx][1][0], lng: rawTestData[idx][1][1] });
                const diff = Math.abs(contractEuclideanDistance - haversineDistance);
                const error = diff / haversineDistance;

                if (error > maxError) {
                    maxError = error;
                }
                if (diff > 10) {
                    //console.log('Distance diff bigger than 10metres. Error', error, 'Diff', diff, 'contractEuclideanDistance', contractEuclideanDistance, 'haversineDistance', haversineDistance, 'points', rawTestData[idx]);
                }
            }
            assert.isAtMost(maxError, 0.05);
            console.log('Max distance difference error', maxError);
        });

        it('should retrieve enlistments and their respective geohashes', async () => {
            const enlistmentsAndGeohashes = await registry.getEnlistmentsForGeosearch.call();
            assert.equal(enlistmentsAndGeohashes[ADDRESSES][0], enlistmentInstance.address);
            assert.equal(toAscii(enlistmentsAndGeohashes[GEOHASHES][0]), 'ud7h0k1f8');
            assert.equal(enlistmentsAndGeohashes[ADDRESSES][1], enlistmentInstance2.address);
            assert.equal(toAscii(enlistmentsAndGeohashes[GEOHASHES][1]), 'du8h1k2f8');
        });

        it('should retrieve enlistments and their respective offer count', async () => {
            const enlistmentsAndBids = await registry.getEnlistmentsForBidderFiltering();
            assert.equal(enlistmentsAndBids[ADDRESSES][0], enlistmentInstance.address);
            assert.equal(enlistmentsAndBids[OFFERCOUNTS][0], 2);
            assert.equal(enlistmentsAndBids[ADDRESSES][1], enlistmentInstance2.address);
            assert.equal(enlistmentsAndBids[OFFERCOUNTS][1], 2);
        });
    });

});
