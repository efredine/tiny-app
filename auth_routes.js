const bcrypt = require('bcrypt');
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

    if(loggedInUser(req, res)) {
      res.locals.userName = req.session.userRecord.email;
    } else {
      res.locals.userName = undefined;
    }

    // // username has to exist as a variable or template rendering fails
    // res.locals.userName = undefined;

    // // if user is logged in, get the value for userName
    // if(loggedInUser(req, res)) {

    //   // a user record exists in the session, make sure it's still in the database.
    //   let sessionUserRecord = req.session.userRecord;
    //   let userRecord = models.getUserForId(sessionUserRecord.id);

    //   // found it in the database, so use it
    //   if(userRecord) {
    //     res.locals.userName = userRecord.email;

    //   // not in the database, clear the session
    //   } else {
    //     req.session = null;
    //   }
    // }

    // carry on with route processing
    next();
  });

  /**
   * Mark a user as logged in by adding a user record into the session.  Only email and id are stored in the session.
   * @param {Object} req the http request object
   * @param {Object} userRecord object
   */
  function setLoggedIn(req, userRecord) {
    req.session.userRecord = {email: userRecord.email, id: userRecord.id};
  }

  /**
   * Authenticates if email is found and bycrypt'ed password compares.
   * @param  {Object} req object
   * @param  {Object} res object
   * @param  {Function} callback called once authentication is completed
   * @return {undefined}
   */
  function authenticate(req, res, callback) {
    let email = req.body.email;
    users.find({email: email}).toArray((err, result) => {
      if(err) {
        renderInternalError(req, res, err);
        return;
      }
      if(result.length === 0) {
        callback(err, null);
      } else {
        let userRecord = result[0];
        bcrypt.compare(req.body.password, userRecord.password, (err, result) =>{
          if(result) {
            setLoggedIn(req, userRecord);
          }
          callback(err, result);
        });
      }
    });
  }

  /**
   * Email and password can't be blank and the email must not already be registered.
   * @param  {String} email
   * @param  {String} password
   * @return {String} errorMessage
   */
  function checkIfValid(email, password, callback) {
    if(email && password) {
      users.find({email: email}).toArray((err, result) => {
        if(err) {
          renderInternalError(req, res, err);
          return;
        }
        if(result.length === 0) {
          callback(err, "");
        } else {
          callback(err, `${email} already in use.`);
        }
      });
    } else {
      callback(null, "Email and password can't be empty.");
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

  function insertRecord(req, res, password) {
    bcrypt.hash(req.body.password, saltRounds, (err, hashedPassword) => {
      if(err) {
        renderInternalError(req, res, error);
        return;
      }
      users.insert({ email: req.body.email, password: hashedPassword}, (err, result) => {
        if(err) {
          renderInternalError(req, res, error);
          return;
        }
        assert.equal(1, result.result.n);
        let userRecord = result.ops[0];
        setLoggedIn(req, userRecord);
        res.redirect("/");
      });
    });
  }

  // Process a registration request.
  app.post("/register", (req, res) =>{
    checkIfValid(req.body.email, req.body.password, (err, errorMessage) => {
      // If there's an error message, render it.
      if(errorMessage) {
        res.render('register', {errorMessage: errorMessage});
      } else {
        // If valid, hash the password, store it, mark the user logged in and redirect to home.
        insertRecord(req, res);
      }
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
    authenticate(req, res, (err, result) => {

      // If successfully authenticated, redirect to home.
      if(result) {
        res.redirect("/");

      // If authentication fails, re-render the form and return an error message.
      } else {
        res.status(401).render('login', {errorMessage: "User name or password incorrect."});
      }
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