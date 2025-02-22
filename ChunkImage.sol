// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ChunkedImageStorage {
    address public owner;

    // store the entire compressed base64 image in chunks
    mapping(uint256 => mapping(uint256 => bytes)) public imageChunks;

    // keep track of the total number of chunks for each image
    mapping(uint256 => uint256) public totalChunks;

    // event to notify when a chunk is stored
    event ChunkStored(uint256 indexed imageId, uint256 indexed chunkId, uint256 chunkSize);

    constructor() {
        owner = msg.sender;
    }

    // owner only for now
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    /**
     * @notice Stores a chunk of compressed Base64 data.
     * @dev Forces sequential storage and prevents overwriting.
     * @param imageId The identifier for the image.
     * @param _dataChunk The chunk of image data to store.
     */
    function storeImageChunk(uint256 imageId, bytes memory _dataChunk) public onlyOwner {
        require(_dataChunk.length > 0, "Chunk cannot be empty");

        // sequential storage: new chunk's index must equal the current chunk count.
        uint256 expectedChunkId = totalChunks[imageId];
        require(imageChunks[imageId][expectedChunkId].length == 0, "Chunk already stored");

        // store the chunk
        imageChunks[imageId][expectedChunkId] = _dataChunk;

        // update the total chunk count
        totalChunks[imageId] = expectedChunkId + 1;

        emit ChunkStored(imageId, expectedChunkId, _dataChunk.length);
    }

    /**
     * @notice Retrieves the complete image by concatenating its chunks.
     * @dev Pre-allocates the output array for gas efficiency.
     * @param imageId The identifier for the image.
     * @return fullImage The reconstructed image as a byte array.
     */
    function getImage(uint256 imageId) public view returns (bytes memory) {
        uint256 count = totalChunks[imageId];
        require(count > 0, "Image does not exist");

        // calculate the total length of the image.
        uint256 totalLength = 0;
        for (uint256 i = 0; i < count; i++) {
            totalLength += imageChunks[imageId][i].length;
        }

        // pre-allocate a bytes array with the total length.
        bytes memory fullImage = new bytes(totalLength);
        uint256 offset = 0;

        // copy each chunk into the fullImage array.
        for (uint256 i = 0; i < count; i++) {
            bytes memory chunk = imageChunks[imageId][i];
            for (uint256 j = 0; j < chunk.length; j++) {
                fullImage[offset++] = chunk[j];
            }
        }
        return fullImage;
    }
}