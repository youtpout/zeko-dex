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
let zkAppAddress = zkAppKey.toPublicKey();
let zkApp = new PoolManager(zkAppAddress);
let zkToken0Address = zkToken0PrivateKey.toPublicKey();
let zkToken0 = new SimpleToken(zkToken0Address);
let zkToken1Address = zkToken1PrivateKey.toPublicKey();
let zkToken1 = new SimpleToken(zkToken1Address);

offchainState.setContractInstance(zkApp);

let dexTokenHolder0 = new DexTokenHolder(zkAppAddress, zkToken0.deriveTokenId());
let dexTokenHolder1 = new DexTokenHolder(zkAppAddress, zkToken1.deriveTokenId());

// compile the contract to create prover keys
console.log('compile the contract...');
await offchainState.compile();
await SimpleToken.compile();
await DexTokenHolder.compile();
await PoolManager.compile();

try {

    let newAddress = await createPool(zkToken0Address, zkToken1Address);
    let hashPair = await hashPairFunction(zkToken0Address, zkToken1Address);

    console.log("newAddress", newAddress.toString());
    console.log("hashPair", hashPair.toString());

    // let proof = await offchainState.createSettlementProof();
    // const txn = await Mina.transaction(feepayerAddress, async () => {
    //     await zkApp.settle(proof);
    // });
    // await txn.prove();
    // await txn.sign([feepayerKey]).send();

    // await mintToken();


} catch (err) {
    console.log(err);
}

async function createPool(token0: PublicKey, token1: PublicKey): Promise<Field> {
    let newAddress = Field(0);
    console.log("feepayer", feepayerAddress.toBase58());
    console.log("token0", token0.toBase58());
    console.log("token1", token1.toBase58());
    console.log("newAccount", liquidityPrivateKey.toPublicKey().toBase58());

    // register pool
    const amount = 1e9;
    const txn0 = await Mina.transaction({ sender: feepayerAddress, fee }, async () => {
        AccountUpdate.fundNewAccount(feepayerAddress, 1);
        newAddress = await zkApp.createPool(liquidityPrivateKey.toPublicKey(), token0, token1);
    });
    console.log("send create pool");
    await txn0.prove();
    const sentTx = await txn0.sign([feepayerKey, liquidityPrivateKey]).send();
    console.log("send create pool");
    if (sentTx.status === 'pending') {
        console.log(
            '\nSuccess! Update transaction sent.\n' +
            '\nYour smart contract state will be updated' +
            '\nas soon as the transaction is included in a block:' +
            `\n${getTxnUrl(config.url, sentTx.hash)}`
        );
    }

    return newAddress;
}

async function mintToken() {
    // update transaction
    const txn = await Mina.transaction(feepayerAddress, async () => {
        AccountUpdate.fundNewAccount(feepayerAddress, 1);
        await zkToken0.mintTo(feepayerAddress, UInt64.from(1000 * 10 ** 9));
    });
    await txn.prove();
    await txn.sign([feepayerKey, zkToken0PrivateKey]).send();

    const txn2 = await Mina.transaction(feepayerAddress, async () => {
        AccountUpdate.fundNewAccount(feepayerAddress, 1);
        await zkToken1.mintTo(feepayerAddress, UInt64.from(1000 * 10 ** 9));
    });
    await txn2.prove();
    await txn2.sign([feepayerKey, zkToken1PrivateKey]).send();
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
