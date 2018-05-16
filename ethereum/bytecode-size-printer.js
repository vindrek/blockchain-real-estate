var fs = require('fs');

/* Code adapted from the implementation proposed by user Chet (https://ethereum.stackexchange.com/a/41502) */
function sizes(name) {
    var abi = JSON.parse(fs.readFileSync("build/contracts/" + name + ".json", 'utf8'));
    var size = (abi.bytecode.length / 2) - 1;
    var deployedSize = (abi.deployedBytecode.length / 2) - 1;
    return { name, size, deployedSize };
}

function fmt(obj) {
    return `${obj.name} constructor bytecode size: ${obj.size} ; deployed bytecode size: ${obj.deployedSize}`;
}

var l = fs.readdirSync("build/contracts");
l.forEach(function (f) {
    var name = f.replace(/.json/, '');
    var sz = sizes(name);
    console.log(fmt(sz));
});
