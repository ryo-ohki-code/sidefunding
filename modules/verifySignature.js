// Verify signature
const { ethers } = require('ethers');

async function verifySignature({ message, signature, address }) {
    try {
        // Verify the signature and message
        const recoveredAddress = ethers.recoverAddress(
            ethers.hashMessage(message),
            signature
        );

        // Check if the recovered address matches the provided address
        const isValid = recoveredAddress.toLowerCase() === address.toLowerCase();

        return {
            valid: isValid,
            recoveredAddress: recoveredAddress
        };
    } catch (err) {
        console.error('Verification error:', err);
        return {
            error: 'Invalid signature',
            recoveredAddress: '',
            valid: false
        };
    }
}

module.exports = verifySignature;
