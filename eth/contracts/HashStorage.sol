// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21 <0.7.0;

contract HashStorage {
    struct File {
        string ipfsHash;
        string fileHash;
        string fileName;
        string fileType;
        uint256 dateAdded;
    }

    mapping(string => File) private files;

    function add(string memory ipfsHash, string memory fileHash, string memory fileName, string memory fileType, uint256 dateAdded) public {
        files[fileHash] = File(ipfsHash, fileHash, fileName, fileType, dateAdded);
    }

    function get(string memory fileHash) public view returns (string memory ipfsHash, string memory fileName, string memory fileType, uint256 dateAdded) {
        File storage file = files[fileHash];
        return (file.ipfsHash, file.fileName, file.fileType, file.dateAdded);
    }
}
