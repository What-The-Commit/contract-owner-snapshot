# How to use
First copy .env.example and fill it.

For ETHERS_JSON_RPC_PROVIDER see https://docs.ethers.io/v5/api/providers/

I recommend using moralis.io

RATELIMIT depends on the request/sec of your JSON RPC Provider.

Default ABI looks like this:
```javascript
[
    'function totalSupply() external view returns (uint256)',
    'function ownerOf(uint256 tokenId) external view returns (address owner)',
]
```

You can provide your own abi in the .env file like this,
which will be split by **-**
```env
CONTRACT_ABI="function yourTotalSupply() external view returns (uint256)-function yourOwnerOf(uint256 tokenId) external view returns (address owner)"
CONTRACT_TOTAL_SUPPLY="yourTotalSupply"
CONTRACT_OWNER_OF="yourOwnerOf"
```

This command will generate a contract-address.json file in snapshots
```bash
node index.js "contract address"
```
Running this command will generate a merkletree.txt in the root directory,
of all json files in snapshots
```bash
node merkletree.js
```
