const jwt = require('jsonwebtoken');
const User = require('../DBControllers/UserSchema');

require('dotenv').config();

const protect = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(401).json({
                    success: false,
                    error: 'Not authorized'
                });
            }
            return res.redirect('/login');
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);
            
            if (!user) {
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    return res.status(401).json({
                        success: false,
                        error: 'User not found'
                    });
                }
                return res.redirect('/login');
            }

            req.user = user;
            next();
        } catch (err) {
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(401).json({
                    success: false,
                    error: 'Token invalid'
                });
            }
            return res.redirect('/login');
        }
    } catch (err) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                error: 'Server error'
            });
        }
        return res.redirect('/login');
    }
};

module.exports = { protect };
