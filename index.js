const express = require('express');
const ipfsClient = require('ipfs-http-client');
const bodyparser = require('body-parser');
const fileUpload = require('express-fileupload');

const path = require('path')
const fs = require('fs');
const ejs = require('ejs');

const ipfs = ipfsClient({host : 'localhost',port: '5001',protocol:'http'});

const app = express();
var crypto = require('crypto');
app.set('view engine','ejs');
const Web3 = require('web3');
app.set('views', path.join(__dirname, 'views'))
app.use(express.static(__dirname + '/public'));

app.use(bodyparser.urlencoded({extended: true}));
app.use(fileUpload());

app.use(express.json());
const contract = require("@truffle/contract");
const HashStorage = contract(require("./eth/build/contracts/HashStorage.json"));

const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:7545'));

const contractAddress = '0x12B1F78f4E54ad3EF78F58840389BDbD8539B415';


const hashStorageContract = new web3.eth.Contract(HashStorage.abi, contractAddress);


async function addFileToContract(fileHash, ipfsHash, fileName, fileType, dateAdded) {
  console.log('addFileToContract called');
  const accounts = await web3.eth.getAccounts();
  const ownerAccount = accounts[0]; // Assuming the first account is the contract owner
  const ipfsHashString = ipfsHash.toString();

  console.log('Sending transaction with data:');
  console.log('ipfsHashString:', ipfsHashString);
  console.log('fileHash:', fileHash);
  console.log('fileName:', fileName);
  console.log('fileType:', fileType);
  console.log('dateAdded:', dateAdded);
  console.log('from:', ownerAccount);

  const result = await hashStorageContract.methods.add(ipfsHashString, fileHash, fileName, fileType, dateAdded)
    .send({ from: ownerAccount, gasPrice: '1000000000', gas: 3000000 });

  console.log('Transaction result:', result);

  if (result.status) {
    console.log('addFileToContract successful\n');
  } else {
    console.error('addFileToContract failed\n');
  }
}



 


async function getFileFromContract(fileHash) {
  console.log('getFileFromContract called with fileHash:', fileHash);

  const fileData = await hashStorageContract.methods.get(fileHash).call({ gas: 3000000 });

  console.log('Raw fileData from contract:', fileData);

  // Check if the returned data has valid properties
  const fileExists = fileData && fileData.fileName && fileData.ipfsHash;

  return {
    ...fileData,
    exist: fileExists,
  };
}






app.get('/',(req,res)=>{
    res.render('home');
});
app.get('/drop',(req,res)=>{
    res.render('drop');
});
app.get('/file',(req,res)=>{
  res.render('file');
});


app.post('/login',(req,res)=>{
    res.render('login');
});
app.use(express.static(__dirname + '/views'));

app.post('/uploadFile', async (req, res) => {
  console.log('uploadFile called');
  const file = req.files.file;
  const fileName = req.body.fileName;
  const filePath = 'files/' + fileName;

  file.mv(filePath, async (err) => {
    if (err) {
      console.log("error: while uploading file");
      return res.status(500).send(err);
    }

    const ipfsHash = await addIpfsFile(fileName, filePath);
    const fileHash = ipfsHash.toString();
    console.log('fileHash:', fileHash);
    res.render('upload', { fileName, fileHash });
    await addFileToContract(fileHash, ipfsHash, fileName, file.mimetype, Date.now());
    
    fs.unlink(filePath, (err) => {
      if (err) console.log(err);
    })
    
    console.log('rendering upload page');
    res.render('upload', { fileName, fileHash });
  })
});





const addIpfsFile = async (fileName, filePath) => {
  // Read the original file directly from the filePath
  const fileBuffer = fs.readFileSync(filePath);

  // Add the original file to IPFS
  const fileAdded = await ipfs.add({ path: fileName, content: fileBuffer });

  const { cid } = fileAdded;
  return cid;
};



app.get('/getFile/:fileHash', async (req, res) => {
  const fileHash = req.params.fileHash;
  const fileData = await getFileFromContract(fileHash);

  if (fileData.exist) {
    res.render('file', {
      fileHash: fileData.fileHash,
      ipfsHash: fileData.ipfsHash,
      fileName: fileData.fileName,
      fileType: fileData.fileType,
      dateAdded: new Date(fileData.dateAdded * 1000).toLocaleString(),
    });
  } else {
    res.status(404).render('file', {fileData: {exist: false}});

  }
});
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


const terminalListener = async () => {
  rl.question('Please enter the file hash to display file metadata or type "exit" to quit: ', async (input) => {
    if (input === "exit") {
      rl.close();
    } else {
      const fileData = await getFileFromContract(input);
      if (fileData.exist) {
        console.log(`File metadata:`);
        console.log(`File hash: ${fileData.fileHash}`);
        console.log(`IPFS hash: ${fileData.ipfsHash}`);
        console.log(`File name: ${fileData.fileName}`);
        console.log(`File type: ${fileData.fileType}`);
        console.log(`Date added: ${new Date(fileData.dateAdded * 1000).toLocaleString()}`);
      } else {
        console.log(`No file found with file hash: ${input}`);
      }
      terminalListener(); // Call the listener again for continuous prompts
    }
  });
};
app.listen(3000, async () => {
  console.log('Server listening on port 3000');
  terminalListener();
});