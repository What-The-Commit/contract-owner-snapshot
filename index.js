import ethers from 'ethers';
import env from 'dotenv';
import {RateLimit} from "async-sema";
import filesystem from 'fs';

env.config();

function log(log, logLevel) {
    if (process.env.NODE_ENV === 'production' && logLevel !== 'debug') {
        console.log(log);
        return;
    }

    if (process.env.NODE_ENV === 'development') {
        if (logLevel === 'debug') {
            console.debug(log);
            return;
        }

        if (logLevel === 'info') {
            console.log(log);
        }
    }
}

const ethersProvider = new ethers.providers.JsonRpcProvider(process.env.ETHERS_JSON_RPC_PROVIDER);

let contractAddress = process.argv[2];
const amount = parseInt(process.argv[3]);

try {
    contractAddress = ethers.utils.getAddress(contractAddress);
} catch (e) {
    console.error({message: 'Invalid contract address', contract: contractAddress});
    process.exit();
}

const contract = new ethers.Contract(
    contractAddress,
    process.env.CONTRACT_ABI.split('-'),
    ethersProvider
);

const totalSupplyFunction = contract[process.env.CONTRACT_TOTAL_SUPPLY];
const ownerOfFunction = contract[process.env.CONTRACT_OWNER_OF];

const totalSupply = await totalSupplyFunction();

let startingTokenId = 0;

try {
    await ownerOfFunction(startingTokenId);
} catch (e) {
    try {
        startingTokenId += 1;
        await ownerOfFunction(startingTokenId);
    } catch (error) {
        console.error('Could not determine starting token id');
        process.exit();
    }
}

let ownerCalls = [];

const rateLimit = RateLimit(process.env.RATELIMIT_MIN, {timeUnit: 60000, uniformDistribution: true});

log('Starting at ' + startingTokenId + ' Total supply: ' + totalSupply, 'debug');

for (let i = startingTokenId; i < totalSupply; i++) {
    await rateLimit();

    let call = ownerOfFunction(i);

    call.then(function (owner) {
        log('Found owner ' + owner + ' for ' + i, 'debug');
    }).catch(error => console.error(error));

    ownerCalls.push(call);
}

let owners = [];

await Promise.all(ownerCalls)
    .then(function (_owners) {
        owners = _owners;
    });

const uniqueOwners = [...new Set(owners)];

log('Found ' + uniqueOwners.length + ' unique owners ('+totalSupply+')', 'info');

const allowlistSpots = [];

for (const uniqueOwner of uniqueOwners) {
    allowlistSpots.push({
        address: uniqueOwner,
        amount: amount
    });
}

filesystem.writeFileSync('snapshots/' + Date.now().toString() + '_' + contractAddress + '.json', JSON.stringify(allowlistSpots));

process.exit();