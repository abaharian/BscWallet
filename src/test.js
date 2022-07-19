import { createRequire } from "module";
const require = createRequire(import.meta.url);
import blockchainManager from "./centerpirme.js";
const confABI = require('./bep20ABI.json');

const keystore = {"version":3,"id":"9fcffce9-3205-477c-b014-9a0388500f6a","address":"345a38efa2f0ada3a151a5b83b595a092d8cda11","crypto":{"ciphertext":"e2a4ca67e6f68f0f95bf806df49d75e395f8e5146cb4c9b16df3721b05a49e67","cipherparams":{"iv":"e481217f8134a21066a037b3e0d9091b"},"cipher":"aes-128-ctr","kdf":"scrypt","kdfparams":{"dklen":32,"salt":"ff58d53754d10e6aa859053d15206cda01ad36c2e08c51d1c48fc0c3389152e7","n":8192,"r":8,"p":1},"mac":"c5daf3fa32620983498a71dae64de6142986b20e1a6b47f9a0bfe41a72c309c0"}};
const dest = "0x6Da3625BD7048BA78202E3a363b04b295930CcfB";
const chainManager = new blockchainManager("https://bsc-dataseed.binance.org/", confABI);

chainManager.sendMainCoin(keystore, 'Sadra@padideh1234', dest, 0.001);
