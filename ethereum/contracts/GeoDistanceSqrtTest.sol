/**
 * Library to calculate distance between geographic latitude and longitude points using equi­rectangular projec­tion of the Earth
 *
 * The library exposes one public function which inputs latitude and longitude value with fixed recision of 6 decimal points, represented as integers. I.e. latitude between -90e6 and 90e6 and longitude between 180e6 and -180e6.
 *
 * As the performance is important on the blockchain, the library implements Pythagoras' theorem with an equi­rectangular projec­tion. In contrast to Haversine or the Law of Cosines method, the library function is light on trigonometric calculations. As a trade-off, the method may be introduce inaccuracies due to the distortions created by the simple projection.
 *
 * Square root function based on Babylonian method. Trigonometry library based on a sine lookup table.
 *
 * This is library is only designed to test the performance of using square root in the distance calculation vs returning a result on the power of 2
 * @author Indrek Värva
 */

pragma solidity ^0.4.18;

import "./Trigonometry.sol";

library GeoDistanceSqrtTest {

    uint16 constant ANGLES_IN_CYCLE = 16384; // number of angles in a circle to be used in the internal cosine calculation
    int32 constant FULL_CYCLE_DEGREES = 360000000; // compensates 6 decimal points for coordinates
    int16 constant AMPLITUDE = 32767; // projected amplitude of the internal cosine function

    /*
    * Distance of 1 degree of WGS 84 longitude on the Equator in metres
    * 
    * semi-major axis of the Earth on the Equator = 6378137 metres (http://epsg.io/7030-ellipsoid)
    * 
    * EQUATOR_LNG_DEG_LEN = circumference of the Earth on the Equator / 360 = semi-major axis * 2 * PI / 360 = 6378137 * 2 * PI / 360 = 111319
    * take the result to the power of 2 to avoid the necessity to use expensive square root function in the calculation of distance
    * 111319**2 = 12391919761
    */
    uint40 constant EQUATOR_LNG_DEG_LEN = 111319; 
    uint40 constant EQUATOR_LNG_DEG_LEN_POW_2 = 12391919761; 


    // Projects coordinates to integer angles
    function degreesToIntAngle(int degrees) pure internal returns(uint16) {
        return uint16(degrees * ANGLES_IN_CYCLE / FULL_CYCLE_DEGREES);
    }

    /*
     * @params 6 decimal point WSG 84 coordinades of 2 points encoded as integers
     * @return distance between locations in micrometres
    */
    function distance(int lat1, int lng1, int lat2, int lng2) pure public returns(uint) {
        int dLat = lat1 - lat2;
        int adjustedDLng = (lng1 - lng2) * Trigonometry.cos(degreesToIntAngle((lat1 + lat2) / 2)) / AMPLITUDE;
        return EQUATOR_LNG_DEG_LEN_POW_2 * (uint(dLat * dLat) + uint(adjustedDLng * adjustedDLng));
    }

    /*
     * @params 6 decimal point WSG 84 coordinades of 2 points encoded as integers
     * @return distance between locations in micrometres
    */
    function distanceSqrt(int lat1, int lng1, int lat2, int lng2) pure public returns(uint) {
        int dLat = lat1 - lat2;
        int adjustedDLng = (lng1 - lng2) * Trigonometry.cos(degreesToIntAngle((lat1 + lat2) / 2)) / AMPLITUDE;
        return EQUATOR_LNG_DEG_LEN_POW_2 * sqrt(uint(dLat * dLat) + uint(adjustedDLng * adjustedDLng));
    }
    /*
    * Implementation by chriseth (https://github.com/chriseth) posted in https://github.com/ethereum/dapp-bin/pull/50.
    */
    function sqrt(uint x) pure internal returns (uint y) {
        if (x == 0) return 0;
        else if (x <= 3) return 1;
        uint z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

}