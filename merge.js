import filesystem from "fs";

const mergedAllowlistSpots = [];
let key = '';

for (const file of filesystem.readdirSync('snapshots')) {
    if (file === '.gitkeep' || file === 'merged') {
        continue;
    }

    const snapshotData = filesystem.readFileSync('snapshots/' + file);
    const allowlistSpots = JSON.parse(snapshotData.toString());

    mergedAllowlistSpots.push(...allowlistSpots);
    key += '-' + file.replace('.json', '');
}

let uniqueAllowlistSpots = [];

for (const mergedAllowlistSpot of mergedAllowlistSpots) {
    const hasHigherAllocation = uniqueAllowlistSpots.findIndex(function (uniqueAllowlistSpot) {
       return uniqueAllowlistSpot.address === mergedAllowlistSpot.address && uniqueAllowlistSpot.amount > mergedAllowlistSpot.amount;
    });

    if (hasHigherAllocation !== -1) { // address is already listed with a higher allocation
        continue;
    }

    uniqueAllowlistSpots.push(mergedAllowlistSpot);
}

filesystem.writeFileSync('snapshots/merged/' + Date.now().toString() + '_' + key + '.json', JSON.stringify(uniqueAllowlistSpots));