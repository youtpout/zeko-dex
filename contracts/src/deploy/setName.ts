/**
 * This script can be used to interact with the Add contract, after deploying it.
 *
 * We call the update() method on the contract, create a proof and send it to the chain.
 * The endpoint that we interact with is read from your config.json.
 *
 * This simulates a user interacting with the zkApp from a browser, except that here, sending the transaction happens
 * from the script and we're using your pre-funded zkApp account to pay the transaction fee. In a real web app, the user's wallet
 * would send the transaction and pay the fee.
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with node:     `$ node build/src/deploy.js`.
 */
import fs from 'fs/promises';
import { AccountUpdate, Field, Mina, NetworkId, PrivateKey, PublicKey, UInt64 } from 'o1js';
import { SimpleToken, DexTokenHolder, offchainState, PoolManager } from '../index.js';
import { hashPairFunction } from '../PoolManager.js';

// check command line arg
let deployAlias = "pool-manager";
if (!deployAlias)
    throw Error(`Missing <deployAlias> argument.

Usage:
node build/src/addLiquidity.js
`);
Error.stackTraceLimit = 1000;
const DEFAULT_NETWORK_ID = 'zeko';

// parse config and private key from file
type Config = {
    deployAliases: Record<
        string,
        {
            networkId?: string;
            url: string;
            keyPath: string;
            fee: string;
            feepayerKeyPath: string;
            feepayerAlias: string;
        }
    >;
};
let configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
let config = configJson.deployAliases[deployAlias];
let feepayerKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
    await fs.readFile(config.feepayerKeyPath, 'utf8')
);

let zkAppKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
    await fs.readFile("keys/pool-manager.json", 'utf8')
);
let zkAppToken0Base58: { privateKey: string; publicKey: string } = JSON.parse(
    await fs.readFile("keys/token0.json", 'utf8')
);
let zkAppToken1Base58: { privateKey: string; publicKey: string } = JSON.parse(
    await fs.readFile("keys/token1.json", 'utf8')
);

let zkLiquidityBase58: { privateKey: string; publicKey: string } = JSON.parse(
    await fs.readFile("keys/liquidity.json", 'utf8')
);


let feepayerKey = PrivateKey.fromBase58(feepayerKeysBase58.privateKey);
let zkAppKey = PrivateKey.fromBase58(zkAppKeysBase58.privateKey);
let zkToken0PrivateKey = PrivateKey.fromBase58(zkAppToken0Base58.privateKey);
let zkToken1PrivateKey = PrivateKey.fromBase58(zkAppToken1Base58.privateKey);
let liquidityPrivateKey = PrivateKey.fromBase58(zkLiquidityBase58.privateKey);


// set up Mina instance and contract we interact with
const Network = Mina.Network({
    // We need to default to the testnet networkId if none is specified for this deploy alias in config.json
    // This is to ensure the backward compatibility.
    networkId: (config.networkId ?? DEFAULT_NETWORK_ID) as NetworkId,
    mina: config.url,
    archive: "https://api.minascan.io/archive/devnet/v1/graphql"
});
console.log("network", config.url);
// const Network = Mina.Network(config.url);
const fee = Number(config.fee) * 1e9; // in nanomina (1 billion = 1.0 mina)
Mina.setActiveInstance(Network);
let feepayerAddress = feepayerKey.toPublicKey();
let zkToken0Address = zkToken0PrivateKey.toPublicKey();
let zkToken0 = new SimpleToken(zkToken0Address);
let zkToken1Address = zkToken1PrivateKey.toPublicKey();
let zkToken1 = new SimpleToken(zkToken1Address);


// compile the contract to create prover keys
console.log('compile the contract...');
await SimpleToken.compile();

try {

    await mintToken();


} catch (err) {
    console.log(err);
}


async function mintToken() {
    // update transaction
    const txn = await Mina.transaction({ sender: feepayerAddress, fee }, async () => {
        AccountUpdate.fundNewAccount(feepayerAddress, 2);
        await zkToken0.mintTo(feepayerAddress, UInt64.from(1000 * 10 ** 9));
        await zkToken1.mintTo(feepayerAddress, UInt64.from(1000 * 10 ** 9));
    });
    await txn.prove();
    const sentTx = await txn.sign([feepayerKey, zkToken0PrivateKey, zkToken1PrivateKey]).send();

    // const txn2 = await Mina.transaction(feepayerAddress, async () => {
    //     AccountUpdate.fundNewAccount(feepayerAddress, 1);
    //     await zkToken1.mintTo(feepayerAddress, UInt64.from(1000 * 10 ** 9));
    // });
    // await txn2.prove();
    // const sentTx = await txn2.sign([feepayerKey, zkToken1PrivateKey]).send();

    if (sentTx.status === 'pending') {
        console.log(
            '\nSuccess! Update transaction sent.\n' +
            '\nYour smart contract state will be updated' +
            '\nas soon as the transaction is included in a block:' +
            `\n${getTxnUrl(config.url, sentTx.hash)}`
        );
    }
}


function getTxnUrl(graphQlUrl: string, txnHash: string | undefined) {
    const hostName = new URL(graphQlUrl).hostname;
    const txnBroadcastServiceName = hostName
        .split('.')
        .filter((item) => item === 'minascan')?.[0];
    const networkName = graphQlUrl
        .split('/')
        .filter((item) => item === 'mainnet' || item === 'devnet')?.[0];
    if (txnBroadcastServiceName && networkName) {
        return `https://minascan.io/${networkName}/tx/${txnHash}?type=zk-tx`;
    }
    return `Transaction hash: ${txnHash}`;
}
