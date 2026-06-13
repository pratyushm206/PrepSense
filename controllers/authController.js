const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const registerUser = async (req, res, next) => {
    try{
        const {name, email, password} = req.body;
        // prevents duplicate accounts and matches the Guide's consistent response shape (success/message).
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        //  never store plaintext passwords. 10 is the salt rounds — standard value, balances security vs speed.
        const hashedPassword = await bcrypt.hash(password, 10);

        // create the user in MongoDB
        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });

        // sign a JWT for the new user
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // sending response back
        // Notice password is deliberately absent — never send it back, even hashed.
        res.status(201).json({
            success: true,
            token,
            data: { id: user._id, name: user.name, email: user.email }
        });
    } catch(error){
        next(error);
    }

};

module.exports = { registerUser };