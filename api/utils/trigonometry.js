'use strict';

const haversine = (p1, p2) => {
    const R = 6372.8;
    const phi1 = degreesToRadians(p1.lat);
    const phi2 = degreesToRadians(p2.lat);
    const deltaPhi = degreesToRadians(p2.lat - p1.lat);
    const deltaLambda = degreesToRadians(p2.lng - p1.lng);

    const d = 2 * Math.asin(
        Math.sqrt(Math.pow(Math.sin(deltaPhi / 2), 2) + Math.cos(phi1) * Math.cos(phi2) * Math.pow(Math.sin(deltaLambda / 2), 2)));
    return R * d;
};

const angleBits = 16;
const anglesPerCycle = 16384; // 1 << (angleBits - 2)
const amplitude = 32767; // (1 << (angleBits - 1)) - 1

const degreesToRadians = (x) => {
    return x / 180.0 * Math.PI;
};

const degreesToIntAngle = (degrees) => {
    return (((degrees * anglesPerCycle) / 360.0) | 0);
};

const radiansToIntAngle = (radians) => {
    return (radians * anglesPerCycle) / (2 * Math.PI);
};

const resultToFloat = (result) => {
    return (result * (1.0 / amplitude));
};

const floatToResult = (f) => {
    return ((f * amplitude) | 0);
};

const distance = (lat1, lng1, lat2, lng2) => {
    const deglen = 110250;
    const x = lat1 - lat2;
    const y = (lng1 - lng2) * Math.cos(degreesToRadians(lat2));
    return deglen * Math.sqrt(x * x + y * y);
};


module.exports = {
    degreesToRadians,
    haversine
};

