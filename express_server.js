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

function loggedInUser(req, res) {
  let userId = req.cookies.userId;
  let userRecord = models.getUserForId(userId);
  return userRecord;
}

function authenticate(req, res) {
  let email = req.body.email;
  let userId = models.findUserId("email", email);
  if(!userId) {
    return false;
  }
  let userRecord = models.getUserForId(userId);
  if(userRecord.password === req.body.password) {
    res.cookie("userId", userId);
    return true;
  } else {
    return false;
  }
}

function getSessionVars(req, res, existingVars = {}) {
  let userId = req.cookies.userId;
  let userRecord = models.getUserForId(userId);
  let userName = userRecord ? userRecord.email : undefined;
  return Object.assign({userName: userName}, existingVars);
}

function handle400Error(req, res, overrides = {}) {
  let notFoundVars = Object.assign({}, defaultNotFound, overrides);
  notFoundVars.requestedUrl = req.url;
  res.status(notFoundVars.statusCode);
  res.render('not_found', getSessionVars(req, res, notFoundVars));
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
    password: req.body.password
  });
  res.cookie("userId", userId);
  res.redirect("/");
});

app.get("/login", (req, res) =>{
  res.render('auth', getSessionVars(req, res, {postUrl: '/login', buttonLabel: "Log in"}));
});

app.post("/login", (req, res) => {
  if(authenticate(req, res)) {
    res.redirect("/");
  } else {
    handle400Error(req, res, {
      statusCode: 403,
      statusMessage: "Forbidden",
      detailedMessage: "User name or password incorrect."
    });
  }
});

app.post("/logout", (req, res) => {
  if(!loggedInUser(req, res)) {
    handle400Error(req, res, {statusCode: 401, statusMessage: "Unauthorized"});
    return;
  }
  res.clearCookie("userId");
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
      handle400Error(req, res, {statusCode: 401, statusMessage: "Unauthorized"});
      return;
    }
    res.render('urls_show', getSessionVars(req, res, {
      shortUrl: req.params.id,
      baseUrl: BASE_URL,
      longUrl: urlRecord.longUrl,
      edit: req.query.edit
    }));
  } else {
    handle400Error(req, res);
  }
});

// update url
app.post("/urls/:id", (req, res) => {
  let userRecord = loggedInUser(req, res);
  if(!userRecord) {
    handle400Error(req, res, {statusCode: 401, statusMessage: "Unauthorized"});
    return;
  }
  let urlRecord = models.getUrlForId(req.params.id);
  if (urlRecord) {
    if(urlRecord.userId !== userRecord.id) {
      handle400Error(req, res, {statusCode: 401, statusMessage: "Unauthorized"});
      return;
    }
    urlRecord.longUrl = req.body.longUrl;
    models.updateUrlForId(urlRecord.id, urlRecord);
    res.redirect('/urls');
  } else {
    handle400Error(req, res);
  }
});

// delete url
app.post("/urls/:id/delete", (req, res) => {
  let userRecord = loggedInUser(req, res);
  if(!userRecord) {
    handle400Error(req, res, {statusCode: 401, statusMessage: "Unauthorized"});
    return;
  }
  let urlRecord = models.getUrlForId(req.params.id);
  if (urlRecord) {
    if(urlRecord.userId !== userRecord.id) {
      handle400Error(req, res, {statusCode: 401, statusMessage: "Unauthorized"});
      return;
    }
    models.deleteUrlForId(urlRecord.id);
    res.redirect('/urls');
  } else {
    handle400Error(req, res);
  }
});

// create url
app.post("/urls", (req, res) => {
  let userRecord = loggedInUser(req, res);
  if(!userRecord) {
    handle400Error(req, res, {statusCode: 401, statusMessage: "Unauthorized"});
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