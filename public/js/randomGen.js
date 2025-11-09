function generateRandom(length = 64) {
    const array = crypto.getRandomValues(new Uint8Array(length));
    const secretKey = btoa(String.fromCharCode(...array)).replace(/[+/]/g, '').substring(0, length);
    return secretKey;
}