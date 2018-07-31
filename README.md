# Simple Cab API

Simple API to query local database with caching options. Written in javascript using Node.js

## Getting Started

The following instructions will get you a copy of the API up and running on your local machine...

### Prequisites

In order to run this API Node.js is required.

Install Node.js https://nodejs.org/en/ (LTS version)

Verify Node and NPM have been installed via running the below commands in terminal

```
node -v

npm -v
```

### Installation

From terminal

```
# Clone the repository
git clone https://github.com/jaortiz/simple-cab-api.git

# Go into the repository
cd simple-cab-api

# Install dependencies
npm install

# Start the API
npm start
```

## Consuming the API

There are 2 provided ways to access the API

1.  simple-cab-cli

```
# Start the API
npm start

# In a new terminal instance
npm run cli

# Follow the cli prompts
```

2.  Postman Scripts Collection

Install the postman api client https://www.getpostman.com/

Import the provided collection located in /postman-scripts.

Run any of the requests once the API has been started.
