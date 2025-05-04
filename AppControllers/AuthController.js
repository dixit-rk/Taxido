const jwt = require('jsonwebtoken');
const User = require('../DBControllers/UserSchema');

require('dotenv').config();

// JWT configuration from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = process.env.JWT_EXPIRE;
const COOKIE_EXPIRE = parseInt(process.env.COOKIE_EXPIRE);

// Create JWT Token
const createToken = (id) => {
    return jwt.sign({ id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRE
    });
};

// Send token response with cookie
const sendTokenResponse = (user, statusCode, res) => {
    const token = createToken(user._id);

    const options = {
        expires: new Date(Date.now() + COOKIE_EXPIRE),
        httpOnly: true
    };

    res.status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            token,
            redirectUrl: '/'
        });
};

// Register user
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Create user
        const user = await User.create({
            username,
            email,
            password
        });

        sendTokenResponse(user, 201, res);
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if email and password are provided
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide email and password'
            });
        }

        // Check user exists
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check password matches
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        sendTokenResponse(user, 200, res);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get user information
exports.getUserInfo = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Protect routes middleware
exports.protect = async (req, res, next) => {
    try {
        let token;

        // Get token from cookies
        if (req.cookies.token) {
            token = req.cookies.token;
        }

        // Check if token exists
        if (!token) {
            return res.redirect('/login');
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = await User.findById(decoded.id);
            next();
        } catch (err) {
            return res.redirect('/login');
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
