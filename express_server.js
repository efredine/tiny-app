const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const SESSION_KEY_1 = process.env.SESSION_KEY_1 || 'SESSION_KEY_1';
const SESSION_KEY_2 = process.env.SESSION_KEY_2 || 'SESSION_KEY_2';
const BASE_URL =  `http://${HOST}:8080/u/`;
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const models = require('./models');
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: [SESSION_KEY_1, SESSION_KEY_2]
}));
app.set("view engine", "ejs");

const saltRounds = 10;

function getSessionVars(req, res, existingVars = {}) {
  let userRecord = req.session.userRecord;
  let userName = userRecord ? userRecord.email : undefined;
  return Object.assign({userName: userName}, existingVars);
}

function renderUnauthorized(req, res, templateVars) {
  res.status(401);
  res.render('not_found', Object.assign({
    statusCode: 401,
    statusMessage: "Unauthorized",
    requestedUrl: req.url,
    detailedMessage: "Access to that url not permitted."
  }, templateVars));
}

function renderForbidden(req, res, templateVars) {
  res.status(403);
  res.render('not_found', Object.assign({
    statusCode: 403,
    statusMessage: "Forbidden",
    requestedUrl: req.url,
    detailedMessage: ""
  }, templateVars));
}

function renderNotFound(req, res, templateVars) {
  res.status(404);
  res.render('not_found', Object.assign({
    statusCode: 404,
    statusMessage: "Not found",
    requestedUrl: req.url,
    detailedMessage: ""
  }, templateVars));
}

function loggedInUser(req, res) {
  return req.session.userRecord;
}

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

app.get("/urls", (req, res) => {
  let userRecord = loggedInUser(req, res);
  if(!userRecord) {
    res.redirect("/login");
    return;
  }
  let userUrls = models.urlsForUser(userRecord.id);
  let templateVars = {baseUrl: BASE_URL, urls: userUrls};
  res.render('urls_index', getSessionVars(req, res, templateVars));
});

app.get("/urls/new", (req, res) => {
  if(!loggedInUser(req, res)) {
    res.redirect("/login");
    return;
  }
  res.render("urls_new", getSessionVars(req, res));
});

// read url
app.get("/urls/:id", (req, res) => {
  let userRecord = loggedInUser(req, res);
  if(!userRecord) {
    res.redirect("/login");
    return;
  }
  let urlRecord = models.getUrlForId(req.params.id);
  if (urlRecord) {
    if(urlRecord.userId !== userRecord.id) {
      renderForbidden(req, res, getSessionVars(req, res));
      return;
    }
    res.render('urls_show', getSessionVars(req, res, {
      shortUrl: req.params.id,
      baseUrl: BASE_URL,
      longUrl: urlRecord.longUrl,
      edit: req.query.edit
    }));
  } else {
    renderNotFound(req, res, getSessionVars(req, res));
  }
});

// update url
app.post("/urls/:id", (req, res) => {
  let userRecord = loggedInUser(req, res);
  if(!userRecord) {
    renderUnauthorized(req, res, getSessionVars(req, res));
    return;
  }
  let urlRecord = models.getUrlForId(req.params.id);
  if (urlRecord) {
    if(urlRecord.userId !== userRecord.id) {
      renderForbidden(req, res, getSessionVars(req, res));
      return;
    }
    urlRecord.longUrl = req.body.longUrl;
    models.updateUrlForId(urlRecord.id, urlRecord);
    res.redirect('/urls');
  } else {
    renderNotFound(req, res, getSessionVars(req, res));
  }
});

// delete url
app.post("/urls/:id/delete", (req, res) => {
  let userRecord = loggedInUser(req, res);
  if(!userRecord) {
    renderUnauthorized(req, res, getSessionVars(req, res));
    return;
  }
  let urlRecord = models.getUrlForId(req.params.id);
  if (urlRecord) {
    if(urlRecord.userId !== userRecord.id) {
      renderForbidden(req, res, getSessionVars(req, res));
      return;
    }
    models.deleteUrlForId(urlRecord.id);
    res.redirect('/urls');
  } else {
    renderNotFound(req, res, getSessionVars(req, res));
  }
});

// create url
app.post("/urls", (req, res) => {
  let userRecord = loggedInUser(req, res);
  if(!userRecord) {
    renderUnauthorized(req, res, getSessionVars(req, res));
    return;
  }
  let shortUrl = models.insertUrl({
    longUrl: req.body.longUrl,
    userId: userRecord.id
  });
  res.redirect("/urls/" + shortUrl);
});

// redirection
app.get("/u/:shortUrl", (req, res) => {
  let urlRecord = models.getUrlForId(req.params.shortUrl);
  if (urlRecord && urlRecord.longUrl) {
    res.redirect(urlRecord.longUrl);
  } else {
    renderNotFound(req, res, getSessionVars(req, res));
  }
});

// Catch any requests not caught be defined routes.
app.all("*", (req, res) => {
  handle400Error(req, res);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});