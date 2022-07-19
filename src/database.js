//Define "require"
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client } = require('pg')

class Database {

  constructor(host, port, username, password, database, confUnknownError, confBlockchain) {
    try {
      this.confUnknownError = confUnknownError;
      this.confBlockchain = confBlockchain;
      this.client = new Client({
        host: host,
        port: port,
        user: username,
        password: password,
        database: database,
        ssl: false,
      });
      this.client.connect();
      this.readMasterAddress();
    } catch (error) {
      console.log(error)
    }

  }

  readMasterAddress() {
    this.client.query('select private_key, public_key, address, keystore from public."WalletInfo"\
    where user_id = $1 and description = $2 ', [0, "master address"], (err, result) => {
      if (err) {

      } else {
        this.masterPrivatekey = result.rows[0].private_key;
        this.masterPublicKey = result.rows[0].public_key;
        this.masterAddress = result.rows[0].address;
        this.masterKeystore = result.rows[0].keystore;
      }
    });
  }

  getMasterAddress(){
    return this.masterAddress;
  }
  getMasterKeystore(){
    return this.masterKeystore;
  }

copyWallet(err, result){
  
}

  writeNewOrCopyWallet(userId, symbol, blockchain, desc, chainManager, apiresp, masterPassword) {
    const copyWallet = (err, result) => {
      try {
        let address, privateKey, publicKey, keystore, desc;
        if (err || result.rows.length <= 0) {          
          let wallet = chainManager.createAccount(masterPassword)
          address = wallet.account.address
          privateKey = wallet.account.privateKey
          publicKey = address
          keystore = wallet.keystore  
          desc = 'create from node.js program';      
        } else {
          //user previous address
          privateKey = result.rows[0].private_key;
          publicKey = result.rows[0].public_key;
          address = result.rows[0].address;
          keystore = result.rows[0].keystore;
          desc = 'Same as Prev'
        }

        this.client.query('INSERT INTO public."WalletInfo"(user_id, symbol, blockchain, private_key, \
            public_key, address, keystore, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);',
          [userId, symbol, blockchain, privateKey, publicKey, address, keystore, desc], function (err, result) {
            if (err) {
              apiresp.json({
                "status":400, 
                "msg": this.confUnknownError, 
                "Address":""});
              console.log(err.message);
            } else {
              apiresp.json({ "status":200, "msg":"", "address": address });
            }
          });
      } catch (error) {
        console.log(error);        
        apiresp.json({
          "status":400, 
          "msg": this.confUnknownError, 
          "address":""});
              console.log(err.message);
      }
    }

    const justSendWallet = (err, result) => {
      
      if (err || result.rows.length <= 0) {
        this.client.query('select private_key, public_key, address, keystore from public."WalletInfo"\
        where user_id = $1 and blockchain = $2 ', [userId, blockchain], copyWallet);
      } else {
        apiresp.json({"status":200, "msg":"", "address": result.rows[0].address});
      }
    }
    this.client.query('select address from public."WalletInfo" where user_id = $1 and lower(blockchain) = lower($2) and lower(symbol) = lower($3)', 
    [userId, blockchain, symbol], justSendWallet);
  }

  withdrawMainToken(userid, apires, toAddress, amount, fee, callbackfunc) {
    let keystore = "";
    let localcallbackfunc = (err, result) => {
      if (err || result.rows[0].length <= 0) {
        return apires.json({
          "status" : 401,
          "msg": this.confUnknownError,
          "TransActionHash": ""
        });
      } else {
        keystore = result.rows[0].keystore;
      }
      callbackfunc(keystore, toAddress, amount, fee, this.masterAddress, this.masterKeystore, apires);
    }
    this.client.query('select keystore from public."WalletInfo" where user_id = $1 and symbol = $2 and blockchain = $3',
      [userid, this.mainNetworkToken, this.confBlockchain], localcallbackfunc);
  }

  withdrawToken(userid, apires, tokenSymbol, toAddress, amount, fee, callbackfunc) {
    let keystore = "";
    let contractAddress = "";
    let fromAddress = "";
    let localcallbackfunc = (err, result) => {
      if (err) {
        return apires.json({
          "status" : 401,
          "msg": this.confUnknownError,
          "TransActionHash": ""
        });
      } else if (result.rows.length <= 0) {
        return apires.json({
          "status" : 401,
          "msg": this.confUnknownError,
          "TransActionHash": ""
        });
      }
      else {
        keystore = result.rows[0].keystore;
        contractAddress = result.rows[0].contract;
        fromAddress = result.rows[0].address;        
      }

      callbackfunc(contractAddress, toAddress, amount, this.masterKeystore, apires)
    }
    this.client.query('SELECT  w.keystore, w.private_key, w.public_key, w.address, c.contract \
    FROM public."WalletInfo" as w \
    join public."ContractAddress" as c on c.token_symbol = w.symbol  \
    where w.user_id = $1 and w.blockchain = $2 and w.symbol = $3;', [userid, this.confBlockchain, tokenSymbol], localcallbackfunc);
  }


   getTokenContractAddress(symbol, blockchain, callbackfunc) {

    this.client.query('select contract from public."ContractAddress"\
    where token_symbol = $1 and blockchain = $2', [symbol, blockchain], function (err, result) {
      if (err) {
        callbackfunc(err, 0);
      } else if (result.rows.length <= 0) {
        callbackfunc("Invalid Token Name", 0);
      }
      else {
        let contract = result.rows[0].contract;
        callbackfunc(null, contract);
      }
    });
  }

  getAllTokenAndAddress(blockchain, callbackfunc){	  
    this.client.query('select w.id, w.user_id, w.symbol, w.blockchain, w.address, w.keystore, c.min_deposit, c.contract from public."WalletInfo" as w\
    join public."ContractAddress" as c on lower(c.token_symbol) = lower(w.symbol) and lower(c.blockchain) = lower(w.blockchain) \
    where w.blockchain = $1;',[blockchain], function(err,res){
      if(err){
      }else {
          callbackfunc(res.rows);
      }
    });
  }

  userlogin(userid){
    this.client.query('INSERT INTO public."userStat" (id, user_id, islogin) VALUES ($1, $2, $3) \
    ON CONFLICT (id) DO UPDATE SET islogin = $4', [userid, userid, true, true], ()=>{});
  }
  userlogout(userid){
    this.client.query('UPDATE public."userStat"  SET islogin=$1 WHERE user_id = $2;', [false, userid], ()=>{});
  }

}

export default Database;
