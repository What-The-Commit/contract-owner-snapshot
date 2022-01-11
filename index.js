import ethers from 'ethers';
import env from 'dotenv';
import {RateLimit} from "async-sema";

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

try {
    contractAddress = ethers.utils.getAddress(contractAddress);
} catch (e) {
    console.error({message: 'Invalid contract address', contract: contractAddress});
    process.exit();
}

const contract = new ethers.Contract(
    contractAddress,
    [
        'function totalSupply() external view returns (uint256)',
        'function ownerOf(uint256 tokenId) external view returns (address owner)',
    ],
    ethersProvider
);

const totalSupply = await contract.totalSupply();

let startingTokenId = 0;

try {
    await contract.ownerOf(startingTokenId);
} catch (e) {
    try {
        startingTokenId += 1;
        await contract.ownerOf(startingTokenId);
    } catch (error) {
        console.error('Could not determine starting token id');
        process.exit();
    }
}

let ownerCalls = [];

const rateLimit = RateLimit(process.env.RATELIMIT);

log('Starting at ' + startingTokenId + ' Total supply: ' + totalSupply, 'debug');

for (let i = startingTokenId; i < totalSupply; i++) {
    await rateLimit();

    let call = contract.ownerOf(i);

    call.then(function (owner) {
        log('Found owner ' + owner + ' for ' + i, 'debug');
    })

    ownerCalls.push(call);
}

let owners = [];

await Promise.all(ownerCalls)
    .then(function (_owners) {
        owners = _owners;
    });

const uniqueOwners = [...new Set(owners)];

log('Found ' + uniqueOwners.length + ' unique owners ('+totalSupply+')', 'info');

uniqueOwners.forEach(owner => log(owner, 'info'));

process.exit();