pragma solidity ^0.4.18;

import "./Trigonometry.sol";

interface Enlistment {
    function getCoords() view external returns(int32, int32);
    function getOfferAuthorsLength() view external returns (uint);
}

contract EnlistmentRegistry {

    address[] enlistments;
    address owner;
    
    uint16 constant ANGLES_IN_CYCLE = 16384;
    int32 constant FULL_CYCLE_DEGREES = 360000000; // compensates 6 decimal points for coordinates
    int16 constant AMPLITUDE = 32767;
    uint24 constant EQUATOR_LNG_DEG_LEN = 111319; // distance of 1 degree of longitude on the equator in metres

    function EnlistmentRegistry() public {
        owner = msg.sender;
    }

    function addEnlistment(address enlistmentAddress) payable public {
        enlistments.push(enlistmentAddress);
    }
    
    function degreesToIntAngle(int degrees) pure public returns(uint16) {
        return uint16(degrees * ANGLES_IN_CYCLE / FULL_CYCLE_DEGREES);
    }

    // public for tests only
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

    /* discontinued: bitmasking technique for filter result array indices does not work for registries bigger than 256+1 */
    /* function bitmask_geosearch(int lat, int lng, uint searchRadius) view public returns (uint result, uint startsWithNthBit) {
        result = 0;
        startsWithNthBit = 0;
        for (uint i = 0; i < enlistments.length; i++) {
            var (enlistmentLat, enlistmentLng) = Enlistment(enlistments[i]).getCoords();
            if (distance(lat, lng, enlistmentLat, enlistmentLng) < searchRadius) {
                if (result == 0) {
                    startsWithNthBit = i;
                    result = 1;
                } else {
                    result = result * 2 ** i;
                }
            }
        }
        return (result, startsWithNthBit);
    } */

    function geosearch(int lat, int lng, uint searchRadius) view public returns (address[]) {
        address[] memory result = new address[](enlistments.length);
        for (uint i = 0; i < enlistments.length; i++) {
            var (enlistmentLat, enlistmentLng) = Enlistment(enlistments[i]).getCoords();
            if (distance(lat, lng, enlistmentLat, enlistmentLng) < searchRadius) {
                result[i] = enlistments[i];
            }
        }

        return result;
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
