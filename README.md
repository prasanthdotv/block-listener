# Wallet/Event Listener (For Ethereum)

## Prerequisites

- Install docker
- install docker compose

## Local Setup

- Clone repo
- Setup the DB
- Do `npm install` in **address-listener,** **update-balance** and **wallet-identifier**
- Rename file `sample.env` into `.env`
- Fill the missing values in the `.env` file
- **RECOMMENDED**: update the CURRENT_BLOCK value (put a resent block value from etherscan, otherwise it will start fetching from very old block)
- **TO START** run `docker-compose up -d`

### Connect Services Locally

The mongo db can be connected via **localhost** with port **27017** (can be changed from docker-compose file)

RabbitMQ can be connected locally via **localhost** with port **5672** (can be changed from docker-compose file)

RabbitMQ management UI can be accessed via **localhost: 15672** (can be changed from docker-compose file)

## Prod Setup

- Clone repo
- Setup the DB
- Do `npm install` in **address-listener,** **update-balance** and **wallet-identifier**
- Rename file `sample.env` into `.env`
- Fill the missing values in the `.env` file
- **TO START** run `docker-compose -f docker-compose.prod.yml up -d`
