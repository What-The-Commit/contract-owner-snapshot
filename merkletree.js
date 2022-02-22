import {MerkleTree} from "merkletreejs";
import keccak256 from "keccak256";
import {solidityKeccak256} from "ethers/lib/utils.js";
import filesystem from "fs";

const allowlistSpots = [];
const file = process.argv[2];

console.log(file);
const fileJson = JSON.parse(filesystem.readFileSync(file));

allowlistSpots.push(...fileJson);

const leafNodes = allowlistSpots.map(function (allowlist) {
    return Buffer.from(
        // Hash in appropriate Merkle format
        solidityKeccak256(["address", "uint256"], [allowlist.address, allowlist.amount]).slice(2),
        "hex"
    );
});

const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
const merkleRoot = merkleTree.getRoot().toString('hex');

filesystem.writeFileSync('merkletree.txt', 'Root hash: ' + merkleRoot + '\n\n' + merkleTree.toString());