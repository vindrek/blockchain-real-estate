pragma solidity ^0.4.18;
contract EnlistmentRegistry {

    Enlistment[] enlistments;
    address owner;

    function EnlistmentRegistry() public {
        owner = msg.sender;
    }

    function addEnlistment(string geohash, address enlistmentAddress) payable public ownerOnly() {
        enlistments.push(Enlistment(geohash, enlistmentAddress));
    }

    struct Enlistment {
        string geohash;
        address locationAddress;
    }

    modifier ownerOnly() {
        require(msg.sender == owner);
        _;
    }

}
