const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const BASE_URL =  `http://${HOST}:8080/u/`;
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const models = require('./models');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.set("view engine", "ejs");

const defaultNotFound = {
  statusCode: 404,
  statusMessage: "Not found",
  detailedMessage: "Couldn't find that URL."
};

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

function getSessionVars(req, res, existingVars = {}) {
  let userId = req.cookies.userId;
  let userRecord = models.getUserForId(userId);
  let userName = userRecord ? userRecord.email : undefined;
  return Object.assign({userName: userName}, existingVars);
}

function generateRandomString() {
  return Math.random().toString(36).substring(2, 8);
}

function handle400Error(req, res, overrides = {}) {
  let notFoundVars = Object.assign({}, defaultNotFound, overrides);
  notFoundVars.requestedUrl = req.url;
  res.status(notFoundVars.statusCode);
  res.render('not_found', getSessionVars(req, res, notFoundVars));
}

app.get("/cookies/delete", (req, res) => {
  let cookies = req.cookies;
  Object.keys(cookies).forEach(cookieKey => {
    res.clearCookie(cookieKey);
  });
  res.end("Cookies deleted.");
});

app.get("/cookies", (req, res) => {
  res.cookie('cat', 'scrubbie');
  res.writeHead(200, {'Content-Type': 'application/json'});
  let cookies = req.cookies;
  console.log(cookies);
  res.write(JSON.stringify(cookies));
  res.end();
});

app.get("/", (req, res) => {
  res.redirect("/urls");
});

app.get("/register", (req, res) =>{
  res.render('register', getSessionVars(req, res));
});

app.post("/register", (req, res) =>{
  let userId = models.insertUser({
    email: req.body.email,
    password: req.body.password
  });
  res.cookie("userId", userId);
  res.redirect("/");
});

app.post("/login", (req, res) => {
  let userName = req.body.userName;
  if(userName) {
    res.cookie("userName", userName);
    res.redirect("/");
  } else {
    handle400Error(req, res, {
      statusCode: 401,
      statusMessage: "Unauthorized",
      detailedMessage: userName ? `${userName} is an invalid user name` : "You need to enter a value for the user name."
    });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("userId");
  res.redirect("/");
});

app.get("/urls", (req, res) => {
  let templateVars = {baseUrl: BASE_URL, urls: urlDatabase};
  res.render('urls_index', getSessionVars(req, res, templateVars));
});

app.get("/urls/new", (req, res) => {
  res.render("urls_new", getSessionVars(req, res));
});

app.get("/urls/:id", (req, res) => {
  let longUrl = urlDatabase[req.params.id];
  if (longUrl) {
    res.render('urls_show', getSessionVars(req, res, {
      shortUrl: req.params.id,
      baseUrl: BASE_URL,
      longUrl: longUrl,
      edit: req.query.edit
    }));
  } else {
    handle400Error(req, res);
  }
});

// update
app.post("/urls/:id", (req, res) => {
  let longUrl = req.body.longUrl;
  let shortUrl = req.params.id;
  if (shortUrl) {
    urlDatabase[shortUrl] = longUrl;
    res.redirect('/urls');
  } else {
    handle400Error(req, res);
  }
});

app.post("/urls/:id/delete", (req, res) => {
  let longUrl = urlDatabase[req.params.id];
  if (longUrl) {
    delete urlDatabase[req.params.id];
    res.redirect('/urls');
  } else {
    handle400Error(req, res);
  }
});

app.post("/urls", (req, res) => {
  let longUrl = req.body.longUrl;
  let shortUrl = generateRandomString();
  urlDatabase[shortUrl] = longUrl;
  res.redirect("/urls/" + shortUrl);
});

app.get("/u/:shortUrl", (req, res) => {
  let longUrl = urlDatabase[req.params.shortUrl];
  if (longUrl) {
    res.redirect(longUrl);
  } else {
    handle400Error(req, res);
  }
});

// Catch any requests not caught be defined routes.
app.all("*", (req, res) => {
  handle400Error(req, res);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});