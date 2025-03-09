const { Web3 } = require('web3');
const BN = require('bn.js');
require('dotenv').config();

var web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER_URL))
const contractAddress = process.env.CONTRACT_ADDRESS;

const contractABI = process.env.CONTRACT_ABI;

const userAddress = process.env.USER_ADDRESS;
const privateKey = process.env.PRIVATE_KEY;

const contract = new web3.eth.Contract(contractABI, contractAddress);

const CHUNK_SIZE = process.env.CHUNK_SIZE || 2048;

async function storeImageInChunks(base64Data, imageId) {
    try {
        const numberOfChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
        console.log(`Total number of chunks: ${numberOfChunks}`);

        // Get the current nonce so that each txn uses the correct nonce
        let nonce = await web3.eth.getTransactionCount(userAddress, 'pending');

        let totalGasUsed;
        let BITotalGasUsed = BigInt(totalGasUsed);

        for (let i = 0; i < numberOfChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, base64Data.length);
            const base64Chunk = base64Data.slice(start, end);
        
            // Convert the base64 chunk to a hex string for bytes
            //console.log(web3.utils.utf8ToHex(base64Chunk))
            const hexChunk = web3.utils.utf8ToHex(base64Chunk);

            const maxPriorityFeePerGas = web3.utils.toWei('1', 'gwei');

            // Get the pending block to get the current base fee
            const block = await web3.eth.getBlock('pending');

            // Use BN to add fees
            const baseFeeBN = new BN(block.baseFeePerGas);
            const priorityFeeBN = new BN(maxPriorityFeePerGas);
            const maxFeePerGasBN = baseFeeBN.add(priorityFeeBN);

            const maxFeePerGas = maxFeePerGasBN.toString();
            
            // EIP-1559
            // Estimate gas for this txn
            const estimatedGas = await contract.methods.storeImageChunk(imageId, hexChunk).estimateGas({from: userAddress});
            
            const txObject = {
                from: userAddress,
                to: contractAddress,
                data: contract.methods.storeImageChunk(imageId, hexChunk).encodeABI(),
                gas: Number(BigInt(estimatedGas) * BigInt(120) / BigInt(100)), // 120% estimated gas
                maxFeePerGas: maxFeePerGas,
                maxPriorityFeePerGas: maxPriorityFeePerGas,
                nonce: nonce
            };
            // Time the txn
            const startTime = Date.now();
            
            // Send txn and measure time
            const txPromise = web3.eth.accounts.signTransaction(txObject, privateKey)
                .then(signedTx => web3.eth.sendSignedTransaction(signedTx.rawTransaction))
                .then(receipt => {
                    const endTime = Date.now();
                    const duration = (endTime - startTime) / 1000; // Convert to seconds
                    console.log(`chunk ${i + 1} stored successfully in ${duration}s. Tx Hash: ${receipt.transactionHash}`);
                    BITotalGasUsed += receipt.gasUsed;
                    return receipt;
                })
                .catch(txError => {
                    console.error(`Error processing chunk ${i + 1}/${numberOfChunks}:`, txError);
                    throw txError;
                });

            // batch of 10 txns 
            if (i % 10 === 9 || i === numberOfChunks - 1) {
                try {
                    await txPromise; // Wait for the current batch
                } catch (batchError) {
                    console.error("Error in transaction batch:", batchError);
                    break;
                }
            }
            nonce++;
            
        }
        console.log("All chunks processed." +
                    "\nTotal Gas Used: " +
                    BITotalGasUsed);
    } catch (error) {
        console.error("Error storing image chunks:", error);
    }
}

// example image thats ~65kb
const base64Data = process.env.BASE64_DATA;
const imageId = 11; 
storeImageInChunks(base64Data, imageId);
