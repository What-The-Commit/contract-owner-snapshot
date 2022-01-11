# How to use
First copy .env.example and fill it.

For ETHERS_JSON_RPC_PROVIDER see https://docs.ethers.io/v5/api/providers/

I recommend using moralis.io

RATELIMIT depends on the request/sec of your JSON RPC Provider.
```bash
node index.js "contract address" > filename.txt
```
# Disclaimer
Currently, only works if your ABI looks like this:
```javascript
[
    'function totalSupply() external view returns (uint256)',
    'function ownerOf(uint256 tokenId) external view returns (address owner)',
]
```