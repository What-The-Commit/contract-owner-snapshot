import {MerkleTree} from "merkletreejs";
import keccak256 from "keccak256";
import filesystem from "fs";
import glob from 'glob';

let allowlistAddresses = [];

glob('snapshots/*.json', {}, function (error, files) {
    if (error !== null) {
        console.error(error);
        process.exit();
    }

    for (const file of files) {
        console.log(file);
        let fileJson = JSON.parse(filesystem.readFileSync(file));

        if (Array.isArray(fileJson) === false || fileJson.length === 0) {
            continue;
        }

        allowlistAddresses.push(...fileJson);
    }

    const leafNodes = allowlistAddresses.map(address => keccak256(address));
    const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
    const merkleRoot = merkleTree.getRoot().toString('hex');

    filesystem.writeFileSync('merkletree.txt', 'Root hash: ' + merkleRoot + '\n\n' + merkleTree.toString());
});