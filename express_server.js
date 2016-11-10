const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const SESSION_KEY_1 = process.env.SESSION_KEY_1 || 'SESSION_KEY_1';
const SESSION_KEY_2 = process.env.SESSION_KEY_2 || 'SESSION_KEY_2';
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const models = require('./models');
const urlRoutes = require('./url_routes');
require('./render_helpers')();

app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: [SESSION_KEY_1, SESSION_KEY_2]
}));
app.set("view engine", "ejs");

const saltRounds = 10;

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

app.get("/", (req, res) => {
  if(!loggedInUser(req, res)) {
    res.redirect("/login");
    return;
  }
  res.redirect("/urls");
});

app.get("/register", (req, res) =>{
  res.render('auth', getSessionVars(req, res, {postUrl: '/register', buttonLabel: 'Register'}));
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
  res.render('auth', getSessionVars(req, res, {postUrl: '/login', buttonLabel: "Log in"}));
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

urlRoutes(app);

// Catch any requests not caught be defined routes.
app.all("*", (req, res) => {
  handle400Error(req, res);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});