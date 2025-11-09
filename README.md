# SideShift API crowdfunding integration

This Node.js project demonstrates integration with the [SideShift API](https://sideshift.ai/) to build a free crowdfunding platform.

This platform allows users to create funding requests and accept donations using any of the 250+ cryptocurrencies supported by the SideShift API, all without requiring user accounts. Users authenticate through wallet signatures to manage their funding requests and add messages, while donors can contribute seamlessly using their preferred cryptocurrency from the SideShift API ecosystem.

**Revenue Model**: How it works
- Platform owners earn 0-2% commission on every transaction processed through SideShift API
- Fees are collected in XAI tokens (SideShift's native cryptocurrency) and directly credited to your SideShift account
- XAI tokens can be exchanged on the SideShift platform


## Installation 

### Components
- [sideshift-api-node](https://github.com/ryo-ohki-code/sideshift-api-node): Interface to communicate with the official Sideshift API.
- [ShiftProcessor.js](https://github.com/ryo-ohki-code/sideshift-payment-wrapper-node/blob/main/ShiftProcessor.js): Core logic to create and manage crypto payments through Sideshift.

### Download required files
```bash
git clone https://github.com/ryo-ohki-code/sidefunding
cd sidefunding
git clone https://github.com/ryo-ohki-code/sideshift-api-node
git clone https://github.com/ryo-ohki-code/sideshift-payment-wrapper-node
```


## Configuration

### Prerequisites
- Node.js environment
- Mongo DB
- SideShift API key (secret and id)

How to get your API credentials?
Visit [Sideshift Account Page](https://sideshift.ai/account) and dind your SideShift ID and Secret (private key) in the dashboard.


**Set .env file**
```
SIDESHIFT_ID=Your_Sideshift_ID 
SIDESHIFT_SECRET=Your_Sideshift_Secret
```

### API Credentials
```
const SIDESHIFT_ID = process.env.SIDESHIFT_ID; // "Your_sideshift_ID"; 
const SIDESHIFT_SECRET = process.env.SIDESHIFT_SECRET; //"Your_shideshift_secret";
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

### Start server

```bash
npm install express pug fs dotenv multer isomorphic-dompurify mongoose ethers express-rate-limit helmet
node server.js
```
