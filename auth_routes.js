const bcrypt = require('bcrypt');
const ObjectId = require('mongodb').ObjectID;
const assert = require('assert');
require('./auth_helpers')();
const saltRounds = 10;

/**
 * @param  {Object} app Express app instance
 * @return {undefined}
 */
module.exports = function(app, db) {

  const users = db.collection('users');

  /**
   * Simple middle-ware function that takes the email address from the session and puts it in res.local
   * as userName so it is accessible from all templates.
   */
  app.use((req, res, next) => {

    // username has to exist as a variable or template rendering fails
    res.locals.userName = undefined;

    // if user is logged in, get the value for userName
    if(loggedInUser(req, res)) {

      // a user record exists in the session, make sure it's still in the database.
      let sessionUserRecord = req.session.userRecord;
      users.findOne(new ObjectId(sessionUserRecord._id))
      .then( result => {
        if(result) {
          //found it, so use it
          res.locals.userName = sessionUserRecord.email;
        } else {
          // not in the database, clear the session
          req.session = null;
        }

        next();

      }).catch(err => {
        renderInternalError(req, res, err);
      });

    } else{

      next();
    }

  });

  /**
   * Mark a user as logged in by adding a user record into the session.  Only email and id are stored in the session.
   * @param {Object} req the http request object
   * @param {Object} userRecord object
   */
  function setLoggedIn(req, userRecord) {
    req.session.userRecord = {email: userRecord.email, _id: userRecord._id};
  }

  // wrap bcrypt callback in a promise
  function checkPassword(userPassword, onRecordPassword) {
    return new Promise((resolve, reject) => {
      bcrypt.compare(userPassword, onRecordPassword, (err, result) => {
        if(err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  // wrap bcrypt callback in a promise
  function hashPassword(plainText) {
    return new Promise((resolve, reject) => {
      bcrypt.hash(plainText, saltRounds, (err, hashedPassword) => {
        if(err) {
          reject(err);
        } else {
          resolve(hashedPassword);
        }
      });
    });
  }

  /**
   * @param {object} req HTTP request object
   * @return {Promise} Logged in user record if user is authenticated or undefined otherwise.
   */
  function authenticate(req) {
    let email = req.body.email;
    return users.find({email: email}).toArray().then( searchResult => {
      if(searchResult.length === 1) {
        let userRecord = searchResult[0];
        return checkPassword(req.body.password, userRecord.password).then( passwordOk => {
          if(passwordOk) {
            setLoggedIn(req, userRecord);
            return userRecord;
          }
        });
      }
    });
  }

  /**
   * Email and password can't be blank and the email must not already be registered.
   * @param  {String} email
   * @param  {String} password
   * @return {Promise} with an object containing a errorMessage if the result is invalid.
   */
  function checkIfValid(email, password) {
    if(email && password) {
      return users.find({email: email}).toArray().then( result => {
        if(result.length === 0) {
          return {valid: true};
        } else {
          return {valid: false, errorMessage: `${email} already in use.`};
        }
      });
    } else {
      return Promise.resolve({valid: false, errorMessage: "Email and password can't be empty."});
    }
  }

  // ROUTES -----------------------------------------------------------------

  // Return the registration form or  redirect to home if the user is already logged in.
  app.get("/register", (req, res) =>{
    if(loggedInUser(req, res)){
      res.redirect("/");
    } else {
      res.render('register', {errorMessage: ""});
    }
  });

  // Hash the password and insert the new record into the database
  function insertRecord(req, res) {
    return hashPassword(req.body.password).then( hashedPassword => {
      return users.insert({ email: req.body.email, password: hashedPassword}).then(result => {
        assert.equal(1, result.result.n);
        let userRecord = result.ops[0];
        setLoggedIn(req, userRecord);
        res.redirect("/");
      });
    });
  }

  // Process a registration request.
  app.post("/register", (req, res) =>{
    checkIfValid(req.body.email, req.body.password).then(check => {
      // If there's an error message, render it.
      if(check.valid) {
        // If valid, hash the password, store it, mark the user logged in and redirect to home.
        return insertRecord(req, res);
      } else {
        res.render('register', {errorMessage: check.errorMessage});
      }
    }).catch(err => {
      renderInternalError(req, res, err);
    });
  });

  // Return the login form or redirect to home if the user is already logged in.
  app.get("/login", (req, res) =>{
    if(loggedInUser(req, res)) {
      res.redirect("/");
    } else {
      res.render('login', {errorMessage: ""});
    }
  });

  // Process a log in request by authenticating.
  app.post("/login", (req, res) => {
    authenticate(req).then(result => {
      // If successfully authenticated, redirect to home.
      if(result) {
        res.redirect("/");

      // If authentication fails, re-render the form and return an error message.
      } else {
        res.status(401).render('login', {errorMessage: "User name or password incorrect."});
      }
    }).catch(err => {
      renderInternalError(req, res, err);
    });
  });

  // If a logged in user tries to get the logout page they are just redirected to home.  Unauthorized users get an error.
  app.get("/logout", blockUnauthorized, (req, res) => {
    res.redirect("/");
  });

  // Process a logout from a logged in user by setting the session to null.  Unauthorized users get an error.
  app.post("/logout", blockUnauthorized, (req, res) => {
    req.session = null;
    res.redirect("/");
  });
};