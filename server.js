// Cryptocurrencies crowdfunding platform

require('dotenv').config({ quiet: true }); //  debug: true 

const fs = require('fs');
const fsPromises = require('fs').promises;
const express = require('express');
const app = express();
const port = 3009;

// Sanityzer
const DOMPurify = require('isomorphic-dompurify');
const sanitizeConfig = {
    USE_PROFILES: {
        html: false,
        mathMl: false,
        svg: false
    },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout']
};

// Middleware
app.use(express.json());
app.set('view engine', 'pug');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));

// Uploaded files
app.use('/uploads', express.static('public/uploads'));

// Set up Multer for file uploads
const uploadsDir = __dirname + '/public/uploads';
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Create the uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Server URL
const BASE_URL = process.env.BASE_URL || "https://217-154-23-69.sslip.io";

const verbose = true;

const SIDESHIFT_CONFIG = {
    path: "./../../sideshift-api-node/Compiled/sideshift-api.js", // Path to api module from Shift-Processor/
    secret: process.env.SIDESHIFT_SECRET, // "Your_SideShift_secret";
    id: process.env.SIDESHIFT_ID, // "Your_SideShift_ID"; 
    commissionRate: "0.5", // Optional - commision rate setting from 0 to 2
    verbose: true // verbose mode true/false
};

// Icons path
const iconsPath = './public/icons';

// Create the icons directory if it doesn't exist
if (!fs.existsSync(iconsPath)) {
    fs.mkdirSync(iconsPath);
}

// ShiftProcessor currency configuration
const CURRENCY_SETTING = {};
CURRENCY_SETTING.locale = "en-EN";
CURRENCY_SETTING.currency = "USD"; // USD EUR CNY INR JPY ... use ISO4217 currency codes
CURRENCY_SETTING.USD_REFERENCE_COIN = "USDT-bsc"; // Must be a 'coin-network' from the SideShift API
CURRENCY_SETTING.SHIF_LIMIT_USD = 20000; // USD

// Load the crypto payment processor
const ShiftProcessor = require('./sideshift-payment-wrapper-node/Shift-Processor/ShiftProcessor.js');
const shiftProcessor = new ShiftProcessor({ sideshiftConfig: SIDESHIFT_CONFIG, currencySetting: CURRENCY_SETTING });


// Update function same used by Polling system (to cover both implementation)
async function resetCryptoPayment(donationId, projectId, status) {
    const project = await mongoFind.findById(projectId);

    // To delete data
    // await mongoDonation.removeDonationById(project._id, donationId);

    // To update status
    await mongoDonation.updateDonationById(project._id, donationId, { status: "cancelled" });

    if (verbose) console.log('Payment cancelled');
}

async function confirmCryptoPayment(donationId, projectId, shift) {
    const project = await mongoFind.findById(projectId);
    const donation = await mongoFind.findDonationById(donationId);

    // Update donation
    const donationUpdate = {
        status: "success",
        'currency.coin': shift.depositCoin,
        'currency.network':  shift.depositNetwork,
        'currency.amount': Number(shift.depositAmount),
        'currency.txDepositHash': shift.depositHash,
        'currency.txSettleHash': shift.settleHash,
        'currency.shiftId': shift.id
    }
    await mongoDonation.updateDonationById(project._id, donationId, donationUpdate);

    // Update project
    const newRaisedUsd = project.goal.raisedUsd + Number(donation.amountUsd);
    const newRaisedCrypto = project.goal.raisedCryptocurrency + Number(donation.amountCrypto);

    const projectUpdate = {
        'goal.raisedUsd': newRaisedUsd,
        'goal.raisedCryptocurrency': newRaisedCrypto,
    };

    await mongoManager.updateProjectById(project._id, projectUpdate);

    if (verbose) console.log('Payment confirmed and amounts updated successfully:');
}

let availableCoins;

// Map icons files path for client side
const svgFiles = fs.readdirSync(iconsPath)
    .filter(file => file.endsWith('.svg'))
    .map(file => `/icons/${file}`);


// DB variables
const mongoose = require('mongoose');
const mongo = require('./modules/mongo/mongoService.js');
let mongoFind;
let mongoManager;
let mongoDonation;

// Initiate DB
async function main() {
    let projectsDb;

    try {
        projectsDb = await mongo.initDB("mongodb://localhost:27017/crowdfunding");

        // Import modules
        mongoFind = require('./modules/mongo/mongoFind.js');
        mongoManager = require('./modules/mongo/mongoProjectManager.js');
        mongoDonation = require('./modules/mongo/mongoDonationManager.js');

        // Set up modules
        mongoFind.setProjectsDb(projectsDb);
        mongoManager.setProjectsDb(projectsDb);
        mongoDonation.setProjectsDb(projectsDb);

        // Run cleanup and updates
        await mongo.cleanupExpiredDonations();
        await mongoManager.updateProjectsStatus();
        await updateLastRates();

        console.log('DB initialization completed successfully');
    } catch (err) {
        console.error('Error in DB initialization:', err);
    }
}
main();

// Run expired donation cleanup every hour
const cleanupInterval = setInterval(mongo.cleanupExpiredDonations, 3600000);

// update cryptocurrencies value with the last rates
async function updateLastRates() {
    try {
        const referenceCoin = "USDT";
        const referenceNetwork = "bsc";
        const uniqueCoinNetworks = [shiftProcessor.helper.getCoinNetwork(referenceCoin, referenceNetwork)];
        const seenPairs = {};

        const activeProject = await mongoFind.findActiveProjects();

        // Build unique coin-network pairs
        activeProject.forEach(project => {
            if (!project.wallet || !project.wallet.coin || !project.wallet.network) {
                console.warn("activeProject - Skipping invalid project:", project._id);
                return;
            }
            const key = `${project.wallet.coin}-${project.wallet.network}`;
            if (!seenPairs[key]) {
                seenPairs[key] = true;
                uniqueCoinNetworks.push(key);
            }
        });

        // Get all pairs at once
        const pairs = await shiftProcessor.sideshift.getPairs(uniqueCoinNetworks);
        const rateMapping = {};

        // Build rate mapping
        pairs.forEach(pair => {
            if (pair.depositCoin === referenceCoin && pair.depositNetwork === referenceNetwork) {
                const key = `${pair.settleCoin}-${pair.settleNetwork}`;
                if (!rateMapping[key]) {
                    rateMapping[key] = pair.rate && Number(pair.rate) > 0 ? Number(pair.rate) : null;
                }
            }
        });

        // Prepare batch updates
        const updateOperations = activeProject.map(project => {
            const key = `${project.wallet.coin}-${project.wallet.network}`;
            const rate = rateMapping[key];

            if (!rate || rate && rate < 0) {
                console.warn("updateOperations - Skipping invalid project:", project._id);
                return null;
            }

            // Handle data type conversion properly
            const raisedCryptocurrency = Number(project.goal.raisedCryptocurrency);
            const goalUsd = Number(project.goal.goalUsd);

            const newRaisedUsd = rate ? (raisedCryptocurrency / Number(rate)).toFixed(2) : project.goal.raisedUsd;
            const newGoalCryptocurrency = rate ? (goalUsd * Number(rate)).toFixed(8) : project.goal.goalCryptocurrency;

            return {
                filter: { _id: project._id },
                update: {
                    $set: {
                        'goal.raisedUsd': Number(newRaisedUsd),
                        'goal.goalCryptocurrency': Number(newGoalCryptocurrency)
                    }
                }
            };
        });

        // Execute batch updates
        console.log(`Updating ${updateOperations.length} projects`);
        await Promise.all(
            updateOperations.map(op => mongoManager.updateProjectById(op.filter._id, op.update))
        );
        // TODO await Project.bulkWrite(updateOperations);

        console.log('Projects update completed successfully');
    } catch (error) {
        console.error('Error updating rates:', error);
        throw error;
    }
}


// Random generator helper
function generateRandomString(length = 64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(array, byte => chars[byte % chars.length]).join('');
}



// Rate limiter
const rateLimit = require('express-rate-limit');

// General rate limiter
const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // Limit each IP to 100 requests per windowMs, e.q. 10 request per secondes
    message: 'Too many requests, please try again later',
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    skipSuccessfulRequests: true // Don't count successful requests
});

// Donation rate limiter
const donationLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // Very limited for donations
    message: 'Too many donation requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

// Very high traffic
const highTrafficLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 500, // Higher limit for less sensitive endpoints
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

// 404 limiter
const fourZeroFourLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100, // Very limited for donations
    message: 'Too many 404 requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

// Set rateLimiter as default
app.use(rateLimiter);


// Helmet settings
const helmet = require("helmet");
app.use(helmet.dnsPrefetchControl());
app.use(helmet.frameguard());
app.use(helmet.hidePoweredBy());
app.use(helmet.hsts());
app.use(helmet.noSniff());
app.use(helmet.xssFilter());
app.use(helmet.crossOriginEmbedderPolicy());
app.use(helmet.crossOriginOpenerPolicy());
app.use(helmet.crossOriginResourcePolicy());

app.use(helmet.ieNoOpen());
app.use(helmet.originAgentCluster());

app.use(helmet.permittedCrossDomainPolicies());
app.use(
    helmet.referrerPolicy({
        policy: ["origin", "strict-origin-when-cross-origin"],
    })
);
// app.use(helmet.hsts({
//   maxAge: 31536000, // 1 year
//   includeSubDomains: true,
//   preload: true
// }));
app.use(helmet.frameguard({
    action: 'deny' // or 'sameorigin'
}));



// Home
app.get('/', async (req, res) => {
    try {
        // Get active and inactive projects
        const activeProjects = await mongoFind.findActiveProjects();
        const inactiveProjects = await mongoFind.findInactiveProjects();

        return res.render('index', { projects: activeProjects, inactiveProjects: inactiveProjects, icons: svgFiles });
    } catch (err) {
        if (verbose) console.error('Error fetching projects:', err);
        return res.status(500).render('error', { error: { title: "Failed to load projects", message: err?.message || 'Unknown error' } });
    }

});


// Search page
app.get('/projects/search', async (req, res) => {
    return res.render('search');
});

// API route for search
app.get('/projects/search/api', async (req, res) => {
    try {
        const { q, ...filters } = req.query;

        if (!q || typeof q !== 'string' || !q.trim()) {
            return null;
        }

        let results = [];
        if (q || Object.keys(filters).length > 0) {
            try {
                // Sanitize the search term
                if (q && typeof q === 'string') {
                    const sanitizedQuery = q.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
                    
                    if (sanitizedQuery.length > 0 && sanitizedQuery.length < 500) {
                        const wordCount = sanitizedQuery.split(/\s+/).filter(w => w.length > 0);

                        if(wordCount.length < 50){
                            filters.searchTerm = sanitizedQuery.trim();
                        } else {
                            if (verbose) console.log('Too many search terms:', wordCount.length);
                        }
                    } else {
                        if (verbose) console.log('Search query too long or empty:', sanitizedQuery.length);
                    }
                }

                results = await mongo.searchProjects(filters);
            } catch (error) {
                if (verbose) console.error('Search error:', error);
            }
        }

        return res.json(results);
    } catch (err) {
        if (verbose) console.error('Search error:', err);
        return res.status(500).render('error', { error: { title: "Failed to search projects", message: err?.message || 'Unknown error' } });
    }
});


// Legal information
app.get('/disclaimer', async (req, res) => {
    return res.render('disclaimer');
});


// Projects page
const PROJECT_ID_LENGTH = 16; // Note: PROJECT_ID_LENGTH and regex value need to be equal
const regexProjectId = new RegExp(`^[a-zA-Z0-9]{${PROJECT_ID_LENGTH}}$`);

function validateProjectId(id) {
    if (!id) return false; // regex: /^[a-zA-Z0-9]{16}$/;
    return regexProjectId.test(id);
}

// Sanitize query
function safePage(query) {
    const page = parseInt(query.page);
    if (isNaN(page)) return 1;
    return page < 1 ? 1 : page;
};

// Limit min 5 / max 50
function safeLimit(query) {
    const limit = parseInt(query.limit);
    if (isNaN(limit)) return 10;
    return Math.min(50, Math.max(5, limit));
};

app.get('/projects', async (req, res) => {
    try {
        const page = safePage(req.query);
        const limit = safeLimit(req.query);
        const skip = (page - 1) * limit;

        // Validate status
        let status = req.query.status || "active";
        if (status !== "active" && status !== "inactive") {
            status = "active"
        }

        let activeProjects = null;
        let activeCount = null;
        let inactiveProjects = null;
        let inactiveCount = null;
        let totalCount = 0;
        let totalPages = 0;

        // Get projects
        if (status === "active") {
            activeProjects = await mongoFind.findActiveProjectsPagination(skip, limit)
            activeCount = activeProjects.length;
            totalCount = await mongoFind.countActiveProjects();
        } else if (status === "inactive") {
            inactiveProjects = await mongoFind.findInactiveProjectsPagination(skip, limit)
            inactiveCount = inactiveProjects.length;
            totalCount = await mongoFind.countInactiveProjects();
        }

        totalPages = Math.ceil(totalCount / limit);

        return res.render('projects', {
            ...(activeProjects && { "projects": activeProjects }),
            ...(inactiveProjects && { "inactiveProjects": inactiveProjects }),
            currentPage: page,
            limit: limit,
            totalPages: totalPages,
            ...(activeCount && { "totalActive": activeCount }),
            ...(inactiveCount && { "totalInactive": inactiveCount }),
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });

    } catch (err) {
        if (verbose) console.error(`Error fetching projects from DB: ${err?.message || 'Unknown error'}`, err);
        return res.status(500).render('error', { error: { title: "Failed to load projects", message: "Internal error" } });
    }
});


// Project detail page
app.get('/project/:id', async (req, res) => {
    try {
        if (!validateProjectId(req.params.id)) {
            return res.status(404).render('error', { error: { title: "Project not found", message: "Invalid project ID" } });
        }

        const project = await mongoFind.findById(req.params.id);

        if (!project) {
            return res.status(404).render('error', { error: { title: "Project not found", message: "Project does not exist" } });
        }

        return res.render('project-detail', { project });
    } catch (err) {
        if (verbose) console.error('Error fetching project by ID:', err);
        return res.status(500).render('error', { error: { title: "Failed to load project", message: err?.message || 'Unknown error' } });
    }
});


// Donation page
app.get('/donate/:id', async (req, res) => {
    try {
        if (!validateProjectId(req.params.id)) {
            return res.status(404).render('error', { error: { title: "Project not found", message: "Invalid project ID" } });
        }
        const project = await mongoFind.findById(req.params.id);

        if (!project) {
            return res.status(404).render('error', { error: { title: "Project not found", message: "Project does not exist" } });
        }

        return res.render('donate', { project }); // for checkout integration
        // res.render('donate', { project, coinsDepositList: availableCoins }); // for custom integration
    } catch (err) {
        if (verbose) console.error("Error in donate route:", err);
        return res.status(500).render('error', { error: { title: "Error loading project from DB", message: err?.message || 'Unknown error' } });
    }
});





// Checkout Integration

const { setupSideShiftWebhook, deleteWebhook } = require('./sideshift-payment-wrapper-node/Shift-Processor/sideshift-webhook.js');
// Call the webhook function at server start
setupSideShiftWebhook(BASE_URL, process.env.SIDESHIFT_SECRET);

// To delete a webhook
// deleteWebhook(process.env.SIDESHIFT_SECRET)


const failedWebhookPath = "./logs/failed-webhook.json"
let failedWebhookMemoryStorage = [];

const activeRetries = new Map();
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function retryFail(projectId, donationId, shiftId, failedWebhook, maxRetries = 3) {
    if (!failedWebhook || !failedWebhook.id || !failedWebhook.status) {
        console.warn("Invalid webhook object passed to retryFail");
        return;
    }

    if (activeRetries.has(donationId)) {
        return;
    }

    activeRetries.set(donationId, true);

    try {
        let retryCount = 0;
        while (retryCount < maxRetries) {
            try {
                if (failedWebhook.status === "cancelled") {
                    await resetCryptoPayment(failedWebhook.id, projectId, "cancelled");
                } else if (failedWebhook.status === "success") {
                    await confirmCryptoPayment(failedWebhook.id, projectId, shiftId);
                }
                else {
                    if (verbose) console.warn(`Skipping retry for non-final status: ${failedWebhook.status}`);
                }

                if (verbose) console.log(`Successfully retried webhook ${failedWebhook.id} after ${retryCount + 1} attempts`);
                break;
            } catch (err) {
                retryCount++;
                if (retryCount >= maxRetries) {
                    if (!failedWebhookMemoryStorage.find(existing => existing.id === failedWebhook.id)) failedWebhookMemoryStorage.push(failedWebhook);

                    if (verbose) console.error(`Failed to process webhook ${failedWebhook.id} after ${retryCount} retries`, err);
                } else {
                    if (verbose) console.log(`Retry attempt ${retryCount} for webhook ${failedWebhook.id}`, err?.message || 'Unknown error');
                    // await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                    await delay(1000 * Math.pow(2, retryCount) + Math.random() * 1000);
                }
            }
        }
    } finally {
        activeRetries.delete(donationId);
    }
}

function saveFailedWebhook(req, error, projectId = null, donationId = null) {
    const failedWebhook = {
        id: req.body.meta.hook.id,
        status: req.body.payload.status,
        timestamp: new Date(),
        payload: req.body,
        error: error.message
    };
    if (projectId && donationId) {
        failedWebhook.projectId = projectId;
        failedWebhook.donationId = donationId;
        retryFail(projectId, donationId, req.body.payload.shiftId, failedWebhook, 3);
    } else {
        if (!failedWebhookMemoryStorage.find(existing => existing.id === failedWebhook.id)) failedWebhookMemoryStorage.push(failedWebhook);
    }
}

// Save failedWebhookMemoryStorage function to a file, see: 'Graceful shutdown handler'
async function saveFailedWebhookToFile() {
    try {
        await fsPromises.writeFile(
            failedWebhookPath,
            JSON.stringify({ data: failedWebhookMemoryStorage }, null, 2)
        );

        console.log(`Successfully saved ${failedWebhookMemoryStorage.length} failed webhooks to file`);
    } catch (err) {
        console.error('Failed to save Failed Webhook:', err);
    }
}

async function getFailedWebhook() {
    try {
        const failedData = await fsPromises.readFile(failedWebhookPath, 'utf8');
        const fileData = JSON.parse(failedData);
        
        // Check if memory storage has elements
        if (failedWebhookMemoryStorage && failedWebhookMemoryStorage.length > 0) {
            const aggregatedData = [...fileData, ...failedWebhookMemoryStorage];
            return aggregatedData;
        }
        
        return fileData;
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log('No failed webhook file found, returning empty array');
        } else{
            console.error('Error reading failed webhook file:', err);
        }
        return getFailedWebhookfromMemory();
    }
}
async function getFailedWebhookfromMemory() {
    return failedWebhookMemoryStorage ? failedWebhookMemoryStorage : [];
}


// Webhook data validation
async function webhookVerification(notification, donation, wallet) {
    let checkout;
    try {
        checkout = await shiftProcessor.sideshift.getCheckout(donation.id);
    } catch (err) {
        return false;
    }

    if (!checkout || !notification || !donation || !wallet) return false;

    const shift = await shiftProcessor.sideshift.getShift(notification.payload.shiftId?.toString());

    // Extract and normalize data
    const getData = (data) => ({
        amount: Number(data?.settleAmount) || Number(data?.amountCrypto) || "unknown",
        coin: (data?.settleCoin && data.settleCoin.toLowerCase()) || (data?.coin && data.coin.toLowerCase()) || 'unknown',
        network: (data?.settleNetwork && data.settleNetwork.toLowerCase()) || (data?.network && data.network.toLowerCase()) || 'unknown',
        address: (data?.settleAddress && data.settleAddress.toLowerCase()) || (data?.address && data.address.toLowerCase()) || 'unknown'
    });

    const checkoutData = getData(checkout);
    const shiftData = getData(shift);
    const donationData = getData(donation);
    const walletData = getData(wallet);

    if (checkoutData.amount !== shiftData.amount ||
        shiftData.amount !== donationData.amount) {
        return false;
    }

    if (checkoutData.address !== walletData.address ||
        walletData.address !== shiftData.address) {
        return false;
    }

    if (checkoutData.coin !== shiftData.coin ||
        shiftData.coin !== walletData.coin) {
        return false;
    }

    if (checkoutData.network !== shiftData.network ||
        shiftData.network !== walletData.network) {
        return false;
    }

    return shift;
}

// Wehhook handler
async function handlingWebhookData(req, notification, project, projectDonation) {
    const notificationId = notification.meta.hook.id?.toString();
    const notificationStatus = notification.payload.status?.toString();
    // const shiftId = notification.payload.shiftId?.toString();
    const project_Id = project._id;
    const projectId = project.id;
    const donationId = projectDonation.id;
    try {
        if (projectDonation.status !== "success" && projectDonation.status !== "cancelled") {

            switch (notificationStatus) {
                // case 'pending':
                //     await mongoDonation.updateDonationById(project_Id, donationId, { status: "pending" });
                //     if (verbose) console.log(`webhook ${notificationId} - Payment pending`);
                //     break;
                // case 'completed':
                //     await mongoDonation.updateDonationById(project_Id, donationId, { status: "completed" });
                //     if (verbose) console.log(`webhook ${notificationId} - Payment completed`);
                //     break;
                case 'success':
                    // Validate donation
                    const verification = await webhookVerification(notification, projectDonation, project.wallet);
                    if (verification) {
                        await confirmCryptoPayment(notificationId, projectId, verification);
                        if (verbose) console.log(`webhook ${notificationId} - Payment settled successfully`);
                    } else {
                        // Set error status on donation
                        await mongoDonation.updateDonationById(project_Id, donationId, { status: "error" });
                        if (verbose) console.log(`Error during webhook verification: ${notificationId}`, notification, projectDonation);
                    }
                    break;
                case 'cancelled':
                    await resetCryptoPayment(notificationId, projectId, "cancelled");
                    if (verbose) console.log(`webhook ${notificationId} - Payment cancelled`);
                    break;
                default:
                    if (verbose) console.log(`Unknown status: ${notificationId} ${notificationStatus}`);
            }

            return true;
        } else {
            if (verbose) console.log(`Error during webhook verification, donation already processed: ${notificationId}`, notification, projectDonation);

            return false;
        }
    } catch (updateError) {
        saveFailedWebhook(req, updateError, projectId, donationId);
        if (verbose) console.log(`webhook ${notificationId} - Error updating project DB`, updateError);

        return false;
    }
}



// SidesShift notification webhook
app.post('/api/webhooks/sideshift', highTrafficLimiter, async (req, res) => {
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    // Check if signature header exists
    const signature = req.headers['x-sai-signature'];
    console.log('Signature found:', !!signature);

    const notification = req.body;

    const successMessage = "OK";
    const errorMessage = "webhook received - Error while processing webhook data";

    try {
        const contentType = req.get('content-type');

        if (contentType !== 'application/json') {
            return res.status(200).json('Content-Type must be application/json');
        }

        const notificationId = notification.meta.hook.id;
        const notificationStatus = notification.payload.status;
        // const shiftId = notification.payload.shiftId;
        let project, projectDonation;

        try {
            project = await mongoFind.findProjectByDonationId(notificationId);
            projectDonation = await mongoFind.findDonationById(notificationId);
        } catch (error) {
            saveFailedWebhook(req, error);
            if (verbose) console.log(`webhook ${notificationId} - Error cannot get data from DB`, error);
            return res.status(200).send(successMessage);
        }

        if (!project) {
            if (verbose) console.log(`webhook ${notificationId} - Error cannot get project data`);
            return res.status(200).send('Error internal data not found');
        }
        if (!projectDonation) {
            if (verbose) console.log(`webhook ${notificationId} - Error cannot get project donation data`);
            return res.status(200).send('Error internal data not found');
        }

        // Check webhook status
        const STATUSES = ['cancelled', 'success']; // 'pending', 'completed', 'settled',
        if (!STATUSES.includes(notificationStatus)) {
            return res.status(200).send('Webhook received with unknown status');
        }

        // Check if already processed
        if (notificationStatus === projectDonation.status) {
            return res.status(200).send('Already processed');
        }

        const isHandled = await handlingWebhookData(req, notification, project, projectDonation);

        if (isHandled) {
            return res.status(200).send(successMessage);
        } else {
            return res.status(200).send(errorMessage);
        }

    } catch (err) {
        saveFailedWebhook(req, err);

        if (verbose) console.error("Error processing webhook:", err);
        return res.status(200).send(errorMessage);
    }
});


async function isDonationExist(_id) {
    if (!mongoose.Types.ObjectId.isValid(_id)) return null;

    const donation = await mongoFind.findDonationBy_Id(_id);

    if (!donation) return null;

    return donation;
}

app.get("/donation-checkout/:status/:projectId/:paymentId", highTrafficLimiter, async function (req, res) {
    try {
        if (!validateProjectId(req.params.projectId)) return res.redirect('/404');
        if (!["success", "cancel"].includes(req.params.status)) return res.redirect('/404');

        const { status, projectId, paymentId } = req.params;

        const donation = await isDonationExist(paymentId);
        if (!donation) return res.status(404).render('error', { error: { title: "Error processing donation", message: "Donation not found" } });

        const project = await mongoFind.findById(projectId);
        if (!project) return res.status(404).render('error', { error: { title: "Error processing donation", message: "Project not found" } });

        // Update project
        if (status === "success") {
            const shift = await shiftProcessor.sideshift.getShift(donation.currency.shiftId);
            if (!shift) return res.status(404).render('error', { error: { title: "Error processing donation", message: "Payment not found" } });

            if (donation.status === "success") {
                if (shift.status === "settled") {
                    return res.render('success-cancel', { success: donation, shift, project: { id: project.id, data: project.projectData } });
                } else {
                    return res.render('error', { error: { title: "Waiting confirmation", message: "Still waiting confirmation of donation settlement" } });
                }

            } else {
                if (donation.status === "pending" || donation.status === "completed") {
                    return res.render('error', { error: { title: "Waiting confirmation", message: "Still waiting confirmation of donation settlement" } });
                } else {
                    return res.render('error', { error: { title: "Error", message: "No confirmation of donation settlement" } });
                }
            }

        } else if (status === "cancel" || status === "expired") {
            // Remove if webhook start notify cancel
            await resetCryptoPayment(donation.id, projectId, "cancelled");

            return res.render('success-cancel', { cancel: donation });
        }

    } catch (err) {
        if (verbose) console.error("Error in donation-checkout route:", err);
        return res.status(500).render('error', { error: { title: "Error processing donation", message: err?.message || 'Unknown error' } });
    }
});

app.post("/donate-checkout/:id", donationLimiter, async function (req, res) {
    try {
        if (!validateProjectId(req.params.id)) return res.redirect('/404');

        const project = await mongoFind.findById(req.params.id);

        if (!project) return res.redirect('/404');

        const amountUsd = Number(DOMPurify.sanitize(req.body.amountUsd, sanitizeConfig));

        const totalAmountFIAT = Number(amountUsd);
        if (isNaN(totalAmountFIAT) || totalAmountFIAT <= 0 || totalAmountFIAT > CURRENCY_SETTING.SHIF_LIMIT_USD) {
            return res.status(400).render('error', { error: { title: "Invalid total amountUsd", message: "Invalid total amountUsd" } });
        }

        let donor = shiftProcessor.helper.sanitizeString(DOMPurify.sanitize(req.body.amountUsd, sanitizeConfig));
        if (!donor || donor === "") donor = "Anon";

        const settleCoin = project.wallet.coin;
        const settleNetwork = project.wallet.network;
        const settleAmount = await shiftProcessor.usdToSettleAmount(amountUsd, settleCoin, settleNetwork);

        const paymentId = new mongoose.Types.ObjectId();
        const paymentIdString = paymentId.toString();

        console.log(paymentId, paymentIdString, settleCoin, settleNetwork, project.wallet.address, Number(settleAmount))

        const checkout = await shiftProcessor.requestCheckout({
            settleCoin: settleCoin,
            settleNetwork: settleNetwork,
            settleAddress: project.wallet.address,
            settleMemo: null,
            settleAmount: Number(settleAmount),
            successUrl: `${BASE_URL}/donation-checkout/success/${project.id}/${paymentIdString}`,
            cancelUrl: `${BASE_URL}/donation-checkout/cancel/${project.id}/${paymentIdString}`,
            userIp: shiftProcessor.helper.extractIPInfo(req.ip).address
        })

        if (!checkout.link) throw new Error('No sideshift redirection link');

        const donationData = {
            _id: paymentId,
            id: checkout.id,
            donor: donor,
            status: "waiting",
            amountUsd: Number(amountUsd),
            amountCrypto: Number(settleAmount),
            message: DOMPurify.sanitize(req.body.message, sanitizeConfig),
            date: new Date(),
            // expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15min - Default expire after 1h
        }

        await mongoDonation.addDonation(project._id, donationData);

        // Redirect to SideShift checkout page
        res.redirect(checkout.link);
    } catch (err) {
        if (verbose) console.error("Error in donation-checkout POST route:", err);
        return res.status(500).render('error', { error: { title: "Error setting donation chechout", message: err?.message || 'Unknown error' } });
    }
});







// Verify signature
const verifySignature = require('./modules/verifySignature.js');

async function isSignatureValid({ message, signature, address, action = null }) {
    const isValid = await verifySignature({ message, signature, address });
    if (!isValid.valid) {
        return false;
    }

    return true;
}

const sanitizeFields = (fields, config) => {
    const sanitized = {};
    Object.keys(fields).forEach(key => {
        sanitized[key] = DOMPurify.sanitize(fields[key], config);
    });

    return sanitized;
};

const sanitizeLinks = (reqBody, config) => ({
    instagram: String(DOMPurify.sanitize(reqBody.instagramLink, config)),
    facebook: String(DOMPurify.sanitize(reqBody.facebookLink, config)),
    reddit: String(DOMPurify.sanitize(reqBody.redditLink, config)),
    youtube: String(DOMPurify.sanitize(reqBody.youtubeLink, config)),
    x: String(DOMPurify.sanitize(reqBody.xLink, config)),
    website: String(DOMPurify.sanitize(reqBody.websiteLink, config))
});


// Creation Page
async function getCryptocurrencyUsdRate(coinNetwork) {
    if (shiftProcessor.helper.isUsdStableCoin(coinNetwork)) {

        return 1;
    } else {
        const pairData = await shiftProcessor.sideshift.getPair("USDT-bsc", coinNetwork);

        return Number(pairData.rate);
    }
}

async function getGoalCryptocurrency(project) {
    const projectCoinNetwork = shiftProcessor.helper.getCoinNetwork(project.wallet.coin, project.wallet.network);
    const rate = await getCryptocurrencyUsdRate(projectCoinNetwork);
    return Number((project.goal.goalUsd * rate).toFixed(8));
}

const signatureMinLength = 16;
const signatureMaxLength = 150;
const PROJECT_MAX_IMAGE = 6;


app.get('/create', (req, res) => {
    try {
        return res.render('create', { coinsDepositList: availableCoins });
    } catch (err) {
        if (verbose) console.error("Error in create route:", err);
        return res.status(500).render('error', { error: { title: "Error loading coins data", message: "Coin list is missing" } });
    }
});

const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

app.post('/create', upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'images', maxCount: PROJECT_MAX_IMAGE }
]), donationLimiter, async (req, res) => {
    try {
        const { owner, title, description, goal, deadline, displayWallet, payWith, address, signature, message } = req.body;
        if (!owner || !title || !description || !goal || !deadline || !payWith || !address || !signature) {
            return res.render('create', { error: 'All fields are required' });
        }
        const getPayWithParsed = JSON.parse(DOMPurify.sanitize(payWith, sanitizeConfig));
        const getPayWithCoin = getPayWithParsed[0].split('-');

        // Self signature
        let selfSignedBool;
        const selfSigned = String(req.body.sefSigned);
        const isSelfSignedUsingAnotherWallet = String(DOMPurify.sanitize(req.body.sefSignedAddress, sanitizeConfig));

        const cleanSignatureData = sanitizeFields({
            address,
            message,
            signature
        }, sanitizeConfig);

        // Metamask Signature 
        const cleadAddress = cleanSignatureData.address;
        let signatureAddress = cleadAddress;
        let cleanMessage = cleanSignatureData.message;
        let cleanSignature = cleanSignatureData.signature;

        if (cleanMessage.length > 64) {
            return res.render('error', { error: { title: "Signature Error", message: "Cannot create - Invalid signature message" } });
        }
        if (cleanSignature.length < signatureMinLength) {
            return res.render('error', { error: { title: "Signature Error", message: `Cannot create - Self signed key must be minimum ${signatureMinLength} characters` } });
        }
        if (cleanSignature.length > signatureMaxLength) {
            return res.render('error', { error: { title: "Signature Error", message: `Cannot create - Self signed key must be maximun ${signatureMaxLength} characters` } });
        }

        if (selfSigned.toLowerCase() === "true" && isSelfSignedUsingAnotherWallet !== "") {
            selfSignedBool = true;
            signatureAddress = isSelfSignedUsingAnotherWallet;
        } else if (selfSigned.toLowerCase() === "true" && isSelfSignedUsingAnotherWallet === "") {
            selfSignedBool = true;
            signatureAddress = "none";
        } else {
            selfSignedBool = selfSigned && selfSigned.toLowerCase() === 'true';
        }

        // Verify signature
        if (!selfSignedBool) {
            const isValid = await isSignatureValid({ message: cleanMessage, signature: cleanSignature, address: signatureAddress, action: "create" });
            if (!isValid) {
                return res.render('error', { error: { title: "Wrong wallet signature", message: "Cannot create - Wrong wallet signature" } });
            }
        }

        // Limit creation per wallet // TODO add double check wallet.address and signature.address
        if (Number(await mongoFind.findHowManyAccountPerWallet(address)) <= 2) {
            let country = null;
            let city = null;
            if (req.body.country) country = String(req.body.country)
            if (req.body.city) city = String(req.body.city)

            const isAvatar = req.files.avatar; //  ? `/uploads/${req.files.avatar[0].filename}` : null;
            let avatar;

            if (isAvatar && isAvatar !== "/img/avatar.jpg") {
                if (!imageTypes.includes(req.files.avatar[0].mimetype)) {
                    return res.render('error', { error: { title: "File Upload Error", message: "Only image files are allowed. Supported formats: JPEG, PNG, GIF, WebP" } });
                }

                const avatarFileName = "avatar-" + generateRandomString(12);
                const avatarExt = req.files.avatar[0].filename.split('.').pop();
                avatar = `/uploads/${avatarFileName}.${avatarExt}`;
                console.log("avatar: " + avatar);

                // Create paths
                const oldPathAvatar = __dirname + '/public/uploads/' + req.files.avatar[0].filename;
                const newPathAvatar = __dirname + '/public' + avatar;

                // Rename the file
                try {
                    await fs.promises.rename(oldPathAvatar, newPathAvatar);
                } catch (error) {
                    console.error('Error renaming file:', error);
                }
            }

            // Handle image files with limit
            let images = [];
            if (req.files.images && req.files.images.length > 0 && req.files.images.length <= PROJECT_MAX_IMAGE) {
                for (const file of req.files.images) {
                    if (!imageTypes.includes(file.mimetype)) {
                        return res.render('error', { error: { title: "File Upload Error", message: "Only image files are allowed. Supported formats: JPEG, PNG, GIF, WebP" } });
                    }

                    const newFileName = generateRandomString(12);

                    const ext = file.originalname.split('.').pop();
                    const newFileNameWithExt = newFileName + '.' + ext;

                    const oldPath = __dirname + '/public/uploads/' + file.filename;
                    const newPath = __dirname + '/public/uploads/' + newFileNameWithExt;

                    try {
                        await fs.promises.rename(oldPath, newPath);
                    } catch (error) {
                        console.error('Error renaming file:', error);
                    }

                    images.push({
                        url: `/uploads/${newFileNameWithExt}`,
                        filename: newFileNameWithExt,
                        originalName: file.originalname
                    });
                }
            }

            const projectId = generateRandomString(PROJECT_ID_LENGTH);

            const cleanData = sanitizeFields({
                owner,
                country,
                city,
                title,
                description,
                deadline,
                displayWallet
            }, sanitizeConfig);

            const newProject = {
                id: projectId,
                status: "active",
                owner: {
                    name: cleanData.owner,
                    country: cleanData.country,
                    city: cleanData.city,
                    avatar
                },
                projectData: {
                    title: cleanData.title,
                    description: cleanData.description,
                    images: images,
                    links: sanitizeLinks(req.body, sanitizeConfig),
                    creation: new Date(),
                    deadline: new Date(cleanData.deadline),
                },
                goal: {
                    goalUsd: Number(parseFloat(goal)),
                    raisedUsd: 0,
                    raisedCryptocurrency: 0,
                },
                wallet: {
                    coin: getPayWithCoin[0],
                    network: getPayWithCoin[1],
                    address: cleadAddress,
                    displayWallet: cleanData.displayWallet && cleanData.displayWallet.toLowerCase() === 'true',
                    ...(req.body.memo && { "memo": String(req.body.memo) }),
                },
                auth: {
                    signatureAddress: signatureAddress,
                    signatureHash: cleanSignature,
                    selfSigned: selfSignedBool,
                }
            };

            newProject.goal.goalCryptocurrency = await getGoalCryptocurrency(newProject);

            // Add project to DB
            await mongoManager.addProject(newProject);

            res.redirect(`/project/${newProject.id}`);
        } else {
            return res.status(429).render('error', { error: { title: "Maximum project exeeded", message: "You cannot create more than 2 project" } });
        }

    } catch (err) {
        if (verbose) console.error("Error in create POST route:", err);
        return res.status(500).render('error', { error: { title: "Error creating project", message: err?.message || 'Unknown error' } });
    }
});


// Edition page
async function editUpdate(project, { title, description, country, city, goal, deadline, links, displayWallet, imagesDelete = null, imagesAdd = null }) {
    try {
        const currentProject = project;
        const project_Id = project._id
        const updateData = {};

        // Only add fields that actually changed
        if (currentProject.projectData?.title !== title) {
            updateData['projectData.title'] = title;
        }
        if (currentProject.projectData?.description !== description) {
            updateData['projectData.description'] = description;
        }
        if (currentProject.owner?.country !== country) {
            updateData['owner.country'] = country;
        }
        if (currentProject.owner?.city !== city) {
            updateData['owner.city'] = city;
        }
        if (currentProject.goal?.goalUsd !== parseFloat(goal)) {
            updateData['goal.goalUsd'] = parseFloat(goal);
        }
        if (currentProject.projectData?.deadline !== new Date(deadline).toISOString()) {
            updateData['projectData.deadline'] = new Date(deadline);
        }
        if (JSON.stringify(currentProject.projectData?.links) !== JSON.stringify(links)) {
            updateData['projectData.links'] = links;
        }
        if (currentProject.wallet?.displayWallet !== (displayWallet && displayWallet.toLowerCase() === 'true')) {
            updateData['wallet.displayWallet'] = displayWallet && displayWallet.toLowerCase() === 'true';
        }

        // Only update if there are changes
        if (Object.keys(updateData).length > 0) {
            await mongoManager.updateProjectById(project_Id, updateData);
        }

        if (imagesDelete) {
            for (const imgUrl of imagesDelete) {
                try {
                    await mongoManager.removeimageByUrl(project_Id, imgUrl);

                    const filePath = __dirname + '/public' + imgUrl;
                    await fs.promises.unlink(filePath);

                    console.log(`Successfully removed image: ${imgUrl}`);
                } catch (dbError) {
                    console.error(`Database removal failed for ${imgUrl}:`, dbError);
                }
            }
        }

        if (imagesAdd) {
            for (const imageData of imagesAdd) {
                await mongoManager.addImage(project_Id, imageData);
            }
        }
    } catch (err) {
        console.error('Error updating project:', err);
        throw err;
    }
}

app.get('/edit/:id', async (req, res) => {
    try {
        if (!validateProjectId(req.params.id)) return res.redirect('/404');

        const project = await mongoFind.findById(req.params.id);

        if (!project) return res.redirect('/404');

        // const message = generateRandomString(64);

        return res.render('edit', { project });
    } catch (err) {
        if (verbose) console.error("Error in edit route:", err);
        return res.status(500).render('error', { error: { title: "Error loading project data", message: err?.message || 'Unknown error' } });
    }
});

app.post('/edit/:id', upload.array('images', PROJECT_MAX_IMAGE), donationLimiter, async (req, res) => {
    try {
        const projectId = DOMPurify.sanitize(req.params.id, sanitizeConfig);
        if (!validateProjectId(projectId)) return res.redirect('/404');

        const project = await mongoFind.findById(projectId);

        if (!project) return res.redirect('/404');

        const { title, description, country, city, goal, deadline, displayWallet, signature, message } = req.body;

        if (!title || !description || !goal || !deadline || !displayWallet || !signature) {
            return res.render('edit', { project, error: 'All fields are required' });
        }

        const links = sanitizeLinks(req.body, sanitizeConfig);

        // Add image
        let addImages = null;
        if (req.files && req.files.length > 0 && req.files.length <= PROJECT_MAX_IMAGE) {
            addImages = [];
            req.files.forEach(file => {
                addImages.push({
                    url: `/uploads/${file.filename}`,
                    filename: file.filename,
                    originalName: file.originalname
                });
            });
        }

        // Remove images
        const { imagesRemove } = req.body;
        let removeImages;
        if (!imagesRemove || !Array.isArray(imagesRemove) || imagesRemove.length === 0) {
            removeImages = null;
        } else {
            removeImages = imagesRemove;
        }

        // Verify signature
        const cleanMessage = DOMPurify.sanitize(message, sanitizeConfig);
        const cleanSignature = DOMPurify.sanitize(signature, sanitizeConfig);

        if (cleanSignature.length < signatureMinLength) {
            return res.render('error', { error: { title: "Wrong wallet signature", message: "Cannot edit - Wrong wallet signature" } });
        }
        if (cleanSignature.length > signatureMaxLength) {
            return res.render('error', { error: { title: "Wrong wallet signature", message: "Cannot edit - Wrong wallet signature" } });
        }

        let cleanData = sanitizeFields({
            title,
            description,
            country,
            city,
            deadline,
            displayWallet
        }, sanitizeConfig);

        cleanData = {
            ...cleanData,
            links,
            goal,
            imagesDelete: removeImages,
            imagesAdd: addImages
        }


        if (!project.auth.selfSigned || project.auth.selfSigned && project.auth.signatureAddress !== "none") {
            const isValid = await isSignatureValid({ res, message: cleanMessage, signature: cleanSignature, address: project.auth.signatureAddress, action: "edit" });
            if (!isValid) {
                return res.render('error', { error: { title: "Wrong wallet signature", message: "Cannot edit - Wrong wallet signature" } });
            }

            // Update project
            await editUpdate(project, cleanData);
        }
        else if (project.auth.selfSigned && cleanSignature === project.auth.signatureHash) {
            // Update project
            await editUpdate(project, cleanData);
        } else {
            return res.render('error', { error: { title: "Wrong wallet signature", message: "Cannot edit - Wrong wallet signature" } });
        }

        res.redirect(`/project/${projectId}`);
    } catch (err) {
        if (verbose) console.error("Error in edit POST route:", err);
        return res.status(500).render('error', { error: { title: "Error editing project", message: err?.message || 'Unknown error' } });
    }
});


// Delete page
async function deleteImagesFromServer(images) {
    for (const urlObj of images) {
        try {
            const imgUrl = urlObj.url;
            const filePath = __dirname + '/public' + imgUrl;
            await fs.promises.unlink(filePath);

            console.log(`Successfully removed image: ${imgUrl}`);
        } catch (dbError) {
            console.error(`Database removal failed for ${urlObj}:`, dbError);
        }
    }
}

app.get('/delete/:id', async (req, res) => {
    try {
        if (!validateProjectId(req.params.id)) return res.redirect('/404');

        const projectId = String(req.params.id);

        const project = await mongoFind.findById(projectId);

        if (!project) return res.redirect('/404');

        return res.render('delete', { project });
    } catch (err) {
        if (verbose) console.error("Error in delete route:", err);
        return res.status(500).render('error', { error: { title: "Error deleting project", message: err?.message || 'Unknown error' } });
    }
});

app.post('/delete/:id', donationLimiter, async (req, res) => {
    try {
        if (!validateProjectId(req.params.id)) return res.redirect('/404');

        const projectId = String(req.params.id);

        const project = await mongoFind.findById(projectId);
        if (!project) return res.redirect('/404');

        const project_Id = project._id;

        const { signature, message } = req.body;


        if (project.donations.length === 0 && project.goal.raisedUsd === 0) {
            // Verify signature
            if (!project.auth.selfSigned || project.auth.selfSigned && project.auth.signatureAddress !== "none") {
                const isValid = await isSignatureValid({ res, message, signature, address: project.auth.signatureAddress, action: "delete" });
                if (!isValid) {
                    return res.render('error', { error: { title: "Cannot delete", message: "Wrong wallet signature" } });
                }

                // Removes images from disk
                if (project.projectData.images.length > 0) {
                    if (project.owner.avatar !== "/img/avatar.jpg") project.projectData.images.push({ url: project.owner.avatar })
                    await deleteImagesFromServer(project.projectData.images);
                }
                // Delete project
                await mongoManager.deleteProject(project_Id);
            }
            else if (project.auth.selfSigned && signature === project.auth.signatureHash) {
                // Removes images from disk
                if (project.projectData.images.length > 0) {
                    if (project.owner.avatar !== "/img/avatar.jpg") project.projectData.images.push(project.owner.avatar)
                    await deleteImagesFromServer(project.projectData.images);
                }
                // Delete project
                await mongoManager.deleteProject(project_Id);
            }
        } else {
            return res.render('error', { error: { title: "Cannot delete", message: "Project already have donation" } });
        }

        res.redirect(`/projects`);
    } catch (err) {
        if (verbose) console.error("Error in delete POST route:", err);
        return res.status(500).render('error', { error: { title: "Error deleting project", message: err?.message || 'Unknown error' } });
    }
});


// Report abusive project
app.post('/report/:id', donationLimiter, async (req, res) => {
    try {
        const project = await mongoFind.findById(req.params.id);
        if (!project) return res.redirect('/404');

        await mongoManager.updateProjectById(project._id, { "isReported": project.isReported + 1 });

        res.redirect(`/project/${req.params.id}`)
    } catch (err) {
        return res.status(500).render('error', { error: { title: "Error reporting project", message: err?.message || 'Unknown error' } });
    }
});



// 404 handler
app.use((req, res) => {
    return res.status(404).render('error', {
        error: {
            title: "Error 404",
            message: "Page not found",
            // background_error: conf.Pic_404, 
        }
    });
});



// Graceful shutdown handler
async function shutdownHandler() {
    console.log(`\nShutting down server...`);

    // Save important data
    if (failedWebhookMemoryStorage.length > 0) {
        console.log('Saving failed webhook');
        await saveFailedWebhookToFile();
    }

    // Clean up on shutdown
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        console.log('Cleanup interval cleared');
    }

    setTimeout(() => {
        process.exit(0);
    }, 100);
}

// Handle different shutdown signals
process.on('SIGTERM', shutdownHandler);
process.on('SIGINT', shutdownHandler);
process.on('SIGQUIT', shutdownHandler);

// Also handle uncaught exceptions
process.on('uncaughtException', async (err) => {
    if (err) {
        console.error('Uncaught Exception:', err);
    } else {
        console.error('Uncaught Exception');
    }

    try {
        await shutdownHandler();
    } catch (error) {
        console.error('Error during exception handling:', error);
    }

    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
    if (reason) {
        console.error('Unhandled Rejection:', reason);
    } else {
        console.error('Unhandled Rejection');
    }

    try {
        await shutdownHandler();
    } catch (error) {
        console.error('Error during rejection handling:', error);
    }

    process.exit(1);
});



// Start server after receiving the coin list and new icons from sideshift API
shiftProcessor.updateCoinsList("public/icons").then((response) => {
    console.log('Initial coins list loaded');
    availableCoins = response.availableCoins;

    app.listen(port, () => {
        console.log(`HTTP Server running at http://localhost:${port}/`);
    });

    setInterval(async () => {
        try {
            const result = await shiftProcessor.updateCoinsList(iconsPath);
            availableCoins = result.availableCoins;
            await updateLastRates();
            await mongoManager.updateProjectsStatus();
        } catch (err) {
            console.error('Failed to update coins list data:', err);
        }
    }, 12 * 60 * 60 * 1000);
}).catch(err => {
    console.error('Failed to load initial coins list:', err);
    process.exit(1);
});
