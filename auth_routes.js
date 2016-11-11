const bcrypt = require('bcrypt');
const models = require('./models');
require('./auth_helpers')();
const saltRounds = 10;

/**
 * @param  {Object} app Express app instance
 * @return {undefined}
 */
module.exports = function(app) {

  /**
   * Simple middle-ware function that takes the email address from the session and puts it in res.local
   * as userName so it is accessible from all templates.
   */
  app.use((req, res, next) => {
    res.locals.userName = undefined;
    if(loggedInUser(req, res)) {
      res.locals.userName = req.session.userRecord.email;
    }
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
   * @param  {Function} onResult called once authentication is completed
   * @return {undefined}
   */
  function authenticate(req, res, onResult) {
    let email = req.body.email;
    let userId = models.findUserId("email", email);
    if(!userId) {
      onResult(null, false);
      return;
    }
    let userRecord = models.getUserForId(userId);
    bcrypt.compare(req.body.password, userRecord.password, (err, result) =>{
      if(result) {
        setLoggedIn(req, userRecord);
      }
      onResult(err, result);
    });
  }

  /**
   * Email and password can't be blank and the email must not already be registered.
   * @param  {String} email
   * @param  {String} password
   * @return {String} errorMessage
   */
  function checkIfValid(email, password) {
    if(email && password) {
      let userId = models.findUserId("email", email);
      if(userId) {
        return `${email} already in use.`;
      } else{
        return "";
      }
    } else {
      return "Email and password can't be empty.";
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

  // Process a registration request.
  app.post("/register", (req, res) =>{
    let errorMessage = checkIfValid(req.body.email, req.body.password);

    // If invalid, render an error message.
    if(errorMessage) {
      res.render('register', {errorMessage: errorMessage});
      return;
    }

    // If valid, hash the password, store it, mark the user logged in and redirect to home.
    bcrypt.hash(req.body.password, saltRounds, (err, hashedPassword) => {
      let userId = models.insertUser({
        email: req.body.email,
        password: hashedPassword
      });
      let userRecord = models.getUserForId(userId);
      setLoggedIn(req, userRecord);
      res.redirect("/");
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

      // If uathentication fails, render an error (that's what the spec says!).
      } else {
        renderForbidden(req, res);
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