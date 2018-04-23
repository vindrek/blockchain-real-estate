pragma solidity ^0.4.18;

interface Enlistment {
    function getGeohash() view external returns (bytes32);
    function hasBid(string tenantEmail) view external returns (bool);
}

contract EnlistmentRegistry {

    address[] enlistments;
    address owner;

    function EnlistmentRegistry() public {
        owner = msg.sender;
    }

    function addEnlistment(address enlistmentAddress) payable public ownerOnly() {
        enlistments.push(enlistmentAddress);
    }

    function getEnlistmentsForGeosearch() view public returns (address[], bytes32[]) {
        bytes32[] memory geohashes = new bytes32[](enlistments.length);
        for (uint i = 0; i < enlistments.length; i++) {
            Enlistment enlistmentContractInstance = Enlistment(enlistments[i]);
            geohashes[i] = enlistmentContractInstance.getGeohash();
        }
        return (enlistments, geohashes);
    }

    function getEnlistmentsForBidderFiltering(string bidderEmail) view public returns(address[], bool[]) {
        bool[] memory bids = new bool[](enlistments.length);
        for (uint i = 0; i < enlistments.length; i++) {
            Enlistment enlistmentContractInstance = Enlistment(enlistments[i]);
            bids[i] = enlistmentContractInstance.hasBid(bidderEmail);
        }
        return (enlistments, bids);
    }

    modifier ownerOnly() {
        require(msg.sender == owner);
        _;
    }

}
