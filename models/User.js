const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new Schema({
    local : {
        email: {
            type: String,
            unique: true,
        },
    },
    google: {
        id: String,
        token: String,
        email: String,
        name: String
    }
});

UserSchema.plugin(passportLocalMongoose, {
    usernameField: "email",
    findByUsername: (model, queryParameters) => {
        return model.findOne(queryParameters);
      }
});

module.exports = mongoose.model('User', UserSchema);