const GD = artifacts.require("GeoDistance");
const trig = require('../../api/utils/trigonometry');

contract('GeoDistance library', async ([owner]) => {

    let library;
    before(async () => {
        library = await GD.new();
    });

    // Uses exactly 6 decimal points for geographic coordinates representation
    // calculation of cosine uses look-up tables
    // on-chain fn implements euclidean distance based on equi­rectangular projec­tion 
    /*
     * accurate enough test: result difference with Haversine method must not be more than 1% of the distance radius provided by the user. Assumption: reasonable search distance radius input is considered to be in between 30m and 30km; latitude between 80...-80 (projection distortion gets worse near poles)
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
            const contractDistance = (await library.distance.call(points[0][0], points[0][1], points[1][0], points[1][1])) / 1e6; // response is in micrometres, convert it back
            const haversineDistance = trig.haversine({ lat: rawTestData[idx][0][0], lng: rawTestData[idx][0][1] }, { lat: rawTestData[idx][1][0], lng: rawTestData[idx][1][1] });
            const diff = Math.abs(contractDistance - haversineDistance);
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

});
