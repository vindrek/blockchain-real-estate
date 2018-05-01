pragma solidity ^0.4.18;

interface Enlistment {
    function getCoords() view external returns(int32, int32);
    function hasBid(string tenantEmail) view external returns (bool);
}

import "./GeoDistance.sol";

// TODO: should guard for duplicates

contract EnlistmentRegistry {

    address[] enlistments;
    address owner;

    function EnlistmentRegistry() public {
        owner = msg.sender;
    }

    function addEnlistment(address enlistmentAddress) payable public {
        enlistments.push(enlistmentAddress);
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
            if (GeoDistance.distance(lat, lng, enlistmentLat, enlistmentLng) < searchRadius) {
                result[i] = enlistments[i];
            }
        }
        return result;
    }

    function getEnlistmentsByBidder(string tenantEmail) view public returns(address[]) {
        address[] memory result = new address[](enlistments.length);
        for (uint i = 0; i < enlistments.length; i++) {
            var en = enlistments[i];
            Enlistment enlistmentContractInstance = Enlistment(en);
            if (enlistmentContractInstance.hasBid(tenantEmail)) {
                result[i] = en;
            }
        }
        return result;
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
