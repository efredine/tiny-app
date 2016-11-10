const bcrypt = require('bcrypt');
const models = require('./models');
require('./render_helpers')();
const saltRounds = 10;

/**
 * @param  {Object} app Express app instance
 * @return {undefined}
 */
module.exports = function(app) {

  function authenticate(req, res) {
    let email = req.body.email;
    let userId = models.findUserId("email", email);
    if(!userId) {
      return false;
    }
    let userRecord = models.getUserForId(userId);
    if(bcrypt.compareSync(req.body.password, userRecord.password)) {
      req.session.userRecord = userRecord;
      return true;
    } else {
      return false;
    }
  }

  app.get("/register", (req, res) =>{
    res.render('register', getSessionVars(req, res, {}));
  });

  app.post("/register", (req, res) =>{
    let userId = models.insertUser({
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, saltRounds)
    });
    let userRecord = models.getUserForId(userId);
    req.session.userRecord = userRecord;
    res.redirect("/");
  });

  app.get("/login", (req, res) =>{
    res.render('login', getSessionVars(req, res, {}));
  });

  app.post("/login", (req, res) => {
    if(authenticate(req, res)) {
      res.redirect("/");
    } else {
      renderForbidden(req, res, getSessionVars(req, res));
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