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

    function filterEnlistments(string squareMBR) public returns (address[]) {
        address[] result;
        bytes memory sBytes = bytes(squareMBR);

        for (uint i=0; i< enlistments.length; i++) {
            bytes memory eBytes = bytes(enlistments[i].geohash);
            bool valid = true;
            for (uint u=0; u< utfStringLength(squareMBR); u++) {
                if (sBytes[u] != eBytes[u]) {
                    valid = false;
                    break;
                }
            }
            if (valid) {
                result.push(enlistments[i].locationAddress);
            }
        }
    }

    struct Enlistment {
        string geohash;
        address locationAddress;
    }

    modifier ownerOnly() {
        require(msg.sender == owner);
        _;
    }

    // from https://ethereum.stackexchange.com/questions/13862/is-it-possible-to-check-string-variables-length-inside-the-contract/13886
    function utfStringLength(string str) constant private
    returns (uint length)
    {
        uint i=0;
        bytes memory string_rep = bytes(str);

        while (i<string_rep.length)
        {
            if (string_rep[i]>>7==0)
                i+=1;
            else if (string_rep[i]>>5==0x6)
                i+=2;
            else if (string_rep[i]>>4==0xE)
                i+=3;
            else if (string_rep[i]>>3==0x1E)
                i+=4;
            else
                //For safety
                i+=1;

            length++;
        }
    }

}
