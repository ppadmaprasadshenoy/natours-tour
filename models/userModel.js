const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please tell us your name'],
    },
    email: {
        type: String,
        required: [true, 'Please tell us your email address'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email' ]
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please provide a password'],
        validate: {
            // works only on CREATE and SAVE!!!
            validator: function(el){
                return el === this.password;
            },
            message: 'Passwords must be same!'
        }
    },
    passwordChangedAt : Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
  }
);

userSchema.pre('save', async function(next) {
    // Only run this function if password was actually modified
    if(!this.isModified('password')) return next();

    // Hash the pasword with cost 12
    this.password = await bcrypt.hash(this.password, 12);

    // Delete the passwordConfirm field
    this.passwordConfirm = undefined;
    next();
});

userSchema.pre('save', function(next) {
    if(!this.isModified('password') || this.isNew) return next();

    this.passwordChangedAt = Date.now() - 1000;             // Making sure token is generated after password is changed
    next(); 
});

// // to show only active users when do GET user request
userSchema.pre(/^find/, function(next) {                    // /^find/ Query middleware applied for anything that starts with 
    this.find({ active: {$ne: false }});
    next(); 
});

userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {          // candidatePassword - what we gave while login, userPassword - hashed password
    return await bcrypt.compare(candidatePassword, userPassword);                               // Its because of bcrypt.compare we are able to compare normal and hashed value
}

userSchema.methods.changedPasswordAfter = function(JWTTimestamp){
    if(this.passwordChangedAt){
        const changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        // console.log(changedTimeStamp, JWTTimestamp);
        return JWTTimestamp < changedTimeStamp;
    }
    return false;                                 // return false means the user has not changed the password after token was issued
};

userSchema.methods.createPasswordResetToken = function(){
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    console.log ({resetToken}, this.passwordResetToken);            // resetToken - actual token, passwordResetToken - encrypted one

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;       // 60 for seconds and 1000 for miliseconds
    
    return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;