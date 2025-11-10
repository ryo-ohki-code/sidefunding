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
npm install express pug fs dotenv multer isomorphic-dompurify mongoose ethers express-rate-limit helmet

//Download neccessary files:
wget -O public/js/ethers-6-7-0.min.js https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js
wget -O public/js/qrious.min.js https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js
wget -O public/js/all.min.js https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/js/all.min.js
mkdir public/js/EasyMDE
wget -O public/js/EasyMDE/easymde.min.js https://unpkg.com/easymde/dist/easymde.min.js
wget -O public/js/EasyMDE/easymde.min.css https://unpkg.com/easymde/dist/easymde.min.css
wget -O public/js/EasyMDE/marked.umd.js https://cdn.jsdelivr.net/npm/marked/lib/marked.umd.js
```

Files to add inside public/js/:
- ethers-6-7-0.min.js -> https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js
- qrious.min.js -> https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js
- all.min.js -> fontawesome https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/js/all.min.js


Files to add inside public/js/EasyMDE/:
- easymde.min.js -> https://unpkg.com/easymde/dist/easymde.min.js
- easymde.min.css -> https://unpkg.com/easymde/dist/easymde.min.css
- marked.umd.js -> https://cdn.jsdelivr.net/npm/marked/lib/marked.umd.js



Note: css is not included, you need to rebuild yours.

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
node server.js
```
