require('dotenv').config({silent: true});
const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const MongoClient = require('mongodb').MongoClient;
const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/tinyapp';
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const SESSION_KEY_1 = process.env.SESSION_KEY_1 || 'SESSION_KEY_1';
const SESSION_KEY_2 = process.env.SESSION_KEY_2 || 'SESSION_KEY_2';
const assert = require('assert');
const authRoutes = require('./auth_routes');
const urlRoutes = require('./url_routes');
const tracking = require('./tracking');
require('./auth_helpers')();


// Use connect method to connect to the Server
MongoClient.connect(mongoURL, function(err, db) {
  assert.equal(null, err);
  console.log("Connected correctly to server");

  // express middleware configuration
  app.use(express.static('public'));
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(cookieSession({
    name: 'session',
    keys: [SESSION_KEY_1, SESSION_KEY_2]
  }));
  app.set("view engine", "ejs");

  // routes

  // Logged in users are redirected to their URLS, users who aren't logged in are redicted to the login page.
  app.get("/", redirectUnathorized("/login"), (req, res) => {
    res.redirect("/urls");
  });

  // Configure routes for other modules.
  authRoutes(app, db);
  urlRoutes(app, db, {host: HOST, port: PORT});
  tracking.routes(app);

  // Catch any requests not caught by defined routes.
  app.all("*", (req, res) => {
    renderNotFound(req, res);
  });

  // Fire it up!
  app.listen(PORT, () => {
    console.log(`Tiny app listening on port ${PORT}!`);
  });

  // db.close();
});
