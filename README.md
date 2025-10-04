# SideShift API crowdfunding integration

This Node.js project demonstrates integration with the [SideShift API](https://sideshift.ai/) to build a free crowdfunding platform.

This platform allows users to create funding requests and accept donations using any of the 250+ cryptocurrencies supported by the SideShift API, all without requiring user accounts. Users authenticate through wallet signatures to manage their funding requests and add messages, while donors can contribute seamlessly using their preferred cryptocurrency from the SideShift API ecosystem.

**Revenue Model**: How it works
- Platform owners earn 0-2% commission on every transaction processed through SideShift API
- Fees are collected in XAI tokens (SideShift's native cryptocurrency) and directly credited to your SideShift account
- XAI tokens can be exchanged on the SideShift platform


## Installation 

### Components
- [sideshiftAPI.js](https://github.com/ryo-ohki-code/sideshift-api-node/blob/main/sideshiftAPI.js): Interface to communicate with the official Sideshift API.
- [CryptoPaymentPoller.js](https://github.com/ryo-ohki-code/sideshift-payment-integration-package/blob/main/CryptoPaymentPoller.js): Polls the Sideshift API for payment confirmation and triggers success/failure callbacks.
- [ShiftProcessor.js](https://github.com/ryo-ohki-code/sideshift-payment-integration-package/blob/main/ShiftProcessor.js): Core logic to create and manage crypto payments through Sideshift.

### Download required files
```bash
wget https://raw.githubusercontent.com/ryo-ohki-code/sideshift-api-node/main/sideshiftAPI.js
wget https://raw.githubusercontent.com/ryo-ohki-code/sideshift-payment-integration-package/main/CryptoPaymentPoller.js
wget https://raw.githubusercontent.com/ryo-ohki-code/sideshift-payment-integration-package/main/ShiftProcessor.js
```


## Configuration

### Prerequisites
- Node.js environment
- SideShift API key (secret and id)

How to get your API credentials?
Visit [Sideshift Account Page](https://sideshift.ai/account) and dind your SideShift ID and Secret (private key) in the dashboard.

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

### Currency Settings
```
CURRENCY_SETTING.locale = "en-EN"; // Used for the currencie symbol
CURRENCY_SETTING.currency = "USD"; // Supported currencies: USD, EUR, JPY... (ISO 4217 code standard)
CURRENCY_SETTING.USD_REFERENCE_COIN = "USDT-bsc"; // Must be a coin-network from the coinList
```

### Load the crypto payment processor
```
const cryptoProcessor = require('./ShiftProcessor.js')
const shiftGateway = new cryptoProcessor({
  sideshiftConfig: SIDESHIFT_CONFIG,
  currencySetting: CURRENCY_SETTING
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
npm install express fs pug
node sidefunding.js
```

**More features coming soon**
