const { Web3 } = require('web3');
const BN = require('bn.js');

var web3 = new Web3(new Web3.providers.HttpProvider(''))
const contractAddress = ""; 

const contractABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"imageId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"chunkId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"chunkSize","type":"uint256"}],"name":"ChunkStored","type":"event"},{"inputs":[{"internalType":"uint256","name":"imageId","type":"uint256"}],"name":"getImage","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"imageChunks","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"imageId","type":"uint256"},{"internalType":"bytes","name":"_dataChunk","type":"bytes"}],"name":"storeImageChunk","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"totalChunks","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];

const userAddress = ""; 
const privateKey = ""; 

const contract = new web3.eth.Contract(contractABI, contractAddress);

const CHUNK_SIZE = 2048; // 2KB per chunk

async function storeImageInChunks(base64Data, imageId) {
    try {
        const numberOfChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
        console.log(`Total number of chunks: ${numberOfChunks}`);

        // Get the current nonce so that each transaction uses the correct nonce
        let nonce = await web3.eth.getTransactionCount(userAddress, 'pending');

        for (let i = 0; i < numberOfChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, base64Data.length);
            const base64Chunk = base64Data.slice(start, end);
        
            // Convert the base64 chunk to a hex string for bytes
            console.log(web3.utils.utf8ToHex(base64Chunk))
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
            const txObject = {
                from: userAddress,
                to: contractAddress,
                data: contract.methods.storeImageChunk(imageId, hexChunk).encodeABI(),
                gas: 2000000,
                maxFeePerGas: maxFeePerGas,
                maxPriorityFeePerGas: maxPriorityFeePerGas,
                nonce: nonce
            };

            try {
                const signedTx = await web3.eth.accounts.signTransaction(txObject, privateKey);
                const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
                console.log(`stored successfully. Tx Hash: ${receipt.transactionHash}`);
                nonce++; // Increment nonce for the next txn
            } catch (txError) {
                console.error(`/${numberOfChunks}:`, txError);
                break; 
            }
        }

        console.log("All chunks processed.");
    } catch (error) {
        console.error("Error storing image chunks:", error);
    }
}

const base64Data = ""
const imageId = 50; 
storeImageInChunks(base64Data, imageId);
