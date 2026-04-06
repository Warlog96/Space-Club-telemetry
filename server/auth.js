const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '24h'; // Token expires in 24 hours

// Load admin credentials from file
function loadCredentials() {
    try {
        const credPath = path.join(__dirname, 'admin-credentials.json');
        const data = fs.readFileSync(credPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('[Auth] Error loading credentials:', error.message);
        return null;
    }
}

// Generate password hash (utility function for setup)
async function generatePasswordHash(plainPassword) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(plainPassword, salt);
    return hash;
}

// Verify login credentials
async function verifyLogin(username, password) {
    const credentials = loadCredentials();

    if (!credentials) {
        return { success: false, message: 'Credentials file not found' };
    }

    if (username !== credentials.username) {
        return { success: false, message: 'Invalid username or password' };
    }

    const isValid = await bcrypt.compare(password, credentials.passwordHash);

    if (!isValid) {
        return { success: false, message: 'Invalid username or password' };
    }

    // Generate JWT token
    const token = jwt.sign(
        { username: credentials.username, role: 'admin' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );

    return {
        success: true,
        token,
        username: credentials.username
    };
}

// Verify JWT token
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { valid: true, data: decoded };
    } catch (error) {
        return { valid: false, message: error.message };
    }
}

// Middleware to protect routes
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const verification = verifyToken(token);

    if (!verification.valid) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = verification.data;
    next();
}

module.exports = {
    generatePasswordHash,
    verifyLogin,
    verifyToken,
    authMiddleware
};
