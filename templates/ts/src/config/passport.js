"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var passport = require("passport");
var passportFacebook = require("passport-facebook");
var passportLocal = require("passport-local");
var User_1 = require("../models/User");
var LocalStrategy = passportLocal.Strategy;
var FacebookStrategy = passportFacebook.Strategy;
passport.serializeUser(function (user, done) {
    done(undefined, user.id);
});
passport.deserializeUser(function (id, done) {
    User_1.default.findById(id, function (err, user) {
        done(err, user);
    });
});
/**
 * Sign in using Email and Password.
 */
passport.use(new LocalStrategy({ usernameField: "email" }, function (email, password, done) {
    User_1.default.findOne({ email: email.toLowerCase() }, function (err, user) {
        if (err) {
            return done(err);
        }
        if (!user) {
            return done(undefined, false, { message: "Email " + email + " not found." });
        }
        user.comparePassword(password, function (err, isMatch) {
            if (err) {
                return done(err);
            }
            if (isMatch) {
                return done(undefined, user);
            }
            return done(undefined, false, { message: "Invalid email or password." });
        });
    });
}));
/**
 * OAuth Strategy Overview
 *
 * - User is already logged in.
 *   - Check if there is an existing account with a provider id.
 *     - If there is, return an error message. (Account merging not supported)
 *     - Else link new OAuth account with currently logged-in user.
 * - User is not logged in.
 *   - Check if it's a returning user.
 *     - If returning user, sign in and we are done.
 *     - Else check if there is an existing account with user's email.
 *       - If there is, return an error message.
 *       - Else create a new account.
 */
/**
 * Sign in with Facebook.
 */
passport.use(new FacebookStrategy({
    callbackURL: "/auth/facebook/callback",
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    passReqToCallback: true,
    profileFields: ["name", "email", "link", "locale", "timezone"],
}, function (req, accessToken, refreshToken, profile, done) {
    if (req.user) {
        User_1.default.findOne({ facebook: profile.id }, function (err, existingUser) {
            if (err) {
                return done(err);
            }
            if (existingUser) {
                req.flash("errors", { msg: "There is already a Facebook account that belongs to you. \
        Sign in with that account or delete it, then link it with your current account." });
                done(err);
            }
            else {
                User_1.default.findById(req.user.id, function (err, user) {
                    if (err) {
                        return done(err);
                    }
                    user.facebook = profile.id;
                    user.tokens.push({ kind: "facebook", accessToken: accessToken });
                    user.profile.name = user.profile.name || profile.name.givenName + " " + profile.name.familyName;
                    user.profile.gender = user.profile.gender || profile._json.gender;
                    user.profile.picture = user.profile.picture || "https://graph.facebook.com/" + profile.id + "/picture?type=large";
                    user.save(function (err) {
                        req.flash("info", { msg: "Facebook account has been linked." });
                        done(err, user);
                    });
                });
            }
        });
    }
    else {
        User_1.default.findOne({ facebook: profile.id }, function (err, existingUser) {
            if (err) {
                return done(err);
            }
            if (existingUser) {
                return done(undefined, existingUser);
            }
            User_1.default.findOne({ email: profile._json.email }, function (err, existingEmailUser) {
                if (err) {
                    return done(err);
                }
                if (existingEmailUser) {
                    req.flash("errors", {
                        msg: "There is already an account using this email address. \
            Sign in to that account and link it with Facebook manually from Account Settings."
                    });
                    done(err);
                }
                else {
                    var user_1 = new User_1.default();
                    user_1.email = profile._json.email;
                    user_1.facebook = profile.id;
                    user_1.tokens.push({ kind: "facebook", accessToken: accessToken });
                    user_1.profile.name = profile.name.givenName + " " + profile.name.familyName;
                    user_1.profile.gender = profile._json.gender;
                    user_1.profile.picture = "https://graph.facebook.com/" + profile.id + "/picture?type=large";
                    user_1.profile.location = (profile._json.location) ? profile._json.location.name : "";
                    user_1.save(function (err) {
                        done(err, user_1);
                    });
                }
            });
        });
    }
}));
/**
 * Login Required middleware.
 */
exports.isAuthenticated = function (req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
};
/**
 * Authorization Required middleware.
 */
exports.isAuthorized = function (req, res, next) {
    var provider = req.path.split("/").slice(-1)[0];
    if (_.find(req.user.tokens, { kind: provider })) {
        next();
    }
    else {
        res.redirect("/auth/" + provider);
    }
};
