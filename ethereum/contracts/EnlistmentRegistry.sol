pragma solidity ^0.4.18;

import "./Trigonometry.sol";

interface Enlistment {
    function getCoords() view external returns(int, int);
    function getOfferAuthorsLength() view external returns (uint);
}

contract EnlistmentRegistry {

    address[] enlistments;
    address owner;
    
    uint16 constant ANGLES_IN_CYCLE = 16384;
    int32 constant FULL_CYCLE_DEGREES = 360000000; // compensates 6 decimal points for coordinates
    int constant AMPLITUDE = 32767;
    uint24 constant EQUATOR_LNG_DEG_LEN = 110250; // distance of 1 degree of longitude on the equator in metres

    function EnlistmentRegistry() public {
        owner = msg.sender;
    }

    function addEnlistment(address enlistmentAddress) payable public {
        enlistments.push(enlistmentAddress);
    }
    
    function degreesToIntAngle(int degrees) pure public returns(uint16) {
        return uint16(degrees * ANGLES_IN_CYCLE / FULL_CYCLE_DEGREES);
    }

    function distance(int lat1, int lng1, int lat2, int lng2) pure public returns(uint) {
        int dLat = lat1 - lat2;
        int adjustedDLng = (lng1 - lng2) * Trigonometry.cos(degreesToIntAngle(lat2)) / AMPLITUDE;
        return EQUATOR_LNG_DEG_LEN * sqrt(uint(dLat * dLat) + uint(adjustedDLng * adjustedDLng));
    }

    function sqrt(uint x) pure private returns (uint y) {
        uint z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    
    function calculateCos(int degrees) pure public returns(int) {
        return Trigonometry.cos(degreesToIntAngle(degrees));
    }

    function cosDirect(uint16 degrees) pure public returns(int) {
        return Trigonometry.cos(degrees);
    }

    function getEnlistmentsForGeosearch() view public returns (address[], bytes9[]) {
        bytes9[] memory geohashes = new bytes9[](enlistments.length);
        for (uint i = 0; i < enlistments.length; i++) {
            Enlistment enlistmentContractInstance = Enlistment(enlistments[i]);
            //geohashes[i] = enlistmentContractInstance.getGeohash();
        }
        return (enlistments, geohashes);
    }

    function getEnlistmentsForBidderFiltering() view public returns(address[], uint[]) {
        uint[] memory offerCounts = new uint[](enlistments.length);
        for (uint i = 0; i < enlistments.length; i++) {
            Enlistment enlistmentContractInstance = Enlistment(enlistments[i]);
            offerCounts[i] = enlistmentContractInstance.getOfferAuthorsLength();
        }
        return (enlistments, offerCounts);
    }

    function getEnlistments() view public ownerOnly() returns(address[]) {
        return enlistments;
    }

    function getOwner() view public returns (address) {
        return owner;
    }

    modifier ownerOnly() {
        require(msg.sender == owner);
        _;
    }

}
