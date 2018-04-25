pragma solidity ^0.4.18;

interface Enlistment {
    function getGeohash() view external returns (bytes9);
    function getOfferAuthorsLength() view external returns (uint);
}

contract EnlistmentRegistry {

    address[] enlistments;
    address owner;

    function EnlistmentRegistry() public {
        owner = msg.sender;
    }

    function addEnlistment(address enlistmentAddress) payable public {
        enlistments.push(enlistmentAddress);
    }

    function getEnlistmentsForGeosearch() view public returns (address[], bytes9[]) {
        bytes9[] memory geohashes = new bytes9[](enlistments.length);
        for (uint i = 0; i < enlistments.length; i++) {
            Enlistment enlistmentContractInstance = Enlistment(enlistments[i]);
            geohashes[i] = enlistmentContractInstance.getGeohash();
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
