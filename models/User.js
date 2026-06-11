// import mongoose
const mongoose = require('mongoose');

// define the schema. 
// A schema is the blueprint — it tells MongoDB exactly what a user document looks like.
const UserSchema = new mongoose.Schema({

    name : {
        type : String,
        required : true //means MongoDB will reject any user document that doesn't have a name.
    },

    email : {
        type : String,
        unique : true,
        required : true
    },

    password : {  //This will store the hashed password, never the plain text. 
        type : String,
        required : true,
        minlength : 8
    },

    targetCompanies : {
        type : [String], // means an array of strings — a user can target multiple companies. 
        default : []
    },

    createdAt : {
        type : Date,
        default : Date.now
    }

});

const User = mongoose.model('User', UserSchema);

module.exports = User;