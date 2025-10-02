# sideshift API crowdfunding integration

This Node.js project demonstrates how integration with the [Sideshift API](https://sideshift.ai/) to build a free crowdfunding platform.

This platform allows users to create funding requests and accept donations using any of the 240+ cryptocurrencies supported by the Sideshift API. All without requiring user accounts. Users authenticate through wallet signatures to manage their funding requests and add messages, while donors can contribute seamlessly using their preferred cryptocurrency from the extensive Sideshift API ecosystem.

**Revenue Model**: Platform owners earn commission fees (0-2%) from each transaction processed through the Sideshift API.


## Installation 

### Components
- [sideshiftAPI.js](https://github.com/ryo-ohki-code/sideshift-api-node/blob/main/sideshiftAPI.js): Interface to communicate with the official Sideshift API.
- [CryptoPaymentPoller.js](https://github.com/ryo-ohki-code/sideshift-payment-integration-package/blob/main/CryptoPaymentPoller.js): Polls the Sideshift API for payment confirmation and triggers success/failure callbacks.
- [ShiftProcessor.js](https://github.com/ryo-ohki-code/sideshift-payment-integration-package/blob/main/ShiftProcessor.js): Core logic to create and manage crypto payments through Sideshift.

### Download required files
```
wget https://raw.githubusercontent.com/ryo-ohki-code/sideshift-api-node/main/sideshiftAPI.js
wget https://raw.githubusercontent.com/ryo-ohki-code/sideshift-payment-integration-package/main/CryptoPaymentPoller.js
wget https://raw.githubusercontent.com/ryo-ohki-code/sideshift-payment-integration-package/main/ShiftProcessor.js
```


## Configuration

### Prerequisites
- Node.js environment
- Sideshift API key (secret and id)

### API Credentials
```
const SIDESHIFT_ID = "Your_sideshift_ID"; 
const SIDESHIFT_SECRET = "Your_shideshift_secret";
const SIDESHIFT_CONFIG = {
	secret: SIDESHIFT_SECRET,
	id: SIDESHIFT_ID,
	commissionRate: "0.5", // from 0 to 2 %
	verbose: true
}
```

Because of the actual ShiftProcessor calling method we need to set few useless wallets setting to run it:

### Currency Settings
```
SHOP_SETTING.locale = "en-EN"; // Used for the currencie symbol
SHOP_SETTING.currency = "USD"; // Supported currencies: USD, EUR, JPY... (ISO 4217 code standard)
SHOP_SETTING.USD_REFERENCE_COIN = "USDT-bsc"; // Must be a coin-network from the coinList
```

### Wallet Configuration
Important: The current version requires two different wallets since the Sideshift API doesn't support same-coin-network shifts (e.g., BTC-bitcoin to BTC-bitcoin).

```
const MAIN_WALLET = {
	coin: "USDT",
	network: "bsc",
	address: "Your wallet address",
	isMemo: [false, ""] // Set to [false, ""] or if your wallet need a Memo set to [true, "YourMemoHere"]
}

const SECONDARY_WALLET = {
	coin: "BNB",
	network: "bsc",
	address: "Your wallet address",
	isMemo: [false, ""]
}

const MAIN_COIN = `${MAIN_WALLET.coin}-${MAIN_WALLET.network}`;
const SECONDARY_COIN = `${SECONDARY_WALLET.coin}-${SECONDARY_WALLET.network}`;

const WALLETS = {
    [MAIN_COIN]: MAIN_WALLET,
    [SECONDARY_COIN]: SECONDARY_WALLET
};
```

⚠️ Important Notes
1. Wallets can be set on different networks (we only use 'bsc' for simplicity in this example, with 2 different coins, this is the easiest setting)
2. You cannot set the same coin-network twice
    - ❌ Invalid: USDT-ethereum and USDT-ethereum
    - ✅ Valid: USDT-ethereum and USDT-bsc


### Load the crypto payment processor
```
const cryptoProcessor = require('./ShiftProcessor.js')
const shiftGateway = new cryptoProcessor({
  WALLETS,
  MAIN_COIN,
  SECONDARY_COIN,
  SIDESHIFT_CONFIG,
  SHOP_SETTING
});
```

### Load the payment poller system
```
const PaymentPoller = require('./CryptoPaymentPoller.js');
const cryptoPoller = new PaymentPoller({
  shiftGateway,
  intervalTimeout: 120000, // ms
  resetCryptoPayment,
  confirmCryptoPayment
});
```

### Start server

```bash
npm install express path pug
node sidefunding.js
```


