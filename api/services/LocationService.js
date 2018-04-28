'use strict';

const trig = require('../utils/trigonometry');
const ngeohash = require('ngeohash');
const log = require('../../server/logger');

/**
 * @param {number} distance - distance (km) from the point represented by centerPoint
 * @param {array} centerPoint - two-dimensional array containing center coords [latitude, longitude]
 * @description
 *   Computes the bounding coordinates of all points on the surface of a sphere
 *   that has a great circle distance to the point represented by the centerPoint
 *   argument that is less or equal to the distance argument.
 *   Technique from: Jan Matuschek <http://JanMatuschek.de/LatitudeLongitudeBoundingCoordinates>
 * @author Alex Salisbury (https://stackoverflow.com/a/25025590)
*/

const getBoundingBox = function(centerPoint, distance) {
    let MIN_LAT, MAX_LAT, MIN_LON, MAX_LON, R, radDist, degLat, degLon, radLat, radLon, minLat, maxLat, minLon, maxLon, deltaLon;
    if (distance < 0) {
        return 'Illegal arguments';
    }
    // helper functions (degrees<–>radians)
    Number.prototype.degToRad = function() {
        return this * (Math.PI / 180);
    };
    Number.prototype.radToDeg = function() {
        return (180 * this) / Math.PI;
    };
    // coordinate limits
    MIN_LAT = (-90).degToRad();
    MAX_LAT = (90).degToRad();
    MIN_LON = (-180).degToRad();
    MAX_LON = (180).degToRad();
    // Earth's radius (km)
    R = 6378.1;
    // angular distance in radians on a great circle
    radDist = distance / R;
    // center point coordinates (deg)
    degLat = centerPoint[0];
    degLon = centerPoint[1];
    // center point coordinates (rad)
    radLat = degLat.degToRad();
    radLon = degLon.degToRad();
    // minimum and maximum latitudes for given distance
    minLat = radLat - radDist;
    maxLat = radLat + radDist;
    // minimum and maximum longitudes for given distance
    minLon = void 0;
    maxLon = void 0;
    // define deltaLon to help determine min and max longitudes
    deltaLon = Math.asin(Math.sin(radDist) / Math.cos(radLat));
    if (minLat > MIN_LAT && maxLat < MAX_LAT) {
        minLon = radLon - deltaLon;
        maxLon = radLon + deltaLon;
        if (minLon < MIN_LON) {
            minLon = minLon + 2 * Math.PI;
        }
        if (maxLon > MAX_LON) {
            maxLon = maxLon - 2 * Math.PI;
        }
    }
    // a pole is within the given distance
    else {
        minLat = Math.max(minLat, MIN_LAT);
        maxLat = Math.min(maxLat, MAX_LAT);
        minLon = MIN_LON;
        maxLon = MAX_LON;
    }
    return [
        minLon.radToDeg(),
        minLat.radToDeg(),
        maxLon.radToDeg(),
        maxLat.radToDeg()
    ];
};

const findCommonPrefix = (nw, sw, se, ne) => {
    let commonPrefixLength = nw.length;
    [sw, se, ne].forEach((hash) => {
        for (let i = 0; i < commonPrefixLength; i++) {
            if (nw.charAt(i) !== hash.charAt(i)) {
                commonPrefixLength = i;
                break;
            }
        }
    });
    return nw.slice(0, commonPrefixLength);
};

const getBoundingBoxCommonPrefix = (lat, lng, distanceInKm) => {
    let minLat; let minLon; let maxLat; let maxLon;
    const boundingBoxCoords = getBoundingBox([lat, lng], distanceInKm / 1000);
    log.verbose('Bounding box for search radius: ', boundingBoxCoords);
    [minLon, minLat, maxLon, maxLat] = boundingBoxCoords;

    let nwHash = ngeohash.encode(maxLat, minLon);
    let swHash = ngeohash.encode(minLat, minLon);
    let seHash = ngeohash.encode(minLat, maxLon);
    let neHash = ngeohash.encode(maxLat, maxLon);

    log.verbose('Search radius bounding box respective geohashes: ', nwHash, swHash, seHash, neHash);

    return findCommonPrefix(nwHash, swHash, seHash, neHash);
};


/* Geohash prefix implementation:
  * 1. finds bounding box coordinates of the search radius
  * 2. encodes the found coordinates
  * 3. finds a common prefix of all bounding box corner geohashes to make a representation of the box itself
  * 4. finds minimum query bounding box to add accuracy by only including sub-boxes inside the MBR (instead of accepting any 32 characters as the next one to prefix, only specified ones are allowed)
  * 5. filters enlistments which geohash starts with the prefix (meaning, it's in the search radius bounding box)
  * Comments: reliability decreases gradually with distance parameter due to bounding box getting 32x bigger with each base32 hashstring character
*/
const filterInArea = (registryEnlistments, lat, lng, distanceInKm) => {
    const bbCommonPrefix = getBoundingBoxCommonPrefix(lat, lng, distanceInKm);
    log.verbose('Found common prefix for boundary box corners:', bbCommonPrefix);
    return registryEnlistments.filter(({ addr, geohash }) => geohash.startsWith(bbCommonPrefix));
};

/* Geohash all bounding boxes method implementation:
  * 1. finds bounding box coordinates of the search radius
  * 2. encodes the found coordinates
  * 3. retrieves all geohashes of specified length inside the boundary box
  * 4. filters enlistments by checking whether the enlistment address geohash is included in the set retrieved in the previous step
  * Comments: brute-force variant of the previous approach. Requires more memory and computations for operation. Pros: -
*/
const filterInArea2 = (registryEnlistments, lat, lng, distance) => {
    let minLat; let minLon; let maxLat; let maxLon;
    const boundingBoxCoords = getBoundingBox([lat, lng], distance / 1000); // convert to km
    [minLon, minLat, maxLon, maxLat] = boundingBoxCoords;

    const allGeohashesWithinBB = ngeohash.bboxes(minLat, minLon, maxLat, maxLon, 7); // accuracy of 7 characters, ~153m
    return registryEnlistments.filter(({ addr, geohash }) => allGeohashesWithinBB.indexOf(geohash.slice(0, 6)) !== -1);
};

/* Straight forward approach: filtering by spatial distance.
  * 1. decodes the geohash of the enlistment
  * 2. calculates distance of two points using Haversine formula
  * 3. checks if the distance is less than the one specified by user
  * Comments: the most flexible solution for user in terms of accuracy as there are no internal boxes involved.
  * Requires less resources. Accuracy is 9 characters, meaning +-5 metres of error
*/
const filterInArea3 = (registryEnlistments, lat, lng, distance) => {
    return registryEnlistments.filter(({ addr, geohash }) => {
        const enlistmentCoords = ngeohash.decode(geohash);
        const haversineDistance = trig.haversine({lat, lng}, {lat: enlistmentCoords.latitude, lng: enlistmentCoords.longitude}) * 1000; // convert to meters
        log.verbose('Haversine distance from input is:', haversineDistance, ' meters');
        return haversineDistance <= distance;
    });
};

module.exports = {
    filterInArea,
    filterInArea2,
    filterInArea3
};
