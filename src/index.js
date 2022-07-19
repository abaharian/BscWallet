import express from 'express';
import bodyParser from 'body-parser'
import blockchainManager from "./centerpirme.js";
import cors from 'cors';
import Database from "./database.js";

import { createRequire } from "module";
import { error } from 'console';
const require = createRequire(import.meta.url);

const fs = require('fs');
const https = require('https');
const http = require('http');
const config = require('config');

/////////////////////////////////////////////////////////////////
/******************* All Configs Here *************************/
const confMasterPassword = config.get("masterPassword");
const dbconfig = config.get('dbconfig');
const messages = config.get("messages");
const blockchainConfig = config.get("blockchain");
const runningConfig = config.get("running");
const connectionConfig = config.get("connection");
const depositInterval = config.get("depositInterval");
const masterPassword = config.get("masterPassword");
const confABI = require('./bep20ABI.json');
const checkerFunction = isBep20Token;
////////////////////////////////////////////////////////////////


const chainManager = new blockchainManager(blockchainConfig.fullNodeAddress, confABI);
const database = new Database(dbconfig.host, dbconfig.port, dbconfig.username, dbconfig.password, dbconfig.database, messages.unknownError, blockchainConfig.name);
const app = express();
app.use(express.json());
app.use(cors())
app.use(bodyParser.json());

function syncTokenSymbol(symbol) {
  if (symbol.trim().toUpperCase() === "BTC")
    return "BTCB"
  return symbol.toUpperCase();

}

function isERC20Token(symbol) {
  switch (symbol.toUpperCase()) {
    case "ETH":
    case "SHIB":
    case "MANA":
    case "MATIC":
    case "AXS":
    case "ENJ":
    case "SAND":
    case "USDT":
    case "ATLAS":
    case "MVI":
    case "SOL":
    case "FTM":
    case "USDC":
    case "LUNA":
    case "LINK":
    case "UNI":
    case "GALA":
    case "AAVE":

      return true;
    default:
      return false;
  }
}

function isBep20Token(symbol) {
  switch (symbol.toUpperCase()) {
    case "BNB":
    case "BTCB":
    case "BUSD":
    case "CAKE":
    case "BAKE":
    case "SAFEMOON":
    case "BSCS":
    case "SXP":
    case "ALPHA":
    case "WBNB":
    case "BUX":
    case "BURGER":
    case "ALT":
    case "RACA":
    case "HERO":
    case "MBOX":
    case "YOOSHI":
    case "BTCST":
    case "ALPHA":
    case "BIFI":
    case "VBTC":
    case "SFUND":
    case "BSW":
    case "EPS":
    case "XVS":
    case "SFP":
    case "BSCPAD":
    case "ALPACA":
    case "ADA":
    case "AVAX":
    case "DOT":
    case "ATOM":
    case "NEAR":
    case "TRON":
    case "EGLD":
    case "FILE":
    case "MIOTA":
    case "ONE":
    case "TRX":
      return true;
    default:
      return false;
  }
}

app.get(runningConfig.apiCreateAddress, (req, res) => {
  res.json("it Works!");
});

app.post(runningConfig.apiCreateAddress, (req, res) => {
  try {
    console.log("[API POST] createAddress called: ");
    let connectPassword = req.body.Pass;
    if (!checkConnectionPassword(connectPassword)) {
      return res.json({
        "status": 400,
        "msg": messages.connectionPasswordError,
        "Address": ""
      });
    }
    let userId = req.body.Id;
    let symbol = req.body.Symbol;
    symbol = syncTokenSymbol(symbol);
    let blockchain = blockchainConfig.name;

    if (checkerFunction(symbol)) {
      database.writeNewOrCopyWallet(userId, symbol, blockchain, messages.hintNewAddress, chainManager, res, masterPassword)
    } else {
      res.json({
        "status": 401,
        "msg": confUnsupportedToken,
        "Address": ""
      });
    }
  } catch (e) {
    console.error("[Error]  Error in creating Address: \n" + e)
    res.json({
      "status": 401,
      "msg": blockchainConfig.nameError,
      "Address": ""
    });
  }
});

app.get(runningConfig.APIgetBalance, (req, res) => {
  res.json({ "getBalance": "it Works!" });
});

app.post(runningConfig.APIgetBalance, async function (req, res) {
  try {
    console.log("[API POST] getBalance called: ");
    const connectPassword = req.body.Pass;
    const address = req.body.Address;
    let token = req.body.Symbol;
    token = syncTokenSymbol(token);

    if (!checkConnectionPassword(connectPassword)) {
      return res.json({ "status": 400, msg: confConnectionPasswordError });
    }
    if (token == mainNetworkToken) {
      let balance = await chainManager.getMainTokenBalance(address)
      res.json({
        "status": 200,
        "msg": "",
        "Address": address,
        "balance": balance
      });

    } else if (checkerFunction(String(token).toUpperCase())) {
      const callbackfunc = async function (err, tokenContractAddress) {
        if (err) {
          res.json({
            "status": 401,
            "msg": confUnsupportedToken,
            "Address": address,
            "balance": ""
          });
        } else {
          let balance = await chainManager.getTokenBalance(tokenContractAddress, address)
          res.json({
            "status": 200,
            "msg": "",
            "Address": address,
            "balance": balance
          });
        }
      }
      database.getTokenContractAddress(token, blockchainConfig.name, callbackfunc);
    } else {
      res.json({
        "status": 401,
        "msg": confUnsupportedToken,
        "Address": address,
        "Balance": ""
      });
    }
  } catch (e) {
    console.error("Error in getBalance Address: \n" + e);
    res.json({
      "status": 401,
      "msg": messages.unknownError,
      "Address": address,
      "Balance": ""
    });
  }
});



async function sendMainCoin(toAddress, amount, masterKeystore, apires) {
  try {
    console.log("[FUNCTION] sendMainCoin called: ");
    let txHash = await chainManager.sendMainCoin(masterKeystore, confMasterPassword, toAddress, amount);
    console.log("\t[CODE] sent BNB to receiver Address. ");
    apires.json({
      "status": 200,
      "msg": "",
      "TransActionHash": txHash
    });
  } catch (e) {
    console.error("Error in send BNB Address: \n" + e);
    apires.json({
      "status": 401,
      "msg": messages.unknownError,
      "TransActionHash": ""
    });
  }
}

async function sendToken(tokenContractAddress, toAddress, amount, masterKeystore, apires) {
  try {
    console.log("[FUNCTION] send Token called: ");
    let txHash = await chainManager.sendToken(masterKeystore, confMasterPassword, tokenContractAddress, toAddress, parseFloat(amount));
    console.log("\t[CODE] sent Token to receiver Address. ");
    apires.json({
      "status": 200,
      "msg": "",
      "TransActionHash": txHash.transactionHash
    });
  } catch (e) {
    console.log(e);
    apires.json({
      "status": 401,
      "msg": messages.unknownError,
      "TransActionHash": ""
    });
  }
}

app.get(runningConfig.APIWithdraw, (req, res) => {
  res.json("it Works");
});
app.post(runningConfig.APIWithdraw, async function (req, res) {
  try {
    console.log("[API POST] withdraw called: ");
    let connectPassword = req.body.Pass;
    if (!checkConnectionPassword(connectPassword)) {
      return res.json({
        "status": 400,
        "msg": confConnectionPasswordError,
        "TransActionHash": ""
      });
    }
    const userId = req.body.Id;
    const toAddress = req.body.RecieverAddress;
    let symbol = req.body.Symbol;
    symbol = syncTokenSymbol(symbol);
    const amount = req.body.Amount;
    const fee = req.body.Fee;
    if (symbol.toUpperCase() == mainNetworkToken.toUpperCase()) {
      database.withdrawBNB(userId, res, toAddress, amount, fee, sendMainCoin);
    } else {
      database.withdrawToken(userId, res, symbol.toUpperCase(), toAddress, amount, fee, sendToken);
    }
  } catch (e) {
    console.log(e);
    res.json({
      "status": 401,
      "msg": messages.unknownError,
      "TransActionHash": e
    });
  }
});

function checkConnectionPassword(password) {
  return (password == connectionConfig.connectionPassword)
}

function walletListener() {
  console.log("[Wallet Listener] waked up!", new Date());
  database.getAllTokenAndAddress(blockchainConfig.name, checkAllWallets);
}

function callPostAPI(host, port, path, data, success) {
  try {
    let dataString = JSON.stringify(data);
    let headers = {
      'Content-Type': 'application/json',
      'Content-Length': dataString.length
    };
    let options = {
      host: host,
      port: port,
      path: path,
      method: 'POST',
      rejectUnauthorized: false,
      headers: headers
    };

    let caller = http;
    if(connectionConfig.backendProtocol == 'https')
      caller = https;
    let req = caller.request(options, function (res) {
      try {
        res.setEncoding('utf-8');
        let responseString = '';

        res.on('data', function (data) {
          try {
            responseString += data;
          } catch (e) { console.error("inja2") }
        });

        res.on('end', function () {
          try {
            let responseObject = JSON.parse(responseString);
            success(responseObject);
          } catch (e) { console.error("inja3"); }
        });
      } catch (e) { console.error("inja1") }
    });

    req.write(dataString);
    req.end();
  } catch (e) { console.error(e); }
}

async function checkAllWallets(dbResult) {
  console.log("Number of Found Addresses: ", dbResult.length);
  const masterAddress = database.getMasterAddress();
  const masterKeystore = database.getMasterKeystore();
  try {
    for (let i = 0; i < dbResult.length; i++) {
      let balance = 0;
      if (dbResult[i].symbol.toUpperCase() == mainNetworkToken.toUpperCase())
        balance = await chainManager.getMainTokenBalance(dbResult[i].address);
      else
        balance = await chainManager.getTokenBalance(dbResult[i].contract, dbResult[i].address);
      const bigconst = 100000000;
      balance = Math.trunc(parseFloat(balance * bigconst)) / bigconst;

      if (balance >= dbResult[i].min_deposit && dbResult[i].address != masterAddress) {
        
        callPostAPI(connectionConfig.backendEndpoint, connectionConfig.backendPort, connectionConfig.backendUrl,
          {
            "TransActionHash": dbResult[i].address,
            "ConfirmationCount": blockchainConfig.confirmationCount,
            "ReceivedAmount": balance,
            "RecieverAddress": dbResult[i].address,
            "SenderAddress": "unknown",
            "Symbol": dbResult[i].symbol.toUpperCase(),
            "Pass": connectionConfig.connectionPassword
          }, function (data) {
            console.log("API Called: ", data);
          }
        );

        if (dbResult[i].symbol.toUpperCase() == mainNetworkToken.toUpperCase()) {
          chainManager.sendMainCoin(dbResult[i].keystore, masterPassword, masterAddress, parseFloat(balance - confMinMainTokenRemain));
        }
        else {          
          await chainManager.sendMainCoin(masterKeystore, masterPassword, dbResult[i].address, confMinBlockchainFee);
          chainManager.sendToken(dbResult[i].keystore, masterPassword, dbResult[i].contract, masterAddress, parseFloat(balance) /** confMinTokenRemainPercent*/);
        }
      }
      
    }//end for
  } catch (e) { console.log(e) }

}


app.get('/listenertest', (req, res) => {
  walletListener();
  res.json("it Works!");
});

try {
  setInterval(() => { walletListener(); }, depositInterval * 1000);

  if(runningConfig.protocol == 'http'){
    app.listen(runningConfig.port, () => { 
      console.log(`Server listening on the port::${runningConfig.port}`); 
      console.log(`Server Protocol: `, runningConfig.protocol); 
    });
  }
  else if(runningConfig.protocol == 'https'){
    const httpsOptions = {
      key: fs.readFileSync(runningConfig.httpsKeyPath),
      cert: fs.readFileSync(runningConfig.httpsCertPath)
    }
    https.createServer(httpsOptions, app).listen(runningConfig.port);
    console.log(`Server listening on the port::${runningConfig.port}`);
    console.log(`Server Protocol: `, runningConfig.protocol); 
  }    
  else {
    console.error("[FATAL ERROR] no http/https protocol is defined");  
  }
} catch (e) {
  console.error("[ERROR] Error in Running APP: \n" + e);
}

