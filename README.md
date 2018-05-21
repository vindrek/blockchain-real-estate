# Blockchain real-estate app - data migration variant

Proof of concept of a hybrid real-estate app with blockchain and Ethereum smart contracts. 

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

You need Node.js >= 8.0.0.

Install [Truffle](http://truffleframework.com/)

```
npm install -g truffle
```

Install [Ganache](http://truffleframework.com/ganache/) or [ganache-cli](https://github.com/trufflesuite/ganache-cli) to run local Ethereum blockchain.

```
npm install -g ganache-cli
```

### Installing

Clone the repo

```
git clone -b enlistment-filtering-on-chain https://github.com/vindrek/blockchain-real-estate.git
```

Install dependencies

```
npm install
```

### Database
We use [Sequelize](http://docs.sequelizejs.com/) for database manipulation.
Project is preconfigured to use PostgreSQL.
To connect to the database setup environmental variable **DATABASE_URL** in format:

```
DATABASE_URL = "postgres://<user>:<password>@<host>:<port>/<database_name>"
```

**IMPORTANT:** Postgres should have [POSTGIS](https://postgis.net/) extension installed.
And you should enable it in your database by running:

```sql
CREATE EXTENSION POSTGIS;
```

Database is automatically synchronized with Models definition.

### Setup

Before starting the app start local ethereum blockchain with Ganache. 
For this either open Ganache app or run:

```
npm run start:eth
```

NOTE: we use next mnemonic for development purposes, some configs are predefined.
```
candy maple cake sugar pudding cream honey rich smooth crumble sweet treat
```

Compile smart contracts.

```
cd ethereum/
truffle compile
```

Deploy the contracts onto your network of choice (default "development").
Check [Truffle docs](http://truffleframework.com/docs/) for details.

```
truffle migrate
```

### Run

Complete the setup and then run the server

```
npm start
```

### Performance test

Complete the setup and then run the performance test script. See the config for the scenario execution in /ethereum/test/performance.js
```
npm run test:performance
```

### Bytecode size

Complete the setup and then run the bytecode size evaluator by
```
npm run truffle:bytecode
```

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details



