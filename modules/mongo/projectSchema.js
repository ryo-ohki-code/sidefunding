const mongoose = require('mongoose');

// const paymentSchema = new mongoose.Schema({
//     paymentId: {
//         type: String,
//         required: true,
//         unique: true
//     },
//     projectId: {
//         type: String,
//         required: true,
//     },
//     createdAt: {
//         type: Date,
//         default: Date.now
//     },
//     expiresAt: {
//         type: Date,
//         required: true,
//         default: new Date(Date.now() + 60 * 60 * 1000)
//     }
// }, {
//     timestamps: true
// });

const projectSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'invisible', 'stopped', 'banned'],
        required: true,
        trim: true
    },
    owner: {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 3

        },
        country: String,
        city: String,
        avatar: {
            type: String,
            default: "/img/avatar.jpg"
        }
    },
    projectData: {
        title: {
            type: String,
            required: true,
            minlength: 10,
            maxlength: 80

        },
        description: {
            type: String,
            required: true,
            minlength: 150,
            maxlength: 2500
        },        
        images: [{
            url: String,
            filename: String,
            originalName: String
        }],
        links: {
            instagram: String,
            facebook: String,
            reddit: String,
            youtube: String,
            x: String,
            website: String
        },
        creation: {
            type: Date,
            required: true,
            default: Date.now,
            // validate: {
            //     validator: function(v) {
            //         return v instanceof Date && !isNaN(v);
            //     },
            //     message: 'Creation date must be a valid date'
            // }
        },
        deadline: {
            type: Date,
            required: true,
            validate: {
                validator: function (v) {
                    // Must be a valid date
                    if (!(v instanceof Date) || isNaN(v)) {
                        return false;
                    }

                    // Deadline cannot be in the past
                    const now = new Date();
                    if (v < now) {
                        return false;
                    }

                    // Creation date should exist and be valid
                    if (this.creation && v <= this.creation) {
                        return false;
                    }

                    return true;
                },
                message: 'Deadline must be a future date and after creation date'
            }
        },
        lastUpdate: Date
    },
    goal:{
        goalUsd: {
            type: Number,
            required: true,
            min: [20, 'Minimum goal is 20$USD'],
            max: [1000000, 'Maximum goal is 1M$USD']
        },
        goalCryptocurrency: {
            type: Number,
            required: true
        },
        raisedUsd: {
            type: Number,
            default: 0
        },
        raisedCryptocurrency: {
            type: Number,
            default: 0
        }
    },
    wallet: {
        coin: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            // validate: {
            //     validator: function(v) {
            //         const validCoins = ['BTC', 'ETH', 'USDT', 'BNB', ... get list];
            //         return validCoins.includes(v);
            //     },
            //     message: 'Please enter a valid cryptocurrency'
            // }
        },
        network: {
            type: String,
            required: true,
            trim: true,
            // validate: {
            //     validator: function(v) {
            //         const validNetworks = ['ethereum', 'bitcoin', 'binance', 'solana', 'cardano', 'polkadot'];
            //         return validNetworks.includes(v);
            //     },
            //     message: 'Please enter a valid network'
            // }
        },
        address: {
            type: String,
            required: true,
            trim: true,
            // validate: {
            //     validator: function(v) {
            //         if (!v || v.length < 20) return false;
            //         // Add more specific validation based on coin type
            //         return true;
            //     },
            //     message: 'Please enter a valid wallet address'
            // }
        },
        memo: {
            type: String,
            trim: true,
            maxlength: 100
        },
        displayWallet: {
            type:Boolean,
            required: true,
            default: false
        }
    },
    auth: {
        signatureAddress: {
            type: String,
            required: true,
            default: "none"
        },
        signatureHash: {
            type: String,
            required: true,
            minlength: 16,
            maxlength: 150
        },  // Store hash instead of raw signature
        selfSigned: {
            type: Boolean,
            required: true
        },
    },
    donations: [{
        id: {
            type: String,
            required: true,
            // unique: true,
        },
        donor: String,
        status: {
            type: String,
            enum: ['waiting', 'pending', 'settled', 'success', 'completed', 'cancelled', 'error'],
            default: 'waiting'
        },
        currency: {
            coin: {
                type: String,
                // required: true
            },
            network: {
                type: String,
                // required: true
            },
            amount: {
                type: Number,
                // required: true
            },
            txDepositHash: {
                type: String,
                // required: true
            },
            txSettleHash: {
                type: String,
                // required: true
            },
            shiftId: {
                type: String,
                // required: true
            }
        },
        amountUsd: {
            type: Number,
            min: [0, 'Amount must be zero or positive'],
            max: [20000, 'Max amount USD is 20000'],
            required: [true, 'amountUsd is required'],
        },
        amountCrypto: {
            type: Number,
            min: [0, 'Amount must be zero or positive'],
            required: [true, 'amountCrypto is required'],
        },
        message:{
            type: String,
            maxlength: 400
        },
        date: {
            type: Date,
            required: true,
            default: new Date()
        },
        expiresAt: {
            type: Date,
            required: true,
            default: new Date(Date.now() + 60 * 60 * 1000)
        }
    }],
    isReported: {
        type: Number,
        required: true,
        default: 0
    }
});

// Add index for better performance
// projectSchema.index({ title: "text", owner: "text", description: "text" });

// Donation expiration
// db.projects.createIndex({ "donations.expiresAt": 1 }, { expireAfterSeconds: 3600 })


// Middleware to hash password before saving
// const bcrypt = require('bcryptjs');
// projectSchema.pre('save', async function(next) {
//   // Only hash the password if it has been modified
//   if (!this.isModified('auth.signatureHash')) return next();

//   // Validate password strength
//   if (this.auth.signatureHash.length < 16) {
//     return next(new Error('Signature must be at least 16 characters long'));
//   }

//   // Check for signature complexity
//   const hasUpperCase = /[A-Z]/.test(this.auth.signatureHash);
//   const hasLowerCase = /[a-z]/.test(this.auth.signatureHash);
//   const hasNumbers = /\d/.test(this.auth.signatureHash);
  
//   if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
//     return next(new Error('Password must contain uppercase, lowercase, and numbers'));
//   }

//   try {
//     // Generate salt
//     const salt = await bcrypt.genSalt(12);
//     // Hash the password
//     this.auth.signatureHash = await bcrypt.hash(this.auth.signatureHash, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// // Add method to compare passwords
// projectSchema.methods.comparePassword = async function(candidatePassword) {
//   return await bcrypt.compare(candidatePassword, this.auth.signatureHash);
// };



module.exports = { projectSchema };
