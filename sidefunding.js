// SideShift API crowdfunding demo - SideFunding

require('dotenv').config({ quiet: true }); //  debug: true 

const express = require('express');
const app = express();
const port = 3000;

// Middleware
app.set('view engine', 'pug');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));

const verbose = true;

const SIDESHIFT_CONFIG = {
    path: "./../../Sideshift_API_module/sideshiftAPI.js", // Path to module file
    secret: process.env.SIDESHIFT_SECRET, // "Your_SideShift_secret";
    id: process.env.SIDESHIFT_ID, // "Your_SideShift_ID"; 
    commissionRate: "0.5", // Optional - commision rate setting from 0 to 2
    verbose: true // verbose mode true/false
};

// ShiftProcessor currency configuration
const CURRENCY_SETTING = {};
CURRENCY_SETTING.locale = "en-EN";
CURRENCY_SETTING.currency = "USD"; // USD EUR CNY INR JPY ... use ISO4217 currency codes
CURRENCY_SETTING.USD_REFERENCE_COIN = "USDT-bsc"

// Load the crypto payment processor
const ShiftProcessor = require('./../Shop_integration/Wave_1/ShiftProcessor.js')
const shiftProcessor = new ShiftProcessor({ sideshiftConfig: SIDESHIFT_CONFIG, currencySetting: CURRENCY_SETTING });

// Demo function needed to load PaymentPoller
function resetCryptoPayment(invoiceId, shiftId, cryptoPaymentStatus) {
}
function confirmCryptoPayment(invoiceId, shiftId) {
}

// Load the payment poller system
const PaymentPoller = require('./../Shop_integration/Wave_1/CryptoPaymentPoller.js');
const cryptoPoller = new PaymentPoller({ shiftProcessor, intervalTimeout: 30000, resetCryptoPayment, confirmCryptoPayment });

let availableCoins;


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
        address: "1KVpKve3LXGAvZGmX19EaPbuubm6K9cG7M",
        donation: {
            shiftId_065e7ed7cf19bcb5235d: { date: "2025-10-03T14:37:56.359Z", donor: "Someone", status: "confirmed", amount: 2000 },
            shiftId_a37d57733f75c4c7d7ea: { date: "2025-10-04T15:49:01.359Z", donor: "SomeoneElse", status: "confirmed", amount: 300 }
        }
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
        address: "0x346da4f11f4Fe717A20718f843cEADB479D47128",
        donation: {
            shiftId_065e7ed7cf19bcb5235d: { date: "2025-10-03T14:37:56.359Z", donor: "Someone", status: "confirmed", amount: 5000 },
            shiftId_a37d57733f75c4c7d7ea: { date: "2025-10-04T15:49:01.359Z", donor: "SomeoneElse", status: "confirmed", amount: 2500 }
        }
    }
];



// Routes
app.get('/', (req, res) => {
    // Get active and inactive projects
    const activeProjects = crowdfundingProjects.filter(project =>
        project.deadline > new Date()
    );
    const inactiveProjects = crowdfundingProjects.filter(project =>
        project.deadline < new Date()
    );

    res.render('index', { projects: activeProjects, inactiveProjects: inactiveProjects });
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

app.post('/donate/:id', async (req, res) => {
    try {
        const project = crowdfundingProjects.find(p => p.id == req.params.id);

        if (!project) return res.status(404).render('404');

        const donor = req.body.donor;
        const payWith = JSON.parse(req.body.payWith);
        const payWithCoin = payWith[0];

        const amount = Number(req.body.amount);
        const settleCoinNetwork = project.coin + "-" + project.network

        // Get crypto amount to create the shift and call getPair for preview data.
        const settleAmount = await shiftProcessor.getAmountToShift(Number(amount), payWithCoin, settleCoinNetwork);
        const pairData = await shiftProcessor.sideshift.getPair(payWithCoin, settleCoinNetwork);

        // Display preview page
        res.render('crypto', { ratio: pairData, projectName: project.title, invoice: { cryptoTotal: settleAmount, total: amount, id: req.params.id, donor: donor }, CURRENCY_SETTING });
    } catch (err) {
        console.log(err);
        res.render('error', { error: { title: "Error setting donation", message: err.message } });

    }

});


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
        const shift = await shiftProcessor.createFixedShiftManual({
            depositCoin: coin,
            depositNetwork: network,
            amountFiat: totalAmountFIAT,
            settleAddress: project.address,
            settleCoin: project.coin,
            settleNetwork: project.network,
            ...(project.memo && { "settleMemo": String(project.memo) }),
            userIp: shiftProcessor.extractIPInfo(req.ip).address
        });

        // Activate Polling system
        cryptoPoller.addPayment(shift, shift.settleAddress, shift.settleAmount, id);

        // Update donation data
        project.donation["shiftId_" + shift.id] = {};
        project.donation["shiftId_" + shift.id].donor = donor;
        project.donation["shiftId_" + shift.id].shiftId = shift.id;
        project.donation["shiftId_" + shift.id].status = "waiting";
        project.donation["shiftId_" + shift.id].amount = totalAmountFIAT;
        project.donation["shiftId_" + shift.id].amountCrypto = shift.settleAmount;
        project.donation["shiftId_" + shift.id].date = new Date();

        res.redirect(`/payment-status/${shift.id}/${id}`);
    } catch (err) {
        if (verbose) console.error("Error in create-payment:", err);
        res.render('error', { error: { title: "Error creating payment", message: err.message } });
    }
});


app.get('/payment-status/:shiftId/:projectId', async (req, res) => {
    try {
        const shiftId = req.params.shiftId;
        const projectId = req.params.projectId;
        const project = crowdfundingProjects.find(p => p.id == projectId);

        // check polling system
        const getStatus = await cryptoPoller.getPollingShiftData(shiftId);
        let getPaymentStatus;

        // If no data from polling use the SideShift API
        if (!getStatus) {
            getPaymentStatus = await shiftProcessor.sideshift.getShift(shiftId);
        } else {
            getPaymentStatus = getStatus.shift;
        }

        if (!getPaymentStatus) throw new Error('No shift found')

        if (getPaymentStatus.status === "settled") {
            // Update project raised amount
            project.donation["shiftId_" + shiftId].status = "confirmed";
            project.raised += Number(project.donation["shiftId_" + shiftId].amount);

            res.redirect('/project/' + projectId);
        } else if (getPaymentStatus.status === "expired") {
            // Delete data if no donation
            delete project.donation["shiftId_" + shiftId];

            res.redirect('/project/' + projectId);
        } else {
            res.render('crypto', { shift: getPaymentStatus, projectName: project.title });
        }
    } catch (err) {
        if (verbose) console.error("Error in payment-status:", err);
        res.render('error', { error: { title: "Error getting payment status", message: err.message } });
    }
});




app.get('/create', (req, res) => {
    res.render('create', { coinsDepositList: availableCoins });
});

app.post('/create', (req, res) => {
    const { owner, title, description, goal, deadline, payWith, address } = req.body;

    if (!owner || !title || !description || !goal || !deadline || !payWith || !address) {
        return res.render('create', { error: 'All fields are required' });
    }
    const payWithParsed = JSON.parse(payWith);
    const payWithCoin = payWithParsed[0].split('-');

    // TODO: Implement verification using wallet signature
    // Need to verify the signature here before processing creation or crowfunding cannot be modified

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
        ...(req.body.memo && { "memo": String(req.body.memo) }),
        donation: {}
    };

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
    // Need to verify the signature here before processing edit

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



// Start server after receiving the coin list from sideshift API
shiftProcessor.updateCoinsList("public/icons").then((response) => {
    console.log('Initial coins list loaded');
    availableCoins = response.availableCoins;

    app.listen(port, () => {
        console.log(`HTTP Server running at http://localhost:${port}/`);
    });

    setInterval(async () => {
        const result = await shiftProcessor.updateCoinsList(ICON_PATH);
        availableCoins = result.availableCoins;
    }, 12 * 60 * 60 * 1000);
}).catch(err => {
    console.error('Failed to load initial coins list:', err);
    process.exit(1);
});
