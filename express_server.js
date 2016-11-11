const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const SESSION_KEY_1 = process.env.SESSION_KEY_1 || 'SESSION_KEY_1';
const SESSION_KEY_2 = process.env.SESSION_KEY_2 || 'SESSION_KEY_2';
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const models = require('./models');
const authRoutes = require('./auth_routes');
const urlRoutes = require('./url_routes');
const tracking = require('./tracking');
require('./render_helpers')();

app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: [SESSION_KEY_1, SESSION_KEY_2]
}));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  if(!loggedInUser(req, res)) {
    res.redirect("/login");
    return;
  }
  res.redirect("/urls");
});

authRoutes(app);
urlRoutes(app, HOST, PORT);
tracking.routes(app);

// Catch any requests not caught be defined routes.
app.all("*", (req, res) => {
  renderNotFound(req, res, getSessionVars(req, res));
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});