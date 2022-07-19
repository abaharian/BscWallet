import Web3 from 'web3';


class BlockchainManager {
    constructor(infuraUrl, ABI) {
        this.web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));
        this.ABI = ABI;
    }

    createAccount(password) {
        let account = this.web3.eth.accounts.create(password);
        let wallet = this.web3.eth.accounts.wallet.add(account);
        let keystore = wallet.encrypt(password);

        const response = {
            account: account,
            wallet: wallet,
            keystore: keystore,
        }

        return response;

    }

    importWalletByKeystore(keystore, password) {
        let account = this.web3.eth.accounts.decrypt(keystore, password, false);
        let wallet = this.web3.eth.accounts.wallet.add(account);
        const response = {
            account: account,
            wallet: wallet,
            keystore: keystore,
        };

        return response;
    }


    importWalletByPrivateKey(privateKey) {
        const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
        let wallet = this.web3.eth.accounts.wallet.add(account);
        let keystore = wallet.encrypt(this.web3.utils.randomHex(32));
        const responsse = {
            account: account,
            wallet: wallet,
            keystore: keystore,
        };

        return responsse;
    }

    async getTokenBalance(tokenAddress, address) {
        // ABI to transfer ERC20 Token
        let abi = this.ABI;
        // Get ERC20 Token contract instance
        let contract = new this.web3.eth.Contract(abi, tokenAddress);
        //console.log(contract);
        // Get decimal
        let decimal = await contract.methods.decimals().call();
        //console.log(decimal);
        // Get Balance
        let balance = await contract.methods.balanceOf(address).call();
        // Get Name
        let name = await contract.methods.name().call();
        // Get Symbol
        let symbol = await contract.methods.symbol().call();
        return balance / Math.pow(10, decimal);
    }

    async getMainTokenBalance(address) {
        // Get Balance
        let balance = await this.web3.eth.getBalance(address);

        return balance / Math.pow(10, 18);
    }

    async sendMainCoin(keystore, password, toAddress, amount) {
        if(amount <=0)return;
        let account = this.web3.eth.accounts.decrypt(keystore, password, false);
        let wallet = this.web3.eth.accounts.wallet.add(account);

        // The gas price is determined by the last few blocks median gas price.
        const avgGasPrice = await this.web3.eth.getGasPrice();
        //console.log("AMOUNT = ", amount);
        const bigconst = 100000000;
        amount = Math.trunc(amount*bigconst)/bigconst;
       
        //console.log("signing transaction : ");
        const createTransaction = await this.web3.eth.accounts.signTransaction(
            {
                from: wallet.address,
                to: toAddress,
                value: this.web3.utils.toWei(amount.toString(), 'ether') ,
                gas: 21000,
                gasPrice: avgGasPrice
            },
            wallet.privateKey
        );

        // Deploy transaction
        const createReceipt = await this.web3.eth.sendSignedTransaction(
            createTransaction.rawTransaction
        );
        console.log(`Transaction successful with hash: ${createReceipt.transactionHash}`);

        return createReceipt.transactionHash;
    }

    async sendToken(keystore, password, tokenContractAddress, toAddress, amount) {
        let account = this.web3.eth.accounts.decrypt(keystore, password, false);
        let wallet = this.web3.eth.accounts.wallet.add(account);
        // ABI to transfer ERC20 Token
        let abi = this.ABI;
        // calculate ERC20 token amount
        let tokenAmount = this.web3.utils.toWei(amount.toString(), 'ether')
        // Get ERC20 Token contract instance
        let contract = new this.web3.eth.Contract(abi, tokenContractAddress, { from: wallet.address });
        const data = await contract.methods.transfer(toAddress, tokenAmount).encodeABI();
        // The gas price is determined by the last few blocks median gas price.
        const gasPrice = await this.web3.eth.getGasPrice();
        console.log("avg gas price: " + gasPrice / Math.pow(10,18));
        const gasLimit = 90000;
        let name = await contract.methods.name().call();
        // Get Symbol
        let symbol = await contract.methods.symbol().call();
        // Build a new transaction object.
        const rawTransaction = {
            'from': wallet.address,
            'nonce': this.web3.utils.toHex(this.web3.eth.getTransactionCount(wallet.address)),
            'gasPrice': this.web3.utils.toHex(gasPrice),
            'gasLimit': this.web3.utils.toHex(gasLimit),
            'to': tokenContractAddress,
            'value': 0,
            'data': data,
            'chainId': this.isMainNet() ? 56 : 97
        };
        const res = await contract.methods.transfer(toAddress, tokenAmount).send({
            from: wallet.address,
            gas: 150000
        });
        // Get Name
        let name2 = await contract.methods.name().call();
        // Get Symbol
        let symbol2 = await contract.methods.symbol().call();

        return res;
    }

    isMainNet() {
        return true;
        //return ("" +this.infuraUrl).includes("https://bsc-dataseed1.binance.org:443");
    }

}

export default BlockchainManager;