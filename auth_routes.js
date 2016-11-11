const bcrypt = require('bcrypt');
const models = require('./models');
require('./render_helpers')();
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
    if(loggedInUser(req, res)) {
      res.locals.userName = req.session.userRecord;
    }
    next();
  });

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
        req.session.userRecord = {email: userRecord.email, id: userRecord.id};
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

  app.get("/register", (req, res) =>{
    if(loggedInUser(req, res)){
      res.redirect("/");
    } else {
      res.render('register', getSessionVars(req, res, {errorMessage: ""}));
    }
  });

  app.post("/register", (req, res) =>{
    let errorMessage = checkIfValid(req.body.email, req.body.password);
    if(errorMessage) {
      res.render('register', getSessionVars(req, res, {errorMessage: errorMessage}));
      return;
    }
    bcrypt.hash(req.body.password, saltRounds, (err, hashedPassword) => {
      let userId = models.insertUser({
        email: req.body.email,
        password: hashedPassword
      });
      let userRecord = models.getUserForId(userId);
      req.session.userRecord = {email: userRecord.email, id: userRecord.id};
      res.redirect("/");
    });
  });

  app.get("/login", (req, res) =>{
    if(loggedInUser(req, res)) {
      res.redirect("/");
    } else {
      res.render('login', getSessionVars(req, res, {errorMessage: ""}));
    }
  });

  app.post("/login", (req, res) => {
    authenticate(req, res, (err, result) => {
      if(result) {
        res.redirect("/");
      } else {
        renderForbidden(req, res, getSessionVars(req, res));
      }
    });
  });

  app.get("/logout", (req, res) => {
    if(loggedInUser(req, res)) {
      res.redirect("/");
    } else {
      renderUnauthorized(req, res, getSessionVars(req, res));
    }
  });

  app.post("/logout", (req, res) => {
    if(!loggedInUser(req, res)) {
      renderUnauthorized(req, res, getSessionVars(req, res));
      return;
    }
    req.session = null;
    res.redirect("/");
  });
};