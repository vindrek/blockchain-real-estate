'use strict';

const DataTypes = require('sequelize/lib/data-types');
const Status = require('./enums/PropertyEnlistmentStatus');
const PropertyType = require('./enums/PropertyType');
const RentalType = require('./enums/RentalType');
const FurnitureType = require('./enums/FurnitureType');
const moment = require('moment');

module.exports = (sequelize) => {
  const PropertyEnlistment = sequelize.define('property_enlistments', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    landlordEmail: {
      type: DataTypes.STRING,
      allowNull: false
    },
    landlordName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    streetName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    house: {
      type: DataTypes.STRING,
      allowNull: false
    },
    floor: {
      type: DataTypes.INTEGER
    },
    apartment: {
      type: DataTypes.STRING,
      allowNull: false
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: false
    },
    propertyType: {
      type: DataTypes.ENUM,
      values: [PropertyType.PRIVATE_APARTMENT, PropertyType.HDB, PropertyType.LANDED],
      allowNull: false
    },
    rentalType: {
      type: DataTypes.ENUM,
      values: [RentalType.UNIT, RentalType.ROOM],
      allowNull: false
    },
    availableFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      get: function() {
        return moment.utc(this.getDataValue('availableFrom')).format('YYYY-MM-DD');
      }
    },
    availableUntil: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      get: function() {
        return moment.utc(this.getDataValue('availableUntil')).format('YYYY-MM-DD');
      }
    },
    nrOfBedrooms: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    nrOfBathrooms: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    minPrice: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    floorSize: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    furniture: {
      type: DataTypes.ARRAY(DataTypes.ENUM( // eslint-disable-line new-cap
        FurnitureType.BATHTUB, FurnitureType.FRIDGE, FurnitureType.AIRCONDITIONING,
        FurnitureType.WASHER, FurnitureType.CLOSET, FurnitureType.BED, FurnitureType.TV,
        FurnitureType.DISH_WASHER, FurnitureType.DINING_SET,
        FurnitureType.DRYER, FurnitureType.OVEN, FurnitureType.SOFA, FurnitureType.STOVE)),
      allowNull: true
    },
    photos: {
      type: DataTypes.ARRAY(DataTypes.STRING), // eslint-disable-line new-cap
      allowNull: false
    },
    contractAddress: {
      type: DataTypes.STRING
    },
    status: {
      type: DataTypes.ENUM,
      values: [Status.PENDING, Status.APPROVED, Status.REJECTED, Status.CANCELLED],
      defaultValue: Status.PENDING
    },
    geolocation: DataTypes.GEOMETRY('POINT'), // eslint-disable-line new-cap
    offerAuthors: DataTypes.ARRAY(DataTypes.TEXT) // eslint-disable-line new-cap
  }, {
    freezeTableName: true
  });

  PropertyEnlistment.prototype.approve = function() {
    this.status = Status.APPROVED;
  };

  PropertyEnlistment.prototype.reject = function() {
    this.status = Status.REJECTED;
  };

  PropertyEnlistment.prototype.addOfferAuthor = function(author) {
    this.offerAuthors = this.offerAuthors.concat(author);
  };

  PropertyEnlistment.prototype.toJSON = function() {
    let values = Object.assign({}, this.get());
    delete values.offerAuthors; // internal use only
    return values;
  };

  PropertyEnlistment.findInArea = function(latitude, longitude, distance) {
    const query = `
    SELECT
        *, ST_Distance_Sphere(ST_MakePoint(:latitude, :longitude), "geolocation") AS distance
    FROM
        "property_enlistments"
    WHERE
        status = '${Status.APPROVED}' AND
        ST_Distance_Sphere(ST_MakePoint(:latitude, :longitude), "geolocation") < :maxDistance
    `;

    return sequelize.query(query, {
      replacements: {
        latitude,
        longitude,
        maxDistance: distance
      },
      type: sequelize.QueryTypes.SELECT,
      model: PropertyEnlistment
    });
  };

  return PropertyEnlistment;
};
