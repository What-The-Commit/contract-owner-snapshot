import ethers from 'ethers';
import env from 'dotenv';
import {RateLimit} from "async-sema";
import filesystem from 'fs';

env.config();

const amount = parseInt(process.argv[2]);

const ethersProvider = new ethers.providers.JsonRpcProvider(process.env.ETHERS_JSON_RPC_PROVIDER);

const stakingContractAddress = '0x6ce31a42058F5496005b39272c21c576941DBfe9';
// collect all staked heroes
const stakingContract = new ethers.Contract(
    stakingContractAddress,
    ['event Staked(address indexed account, uint256[] tokenIds)', 'event Unstaked(address indexed account, uint256[] tokenIds)'],
    ethersProvider
);

const calls = [];

const stakingContractDeployedBlock = 13743917;

calls.push(ethersProvider.getLogs({...stakingContract.filters.Staked(),...{fromBlock:stakingContractDeployedBlock}}));
calls.push(ethersProvider.getLogs({...stakingContract.filters.Unstaked(),...{fromBlock:stakingContractDeployedBlock}}));

Promise.all(calls).then(async function (logs) {
    const mergedLogs = [...logs[0], ...logs[1]];
    mergedLogs.sort(function (logA, logB) {
        return logB.transactionIndex - logA.transactionIndex;
    });
    
    const parsedLogs = mergedLogs.map(function (rawLog) {
        return stakingContract.interface.parseLog(rawLog);
    });

    let walletAddresses = [];

    for (const parsedLog of parsedLogs) {
        const tokenIds = parsedLog.args['tokenIds'].map(function (tokenId) {
            return tokenId.toNumber();
        })

        if (parsedLog.name === 'Staked') {
            for (const tokenId of tokenIds) {
                walletAddresses.push(parsedLog.args['account'] + '-' + tokenId);
            }
        }

        if (parsedLog.name === 'Unstaked') {
            for (const tokenId of tokenIds) {
                walletAddresses.splice(walletAddresses.indexOf(parsedLog.args['account'] + '-' + tokenId), 1);
            }
        }
    }

    walletAddresses = walletAddresses.map(function (walletAddressWithTokenId) {
        return walletAddressWithTokenId.split('-')[0];
    })

    const uniqueStakedOwners = [...new Set(walletAddresses)];

    let contractAddress;

    // START STANDARD LOGIC
    try {
        contractAddress = ethers.utils.getAddress('0x6dc6001535e15b9def7b0f6A20a2111dFA9454E2');
    } catch (e) {
        console.error({message: 'Invalid contract address', contract: contractAddress});
        process.exit();
    }

    const contract = new ethers.Contract(
        contractAddress,
        ['function totalSupply() external view returns (uint256)', 'function ownerOf(uint256 tokenId) external view returns (address owner)'],
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

    console.log('Starting at ' + startingTokenId + ' Total supply: ' + totalSupply, 'debug');
    const rateLimit = RateLimit(process.env.RATELIMIT_MIN, {timeUnit: 60000, uniformDistribution: true});

    for (let i = startingTokenId; i < totalSupply; i++) {
        await rateLimit();
        let call = ownerOfFunction(i);

        call.catch(error => console.log(i, error));

        ownerCalls.push(call);
    }

    let owners = [];

    await Promise.all(ownerCalls)
        .then(function (_owners) {
            owners = _owners;
        });

    const allOwners = [...owners, ...uniqueStakedOwners];
    const allUniqueOwners = [...new Set(allOwners)];

    const allowlistSpots = [];

    for (const uniqueOwner of allUniqueOwners) {
        allowlistSpots.push({
            address: uniqueOwner,
            amount: amount
        });
    }

    console.log('Found ' + allUniqueOwners.length + ' unique owners ('+totalSupply+')', 'info');

    filesystem.writeFileSync('snapshots/' + Date.now().toString() + '_' + contractAddress + '.json', JSON.stringify(allowlistSpots));
});