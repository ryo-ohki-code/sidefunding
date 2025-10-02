// app.js
const express = require('express');
const path = require('path');
const app = express();

// Middleware
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));


// Use payment-integration settings
const MAIN_WALLET = {
    coin: "BNB",
    network: "bsc",
    address: "", // Your wallet address
    isMemo: [false, ""] // Set to [false, ""] or if your wallet need a Memo set to [true, "YourMemoHere"]
}

const SECONDARY_WALLET = {
    coin: "USDT",
    network: "bsc",
    address: "",
    isMemo: [false, ""]
}

const MAIN_COIN = `${MAIN_WALLET.coin}-${MAIN_WALLET.network}`;
const SECONDARY_COIN = `${SECONDARY_WALLET.coin}-${SECONDARY_WALLET.network}`;

const WALLETS = {
    [MAIN_COIN]: MAIN_WALLET,
    [SECONDARY_COIN]: SECONDARY_WALLET
};

const SIDESHIFT_CONFIG = {
    path: "./sideshiftAPI.js", // Path to module file
    secret: "", // "Your_shideshift_secret";
    id: "", // "Your_shideshift_ID"; 
    commissionRate: "0.5", // Optional - commision rate setting from 0 to 2
    verbose: true // verbose mode true/false
}

// Shop configuration
const SHOP_SETTING = {};
SHOP_SETTING.locale = "en-EN";
SHOP_SETTING.currency = "USD"; // USD EUR CNY INR JPY ... use ISO4217 currency codes
SHOP_SETTING.USD_REFERENCE_COIN = "USDT-bsc"; // Must be a 'coin-network' from the sideshift API

function resetCryptoPayment(invoiceId, shiftId, cryptoPaymentStatus) {

}

// Demo function to Confirm Crypto payment
function confirmCryptoPayment(invoiceId, shiftId) {

}

// Load the crypto payment processor
const ShiftProcessor = require('./ShiftProcessor.js')
const shiftProcessor = new ShiftProcessor({ WALLETS, MAIN_COIN, SECONDARY_COIN, SIDESHIFT_CONFIG, SHOP_SETTING });

// Load the payment poller system
const PaymentPoller = require('./CryptoPaymentPoller.js');
const cryptoPoller = new PaymentPoller({ shiftProcessor, intervalTimeout: 30000, resetCryptoPayment, confirmCryptoPayment }); // import sideshiftAPI and set interval delay in ms





// Sample data (replace with database in production)
let crowdfundingProjects = [
    {
        id: 1,
        title: "Community Garden Project",
        description: "Help us create a community garden in our neighborhood",
        goal: 5000,
        raised: 2300,
        creation: new Date('2025-08-31'),
        deadline: new Date('2026-12-31'),
        owner: "user123",
        coin: "BTC",
        network: "bitcoin",
        address: "",
        donation: {}
    },
    {
        id: 2,
        title: "Children's Library",
        description: "Building a new library for local children",
        goal: 10000,
        raised: 7500,
        creation: new Date('2024-12-31'),
        deadline: new Date('2025-03-15'),
        owner: "user456",
        coin: "ETH",
        network: "ethereum",
        address: "",
        donation: {}
    }
];

// Routes
app.get('/', (req, res) => {
    // Get active projects (not expired)
    const activeProjects = crowdfundingProjects.filter(project =>
        project.deadline > new Date()
    );
    const inactiveProjects = crowdfundingProjects.filter(project =>
        project.deadline < new Date()
    );
    res.render('crowd_index', { projects: activeProjects, inactiveProjects: inactiveProjects });
});

app.get('/project/:id', (req, res) => {
    const project = crowdfundingProjects.find(p => p.id == req.params.id);
    if (!project) return res.status(404).render('404');
    res.render('project-detail', { project });
});

app.get('/donate/:id', (req, res) => {
    const project = crowdfundingProjects.find(p => p.id == req.params.id);
    if (!project) return res.status(404).render('404');
    res.render('donate', { project, coinsDepositList: availableCoins });
});

// Payment handling - placeholder for your payment system
app.post('/donate/:id', async (req, res) => {
    try {
        const project = crowdfundingProjects.find(p => p.id == req.params.id);
        if (!project) return res.status(404).render('404');

        const donor = req.body.donor;
        const payWith = JSON.parse(req.body.payWith);
        const payWithCoin = payWith[0];
        // Process payment (replace with your actual payment logic)
        const amount = Number(req.body.amount);
        const settleCoinNetwork = project.coin + "-" + project.network

        const settleAmount = await shiftProcessor.getAmountToShift(amount, payWithCoin, settleCoinNetwork);
        const pairData = await shiftProcessor.sideshift.getPair(payWithCoin, settleCoinNetwork);
        // create shift with externalId to set redirection page on payment validation 
        res.render('crypto', { ratio: pairData, projectName: project.title, invoice: { cryptoTotal: settleAmount, total: amount, id: req.params.id, donor: donor }, SHOP_SETTING });
    } catch (error) {
        console.log(error);
    }

});
const verbose = true;

app.post("/create-payment", async function (req, res) {
    try {
        const id = shiftProcessor.sanitizeStringInput(req.body.id);
        const donor = shiftProcessor.sanitizeStringInput(req.body.donor);
        const coin = shiftProcessor.sanitizeStringInput(req.body.coin);
        const network = shiftProcessor.sanitizeStringInput(req.body.network);
        const total = req.body.total;

        if (!id || !donor || !coin || !network || !total) {
            return res.status(400).send("Missing required parameters");
        }
        const project = crowdfundingProjects.find(p => p.id == id);
        if (!project) return res.status(400).send("Invalid project ID");

        const totalAmountFIAT = Number(total);
        if (isNaN(totalAmountFIAT) || totalAmountFIAT <= 0 || totalAmountFIAT > 1000000) {
            return res.status(400).send("Invalid total amount");
        }

        // Create shift
        const shift = await shiftProcessor.createFixedShift(coin, network, totalAmountFIAT, shiftProcessor.extractIPInfo(req.ip).address);

        // Activate Polling system
        cryptoPoller.addPayment(shift, shift.settleAddress, shift.settleAmount, id);
        project.donation[shift.id] = {};
        project.donation[shift.id].donor = donor;
        project.donation[shift.id].status = "waiting";
        project.donation[shift.id].amount = totalAmountFIAT;

        res.redirect(`/payment-status/${shift.id}/${id}`);
    } catch (err) {
        if (verbose) console.error("Error in create-payment:", err);
        // res.render('error', { error: { title: "Error creating payment", message: err.message } });
    }
});


// need the shop payment processing
app.get('/payment-status/:shiftId/:projectId', async (req, res) => {
    const shiftId = req.params.shiftId;
    const projectId = req.params.projectId;
    const project = crowdfundingProjects.find(p => p.id == projectId);

    // check polling system
    const getStatus = await cryptoPoller.getPollingShiftData(shiftId);
    let getPaymentStatus;
    if (!getStatus) {
        // If no data use the sideshift API
        getPaymentStatus = await shiftProcessor.sideshift.getShift(shiftId);
    } else {
        getPaymentStatus = getStatus.shift;
    }
    if (!getPaymentStatus) throw new Error('No shift found')

    if (getPaymentStatus.status === "settled") {
        // Update project raised amount
        project.donation[shiftId].status = "confirmed";
        project.raised += Number(project.donation[shiftId].amount);
        res.redirect('/project/' + projectId);
    } else if (getPaymentStatus.status === "expired") {
        project.donation[shiftId].status = "canceled";
        res.redirect('/project/' + projectId);
    } else {
        res.render('crypto', { shift: getPaymentStatus, projectName: project.title });
    }
});




app.get('/create', (req, res) => {
    res.render('create', { coinsDepositList: availableCoins });
});

app.post('/create', (req, res) => {
    const { owner, title, description, goal, deadline, payWith, address } = req.body;

    // Validate inputs
    if (!title || !description || !goal || !deadline) {
        return res.render('create', { error: 'All fields are required' });
    }
    const payWithParsed = JSON.parse(payWith);
    const payWithCoin = payWithParsed[0].split('-');
    
    // TODO: Implement verification using wallet signature
    // You'll need to verify the signature here before processing creation or crowfunding cannot be modified
    
    const newProject = {
        id: crowdfundingProjects.length > 0 ? Math.max(...crowdfundingProjects.map(p => p.id)) + 1 : 1,
        title,
        description,
        goal: parseFloat(goal),
        raised: 0,
        creation: new Date(),
        deadline: new Date(deadline),
        owner: owner,
        coin: payWithCoin[0],
        network: payWithCoin[1],
        address: address,
        donation: {}
    };
    console.log(newProject)
    crowdfundingProjects.push(newProject);
    res.redirect(`/project/${newProject.id}`);
});

app.get('/edit/:id', (req, res) => {
    const project = crowdfundingProjects.find(p => p.id == req.params.id);
    if (!project) return res.status(404).render('404');
    res.render('edit', { project });
});

app.post('/edit/:id', (req, res) => {
    const project = crowdfundingProjects.find(p => p.id == req.params.id);
    if (!project) return res.status(404).render('404');

    const { title, description, goal, deadline } = req.body;

    // TODO: Implement verification using wallet signature
    // You'll need to verify the signature here before processing edit

    // Update project
    project.title = title;
    project.description = description;
    project.goal = parseFloat(goal);
    project.deadline = new Date(deadline);

    res.redirect(`/project/${req.params.id}`);
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('404');
});

const port = process.env.PORT || 3000;

// Start server
let availableCoins;

// TODO: update updateCoinsList to laod inside module and get data from function

shiftProcessor.updateCoinsList("public/icons").then((response) => {
    console.log('Initial coins list loaded');
    availableCoins = response.availableCoins;

    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });

    setInterval(async () => {
        const result = await shiftProcessor.updateCoinsList(ICON_PATH);
        // Update global variables if needed
        availableCoins = result.availableCoins;
    }, 12 * 60 * 60 * 1000);
}).catch(err => {
    console.error('Failed to load initial coins list:', err);
    process.exit(1);
});
