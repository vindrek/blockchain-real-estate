pragma solidity ^0.4.18;

interface Enlistment {
    function getCoords() view external returns(int32, int32);
    function hasBid(string tenantEmail) view external returns (bool);
    function getLandlordEmailKeccak256() view external returns(bytes32);
}

import "./GeoDistance.sol";

// TODO: should guard for duplicates

contract EnlistmentRegistry {

    address[] enlistments;
    address owner;

    function EnlistmentRegistry() public {
        owner = msg.sender;
    }

    function addEnlistment(address enlistmentAddress) payable public ownerOnly() {
        enlistments.push(enlistmentAddress);
    }

    function getEnlistmentAddressByIndex(uint idx) view public returns (address addr) {
        return enlistments[idx];
    }

    function geosearch(int lat, int lng, uint searchRadius) view public returns (uint result) {
        result = 0;
        for (uint i = 0; i < enlistments.length; i++) {
            var (enlistmentLat, enlistmentLng) = Enlistment(enlistments[i]).getCoords();
            if (GeoDistance.distance(lat, lng, enlistmentLat, enlistmentLng) < searchRadius) {
                result = result | 2 ** i;
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

    function getEnlistmentsByLandlord(string landlordEmail) view public returns(address[]) {
        address[] memory result = new address[](enlistments.length);
        for (uint i = 0; i < enlistments.length; i++) {
            var en = enlistments[i];
            Enlistment enlistmentContractInstance = Enlistment(en);
            if (keccak256(landlordEmail) == enlistmentContractInstance.getLandlordEmailKeccak256()) {
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

    modifier indexInRange(uint index) {
        require(enlistments.length > index);
        _;
    }

}
