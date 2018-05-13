const ER = artifacts.require("EnlistmentRegistry");
const ETC = artifacts.require("Enlistment");
const GD = artifacts.require('GeoDistance');
const T = artifacts.require("Trigonometry");
const config = require('../../config/ethereum');
const util = require('util');
const web3utils = require('web3-utils');
const BigNumber = require('bignumber.js');
const fs = require('fs');
const path = require('path');

/* Measure efficiency of the on-chain service implementation */

/* Configuration */
const LOG_TO_OUTPUT = false;
const RUNS = 64;
const GEOSEARCH_EXCLUSIVE = false; // run with both true and false to get both data

/* Test data */

const scenarioEnlistmentData = {
    landlordEmail: 'john@wick.xd',
    landlordName: 'John Wick',
    streetName: 'Baker',
    floorNr: 1,
    apartmentNr: 2,
    houseNr: 3,
    postalCode: 45000,
    lat: 58382794,
    lng: 26734081,
    detilsJson: JSON.stringify({
        propertyType: "PRIVATE_APARTMENT",
        rentalType: "ROOM",
        availableFrom: "2018-08-08",
        availableUntil: "2018-10-08",
        nrOfBedrooms: 2,
        nrOfBathrooms: 1,
        minPrice: 100,
        floorSize: 55.6,
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
        furniture: ["DRYER", "OVEN"],
        photos: ["https://enlistmentphotos.com/1", "https://enlistmentphotos.com/2"]
    })
};

const scenarioOfferData = {
    amount: 100,
    tenantName: 'Winston',
    tenantEmail: 'winston@noreply.xd'
};

const scenarioTenancyAgreementData = {
    tenantEmail: scenarioOfferData.tenantEmail,
    landlordName: 'John Wick Junior', // may be different from the one of the enlistment for agency support
    agreementTenantName: 'Cassian',
    agreementTenantEmail: 'cassian@noreply.xd', // again, may be different than the bidder for agency support
    leaseStart: 1519580655493,
    handoverDate: 1519580355498,
    leasePeriod: 65493,
    otherTerms: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
    documentHash: '1eeeef9a1ea03d5f681ea6c8b00a302c6adcd2a80a3d588e89ec03872ec36490', // keccak256 hash of the JSON encoded agreement as just an example
    landlordSignature: '18d3f905b30bb3a2994a2b2269afbd8fab68e318b0251c483adbe31591b9cd73',
    tenantSignature: 'bcba4717b73af51965b789810085b54ff074708f8ed0f8e2666067c06608754f'
};

const scenarioMockEnlistment = Object.assign({}, scenarioEnlistmentData, { landlordEmail: 'non-john@wick.xd' }); // for brevity, make it so that the landlord in the scenario has no previous enlistments

const geosearchExclusiveRunLocation = {
    lat: 58382335,
    lng: 26.762960
};

const scenarioMockOffers = [
    {
        amount: 101,
        tenantName: 'Aurelio',
        tenantEmail: 'aurelio@noreply.xd'
    },
    {
        amount: 102,
        tenantName: 'Marcus',
        tenantEmail: 'marcus@noreply.xd'
    },
    {
        amount: 103,
        tenantName: 'Viggo',
        tenantEmail: 'viggo@noreply.xd'
    }
];

/* Helper functions to measure gas for each type of service interactions: contract creation, ABI tx, ABI call */

const sendTxAndGetGasUsed = async (fn, ...params) => {
    const start = new Date();
    let txHash = await fn.sendTransaction(...params);
    const end = new Date();
    stepRunningTimer += (end - start); // tx time measured in this test setup with blocks being instamined and no competition in tx pools is irrelevant to a production environment context running against Ethereum main network. ignore in analysis
    const tx = await web3.eth.getTransaction(txHash);
    const receipt = await web3.eth.getTransactionReceipt(txHash);
    // console.log('should be true', balanceBefore.minus(balanceAfter).toNumber(), receipt.gasUsed * (web3.eth.gasPrice).toNumber()); truffle uses different gas price, so explicitly set gas price with ganache
    return receipt.gasUsed;
};

const createContractAndGetRefAndGasUsed = async (fn, ...params) => {
    let balanceBefore = await web3.eth.getBalance(web3.eth.accounts[0]);
    const start = new Date();
    let ref = await fn(...params); // tx time measured in this test setup with blocks being instamined and no competition in tx pools is irrelevant to a production environment context running against Ethereum main network. ignore in analysis
    const end = new Date();
    stepRunningTimer += (end - start);
    const balanceAfter = await web3.eth.getBalance(web3.eth.accounts[0]);
    // truffle uses different gas price, so explicitly set gas price with ganache
    const gasUsed = balanceBefore.minus(balanceAfter).dividedBy(web3.eth.gasPrice).toNumber();
    return { gasUsed, ref };
};

const makeCallAndEstimateGas = async (fn, ...params) => {
    // first do the estimation
    const gasEstimation = await fn.estimateGas(...params);
    // now do the actual call and get data
    const start = new Date();
    const output = await fn(...params);
    const end = new Date();
    stepRunningTimer += (end - start);
    return { gasEstimation, output };
};

/* Utility helper functions */

const flattenDeep = (arr) => {
    return arr.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
};

const sum = (arr) => arr.reduce((a, b) => a + b);

// use this method in the end of each step to flush measurements to organized data structures and clean up (reset step timer)
const appendResult = (step, compositeOf) => {
    const flatGasMeasurementArray = flattenDeep(compositeOf);
    const aggregateGas = sum(flatGasMeasurementArray);
    const requestCount = flatGasMeasurementArray.length;

    scenarioRunForGas.push(aggregateGas);
    scenarioRunForRequestCount.push(requestCount);
    scenarioRunForTime.push(stepRunningTimer);

    if (LOG_TO_OUTPUT) {
        console.log('Step ' + step + ' gas:', aggregateGas + ' (composite of:', compositeOf.join(' and ') + ')'); // comment this line to disable output to console
        console.log('Step ' + step + ' request count:', requestCount);
    }

    // reset timer
    stepRunningTimer = 0;
};

const scenarioResultsToCsv = async (results, filePath, headerRow) => {
    const newline = '\r\n';
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '', { encoding: 'utf8' });
    }

    const writer = fs.createWriteStream(filePath, { flags: 'w' }); // overwrite previous file
    writer.on('open', () => {
        writer.write(headerRow + newline);
        results.forEach((run, idx) => {
            writer.write(run.join(',') + newline);
        });
        writer.end();
    });
};

/* Test data population functions */

const populateOffers = async (enlistment) => {
    for (let i = 0; i < scenarioMockOffers.length; i++) {
        const mockOffer = scenarioMockOffers[i];
        await enlistment.sendOffer(mockOffer.amount, mockOffer.tenantName, mockOffer.tenantEmail);
    }
};

const populateEnlistments = async (registry, numberOfEnlistments) => {

    let lat; let lng;
    if (GEOSEARCH_EXCLUSIVE) {
        lat = geosearchExclusiveRunLocation.lat;
        lng = geosearchExclusiveRunLocation.lng;
    } else {
        lat = scenarioMockEnlistment.lat;
        lng = scenarioMockEnlistment.lng;
    }

    for (let i = 0; i < numberOfEnlistments; i++) {

        const enlistment = await ETC.new(scenarioMockEnlistment.landlordEmail, scenarioMockEnlistment.landlordName, scenarioMockEnlistment.streetName, scenarioMockEnlistment.floorNr, scenarioMockEnlistment.apartmentNr, scenarioMockEnlistment.houseNr, scenarioMockEnlistment.postalCode, lat, lng, scenarioMockEnlistment.detilsJson);
        await registry.addEnlistment(enlistment.address);
        await populateOffers(enlistment);
    }
};

/* Steps of the scenario */

const step1 = async (registry) => {

    const enlistmentInit = await createContractAndGetRefAndGasUsed(ETC.new, scenarioEnlistmentData.landlordEmail, scenarioEnlistmentData.landlordName, scenarioEnlistmentData.streetName, scenarioEnlistmentData.floorNr, scenarioEnlistmentData.apartmentNr, scenarioEnlistmentData.houseNr, scenarioEnlistmentData.postalCode, scenarioEnlistmentData.lat, scenarioEnlistmentData.lng, scenarioEnlistmentData.detilsJson);

    const enlistment = enlistmentInit.ref;
    const enlistmentGasUsed = enlistmentInit.gasUsed;

    const appendRegistryGasUsed = await sendTxAndGetGasUsed(registry.addEnlistment, enlistment.address);

    appendResult(1, [enlistmentGasUsed, appendRegistryGasUsed]);

    return enlistment;
};

const step2 = async (registry) => {
    const publishedEnlistmentsInit = await makeCallAndEstimateGas(registry.getEnlistments);
    const publishedEnlistments = publishedEnlistmentsInit.output;
    const publishedEnlistmentsGasEstimate = publishedEnlistmentsInit.gasEstimation;

    // composite step with N + 1 calls to map the registry enlistment references to actual data as requested by the actor
    let mappingEstimations = [];
    for (let i = 0; i < publishedEnlistments.length; i++) {
        const enlistmentToBeMapped = await ETC.at(publishedEnlistments[i]);
        const mapping = await makeCallAndEstimateGas(enlistmentToBeMapped.getEnlistment);
        mappingEstimations.push(mapping.gasEstimation);
    }

    appendResult(2, [publishedEnlistmentsGasEstimate, mappingEstimations]);
};

const step3 = async (registry) => {

    // geosearch input location 500m away from the enlistment in the scenario, search radius 1000 metres, all enlistments in the registry are within 500 metres to the input
    const geosearchEnlistmentsInit = await makeCallAndEstimateGas(registry.geosearch, 58381746, 26742426, 1000 * 1e6);
    const geosearchEnlistmentBitset = geosearchEnlistmentsInit.output.toString(2);
    const geosearchEnlistmentsGasEstimate = geosearchEnlistmentsInit.gasEstimation;

    // composite step with N + 1 calls to map filtering result of bitset indices to enlistment addresses
    let geosearchIndicesMappingEstimations = [];
    let bitsetArray = geosearchEnlistmentBitset.split('');
    let idxRange = bitsetArray.length - 1;
    let geosearchEnlistmentAddresses = [];
    for (let i = idxRange; i >= 0; i--) {
        const bit = bitsetArray[i];
        if (bit === '1') {
            const mapping = await makeCallAndEstimateGas(registry.getEnlistmentAddressByIndex, idxRange - i);
            geosearchIndicesMappingEstimations.push(mapping.gasEstimation);
            geosearchEnlistmentAddresses.push(mapping.output);
        }
    }

    // another composite step with N + 1 calls to map the registry enlistment references to actual data as requested by the actor
    let geosearchEnlistmentMappingEstimations = [];
    for (let i = 0; i < geosearchEnlistmentAddresses.length; i++) {
        const enlistmentToBeMapped = await ETC.at(geosearchEnlistmentAddresses[i]);
        const mapping = await makeCallAndEstimateGas(enlistmentToBeMapped.getEnlistment);
        geosearchEnlistmentMappingEstimations.push(mapping.gasEstimation);
    }

    appendResult(3, [geosearchEnlistmentsGasEstimate, geosearchIndicesMappingEstimations, geosearchEnlistmentMappingEstimations]);
};

const step4 = async (enlistment) => {
    const enlistmentRetrievalInit = await makeCallAndEstimateGas(enlistment.getEnlistment);
    const enlistmentRetrievalGasEstimate = enlistmentRetrievalInit.gasEstimation;
    appendResult(4, [enlistmentRetrievalGasEstimate]);
};

const step5 = async (enlistment) => {
    const sendOfferGasUsed = await sendTxAndGetGasUsed(enlistment.sendOffer, scenarioOfferData.amount, scenarioOfferData.tenantName, scenarioOfferData.tenantEmail);
    appendResult(5, [sendOfferGasUsed]);
};

const step6 = async (registry) => {
    const landlordEnlistmentsInit = await makeCallAndEstimateGas(registry.getEnlistmentsByLandlord, scenarioEnlistmentData.landlordEmail);
    const landlordEnlistmentBitset = landlordEnlistmentsInit.output.toString(2);
    const landlordEnlistmentsGasEstimate = landlordEnlistmentsInit.gasEstimation;

    // composite step with N + 1 calls to map filtering result of bitset indices to enlistment addresses
    let landlordIndicesMappingEstimations = [];
    let bitsetArray = landlordEnlistmentBitset.split('');
    let idxRange = bitsetArray.length - 1;
    let landlordEnlistmentAddresses = [];
    for (let i = idxRange; i >= 0; i--) {
        const bit = bitsetArray[i];
        if (bit === '1') {
            const mapping = await makeCallAndEstimateGas(registry.getEnlistmentAddressByIndex, idxRange - i);
            landlordIndicesMappingEstimations.push(mapping.gasEstimation);
            landlordEnlistmentAddresses.push(mapping.output);
        }
    }

    // another composite step with N + 1 calls to map the registry enlistment references to actual data as requested by the actor
    let landlordEnlistmentMappingEstimations = [];
    for (let i = 0; i < landlordEnlistmentAddresses.length; i++) {
        const enlistmentToBeMapped = await ETC.at(landlordEnlistmentAddresses[i]);
        const mapping = await makeCallAndEstimateGas(enlistmentToBeMapped.getEnlistment);
        landlordEnlistmentMappingEstimations.push(mapping.gasEstimation);
    }
    appendResult(6, [landlordEnlistmentsGasEstimate, landlordIndicesMappingEstimations, landlordEnlistmentMappingEstimations]);
};

const step7 = async (enlistment) => {
    const offerAuthorsLengthInit = await makeCallAndEstimateGas(enlistment.getOfferAuthorsLength)
    const offerAuthorsLength = offerAuthorsLengthInit.output;
    const offerAuthorsLengthGasEstimate = offerAuthorsLengthInit.gasEstimation;

    const offerMappingEstimations = [];
    // composite step with N + 1 calls to map offers by index to actual data
    for (let i = 0; i < offerAuthorsLength; i++) {
        const offerToBeMapped = await makeCallAndEstimateGas(enlistment.getOfferByIndex, i);
        offerMappingEstimations.push(offerToBeMapped.gasEstimation);
    }
    appendResult(7, [offerAuthorsLengthGasEstimate, offerMappingEstimations]);
};

const step8 = async (enlistment) => {
    const offerInit = await makeCallAndEstimateGas(enlistment.getOffer, scenarioOfferData.tenantEmail);
    const offerGasEstimate = offerInit.gasEstimation;

    appendResult(8, [offerGasEstimate]);
};

const step9 = async (enlistment) => {
    const acceptOfferGasUsed = await sendTxAndGetGasUsed(enlistment.reviewOffer, true, scenarioOfferData.tenantEmail);
    appendResult(9, [acceptOfferGasUsed]);
};

const step10 = async (enlistment) => {
    const submitAgreementGasUsed = await sendTxAndGetGasUsed(
        enlistment.submitDraft,
        scenarioTenancyAgreementData.tenantEmail,
        scenarioTenancyAgreementData.landlordName,
        scenarioTenancyAgreementData.agreementTenantName,
        scenarioTenancyAgreementData.agreementTenantEmail,
        scenarioTenancyAgreementData.leaseStart,
        scenarioTenancyAgreementData.handoverDate,
        scenarioTenancyAgreementData.leasePeriod,
        scenarioTenancyAgreementData.otherTerms,
        scenarioTenancyAgreementData.documentHash);
    appendResult(10, [submitAgreementGasUsed]);
};

const step11 = async (registry) => {
    const tenantEnlistmentsInit = await makeCallAndEstimateGas(registry.getEnlistmentsByBidder, scenarioOfferData.tenantEmail);
    const tenantEnlistmentBitset = tenantEnlistmentsInit.output.toString(2);
    const tenantEnlistmentsGasEstimate = tenantEnlistmentsInit.gasEstimation;

    // composite step with N + 1 calls to map filtering result of bitset indices to enlistment addresses
    let tenantIndicesMappingEstimations = [];
    let bitsetArray = tenantEnlistmentBitset.split('');
    let idxRange = bitsetArray.length - 1;
    let tenantEnlistmentAddresses = [];
    for (let i = idxRange; i >= 0; i--) {
        const bit = bitsetArray[i];
        if (bit === '1') {
            const mapping = await makeCallAndEstimateGas(registry.getEnlistmentAddressByIndex, idxRange - i);
            tenantIndicesMappingEstimations.push(mapping.gasEstimation);
            tenantEnlistmentAddresses.push(mapping.output);
        }
    }

    // another composite step with N + 1 calls to map the registry enlistment references to actual data as requested by the actor
    let tenantEnlistmentMappingEstimations = [];
    for (let i = 0; i < tenantEnlistmentAddresses.length; i++) {
        const enlistmentToBeMapped = await ETC.at(tenantEnlistmentAddresses[i]);
        const mapping = await makeCallAndEstimateGas(enlistmentToBeMapped.getEnlistment);
        tenantEnlistmentMappingEstimations.push(mapping.gasEstimation);
    }
    appendResult(11, [tenantEnlistmentsGasEstimate, tenantIndicesMappingEstimations, tenantEnlistmentMappingEstimations]);
};

const step12 = async (enlistment) => {
    /* data retrieval divided between multiple requests required due to the abundancy of struct values to avoid "Stack too deep, try removing local variables" error */
    const stepTenantEmail = scenarioTenancyAgreementData.tenantEmail;
    const tenancyAgreementParticipantsInit = await makeCallAndEstimateGas(enlistment.getAgreementParticipants, stepTenantEmail);
    const tenancyAgreementDetailsInit = await makeCallAndEstimateGas(enlistment.getAgreementDetails, stepTenantEmail);
    const tenancyAgreementHashesInit = await makeCallAndEstimateGas(enlistment.getAgreementHashes, stepTenantEmail);
    const tenancyAgreementStatusInit = await makeCallAndEstimateGas(enlistment.getAgreementStatus, stepTenantEmail);
    appendResult(12, [tenancyAgreementParticipantsInit.gasEstimation, tenancyAgreementDetailsInit.gasEstimation, tenancyAgreementHashesInit.gasEstimation, tenancyAgreementStatusInit.gasEstimation]);
};

const step13 = async (enlistment) => {
    const acceptAgreementGasUsed = await sendTxAndGetGasUsed(enlistment.reviewAgreement, scenarioTenancyAgreementData.tenantEmail, true);
    appendResult(13, [acceptAgreementGasUsed]);
};

const step14 = async (enlistment) => {
    const landlordSignAgreementGasUsed = await sendTxAndGetGasUsed(enlistment.landlordSignAgreement, scenarioTenancyAgreementData.tenantEmail, scenarioTenancyAgreementData.landlordSignature);
    appendResult(14, [landlordSignAgreementGasUsed]);
};

const step15 = async (enlistment) => {
    const tenantSignAgreementGasUsed = await sendTxAndGetGasUsed(enlistment.tenantSignAgreement, scenarioTenancyAgreementData.tenantEmail, scenarioTenancyAgreementData.tenantSignature);
    appendResult(15, [tenantSignAgreementGasUsed]);
};

const step16 = async (enlistment) => {
    const receiveFirstMonthRentGasUsed = await sendTxAndGetGasUsed(enlistment.receiveFirstMonthRent, scenarioTenancyAgreementData.tenantEmail);
    appendResult(16, [receiveFirstMonthRentGasUsed]);
};

var scenarioRunsForGas = [];
var scenarioRunsForRequestCount = [];
var scenarioRunForGas = [];
var scenarioRunForRequestCount = [];
var scenarioRunForTime = [];
var scenarioRunsForTime = [];

var stepRunningTimer = 0; // only add time from invocation of truffle call/tx wrapper to its result. reset after flushing results of a step

contract('Performance test', async ([owner]) => {

    contract('Singleton contract deployment - writes the results to ./out/deployment-gas.csv', async ([deployerAddress]) => {

        let trigonometryGasUsed;
        let geodistanceGasUsed;
        let registryGasUsed;
        let enlistmentGasUsed;

        after(() => {
            if (enlistmentGasUsed) { // only write results when the test was actually executed (mocha's 'xit' still execudes 'before' and 'after' blocks)
                const headerRow = 'trigonometry,geodistance,enlistmentregistry,enlistment';
                const filePath = path.resolve(__dirname, 'out/deployment-gas.csv');
                scenarioResultsToCsv([[trigonometryGasUsed, geodistanceGasUsed, registryGasUsed, enlistmentGasUsed]], filePath, headerRow);
            }
        });

        it('should measure deployment', async () => {

            const enlistmentInit = await createContractAndGetRefAndGasUsed(ETC.new, scenarioEnlistmentData.landlordEmail, scenarioEnlistmentData.landlordName, scenarioEnlistmentData.streetName, scenarioEnlistmentData.floorNr, scenarioEnlistmentData.apartmentNr, scenarioEnlistmentData.houseNr, scenarioEnlistmentData.postalCode, scenarioEnlistmentData.lat, scenarioEnlistmentData.lng, scenarioEnlistmentData.detilsJson);
            const enlistment = enlistmentInit.ref;
            enlistmentGasUsed = enlistmentInit.gasUsed;

            const trigonometryInit = await createContractAndGetRefAndGasUsed(T.new);
            const trigonometry = trigonometryInit.ref;
            trigonometryGasUsed = trigonometryInit.gasUsed;

            const geodistanceInit = await createContractAndGetRefAndGasUsed(GD.new);
            const geodistance = geodistanceInit.ref;
            geodistanceGasUsed = geodistanceInit.gasUsed;

            const registryInit = await createContractAndGetRefAndGasUsed(ER.new);
            const registry = registryInit.ref;
            registryGasUsed = registryInit.gasUsed;

            if (LOG_TO_OUTPUT) {
                console.log('Trigonometry deployment gas used:', trigonometryGasUsed);
                console.log('GeoDistance deployment gas used:', geodistanceGasUsed);
                console.log('EnlistmentRegistry deployment gas used:', registryGasUsed);
            }
        });



    });

    contract('Sending consequtive offers - writes results to .out/offer-gas.csv', async () => {
        let registry;
        let gasResults = [];

        before(async () => {
            registry = await ER.new();
        });

        after(() => {
            if (gasResults.length > 0) { // only write results when the test was actually executed and not skipped
                const headerRow = 'offer1gas,offer2gas,offer3gas,offer4gas,offer5gas';
                const filePath = path.resolve(__dirname, 'out/offer-gas.csv');
                scenarioResultsToCsv([gasResults], filePath, headerRow); // to reuse the csv writer, just save the data in one row
            }
        });

        it('should measure cost for sending 5 consequtive offers', async () => {
            const enlistment = await ETC.new(scenarioEnlistmentData.landlordEmail, scenarioEnlistmentData.landlordName, scenarioEnlistmentData.streetName, scenarioEnlistmentData.floorNr, scenarioEnlistmentData.apartmentNr, scenarioEnlistmentData.houseNr, scenarioEnlistmentData.postalCode, scenarioEnlistmentData.lat, scenarioEnlistmentData.lng, scenarioEnlistmentData.detilsJson);
            const gas1 = await sendTxAndGetGasUsed(enlistment.sendOffer, scenarioOfferData.amount, scenarioOfferData.tenantName, scenarioOfferData.tenantEmail + '0');
            const gas2 = await sendTxAndGetGasUsed(enlistment.sendOffer, scenarioOfferData.amount, scenarioOfferData.tenantName, scenarioOfferData.tenantEmail + '1');
            const gas3 = await sendTxAndGetGasUsed(enlistment.sendOffer, scenarioOfferData.amount, scenarioOfferData.tenantName, scenarioOfferData.tenantEmail + '2');
            const gas4 = await sendTxAndGetGasUsed(enlistment.sendOffer, scenarioOfferData.amount, scenarioOfferData.tenantName, scenarioOfferData.tenantEmail + '3');
            const gas5 = await sendTxAndGetGasUsed(enlistment.sendOffer, scenarioOfferData.amount, scenarioOfferData.tenantName, scenarioOfferData.tenantEmail + '4');
            gasResults = [gas1, gas2, gas3, gas4, gas5];
            if (LOG_TO_OUTPUT) {
                console.log('Prices of the offer sending txs in the order they were sent:', gasResults);
            }
        });



    });

    contract('Scenario to run 64 iterations of the happy path flow of 16 steps with arbitrary amount of data previously stored in the smart contract - ' + (GEOSEARCH_EXCLUSIVE ?'(with locations outside of the geosearch query in step 3) - writes results to ./out/geosearch-exclusive-scenario-gas.csv & ./out/geosearch-exclusive-scenario-requests.csv & ./out/geosearch-exclusive scenario-timer.csv' :  'writes results to ./out/scenario-gas.csv & ./out/scenario-requests.csv & ./out/scenario-timer.csv'), async () => {

        let registry;

        before(async () => {
            scenarioRunsForGas = [];
            scenarioRunsForRequestCount = [];
            scenarioRunForGas = [];
            scenarioRunForRequestCount = [];
            scenarioRunForTime = [];
            scenarioRunsForTime = [];
        });

        after(async () => {
            if (scenarioRunsForGas.length > 0) { // only write results when the test was actually executed (mocha's 'xit' still execudes 'before' and 'after' blocks)
                const headerRow = 'step1,step2,step3,step4,step5,step6,step7,step8,step9,step10,step11,step12,step13,step14,step15,step16';
                const gasFilePath = path.resolve(__dirname, 'out/' + (GEOSEARCH_EXCLUSIVE ? 'geosearch-exclusive-': '') + 'scenario-gas.csv');
                scenarioResultsToCsv(scenarioRunsForGas, gasFilePath, headerRow);
                const requestCounterFilePath = path.resolve(__dirname, 'out/' + (GEOSEARCH_EXCLUSIVE ? 'geosearch-exclusive-': '') + 'scenario-requests.csv');
                scenarioResultsToCsv(scenarioRunsForRequestCount, requestCounterFilePath, headerRow);
                const timerFilePath = path.resolve(__dirname, 'out/' + (GEOSEARCH_EXCLUSIVE ? 'geosearch-exclusive-': '') + 'scenario-timer.csv');
                scenarioResultsToCsv(scenarioRunsForTime, timerFilePath, headerRow);
            }
        });

        for (let run = 0; run < RUNS; run++) {
            it('Scenario run with ' + run + ' enlistments previously stored in the registry, each of which has 3 offers', async () => {


                const registry = await ER.new();

                // populate registry with mock enlistments each of which has 3 offers as the scenario requires
                await populateEnlistments(registry, run);

                /*** 1.	An enlistment is deployed and added to the registry of published resources. ***/
                const enlistment = await step1(registry);

                // populate with 3 mock offers as the scenario requires
                await populateOffers(enlistment);

                /*** 2.	Tenant retrieves all published enlistments. ***/
                await step2(registry);

                /*** 3. Tenant runs a geographic approximity search. ***/
                await step3(registry);

                /*** 4. Tenant requests the enlistment data. ***/
                await step4(enlistment);

                /*** 5.	Tenant places an offer. ***/
                await step5(enlistment);

                /*** 6.	Landlord queries for his enlistments. ***/
                await step6(registry);

                /*** 7. Landlord queries all offers for an enlistment. ***/
                await step7(enlistment);

                /*** 8.	Landlord retrieves one offer. ***/
                await step8(enlistment);

                /*** 9. Landlord accepts the offer. ***/
                await step9(enlistment);

                /*** 10. Landlord issues a tenancy agreement. ***/
                await step10(enlistment);

                /*** 11. Tenant queries for the enlistments that he has bid on. ***/
                await step11(registry);

                /*** 12. Tenant retrieves a tenancy agreement. ***/
                await step12(enlistment);

                /*** 13.Tenant accepts the tenancy agreement. ***/
                await step13(enlistment);

                /*** 14. Landlord signs the agreement. ***/
                await step14(enlistment);

                /*** 15. Tenant signs the agreement. ***/
                await step15(enlistment);

                /*** 16. Tenant sends the first month rent. ***/
                await step16(enlistment);

                // collect intermediate test data
                scenarioRunsForGas.push(scenarioRunForGas);
                scenarioRunsForRequestCount.push(scenarioRunForRequestCount);
                scenarioRunsForTime.push(scenarioRunForTime);
                // clean up for the next iteration
                scenarioRunForGas = [];
                scenarioRunForRequestCount = [];
                scenarioRunForTime = [];
            });
        }

    });

});