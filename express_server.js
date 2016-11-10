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

// render list of urls for a logged in user
app.get("/urls", (req, res) => {
  if(!loggedInUser(req, res)) {
    res.redirect("/login");
    return;
  }
  let userUrls = models.urlsForUser(req.session.userRecord.id);
  let templateVars = {baseUrl: BASE_URL, urls: userUrls};
  res.render('urls_index', getSessionVars(req, res, templateVars));
});

// render a page where the user can enter a new url
app.get("/urls/new", (req, res) => {
  if(!loggedInUser(req, res)) {
    res.redirect("/login");
    return;
  }
  res.render("urls_new", getSessionVars(req, res));
});

// helper function that abstracts the pattern repeated in read, update and delete
function forAuthorizedUrl(req, res, onSuccess) {
  let urlRecord = models.getUrlForId(req.params.id);
  if (urlRecord) {
    if(urlRecord.userId === req.session.userRecord.id) {
      onSuccess(urlRecord);
    } else {
      renderForbidden(req, res, getSessionVars(req, res));
    }
  } else {
    renderNotFound(req, res, getSessionVars(req, res));
  }
}
// read url
app.get("/urls/:id", (req, res) => {
  if(!loggedInUser(req, res)) {
    res.redirect("/login");
    return;
  }
  forAuthorizedUrl(req, res, urlRecord => {
    res.render('urls_show', getSessionVars(req, res, {
      shortUrl: req.params.id,
      baseUrl: BASE_URL,
      longUrl: urlRecord.longUrl,
      edit: req.query.edit
    }));
  });
});

// update url
app.post("/urls/:id", (req, res) => {
  if(!loggedInUser(req, res)) {
    renderUnauthorized(req, res, getSessionVars(req, res));
    return;
  }
  forAuthorizedUrl(req, res, urlRecord => {
    urlRecord.longUrl = req.body.longUrl;
    models.updateUrlForId(urlRecord.id, urlRecord);
    res.redirect('/urls');
  });
});

// delete url
app.post("/urls/:id/delete", (req, res) => {
  if(!loggedInUser(req, res)) {
    renderUnauthorized(req, res, getSessionVars(req, res));
    return;
  }
  forAuthorizedUrl(req, res, urlRecord => {
    models.deleteUrlForId(urlRecord.id);
    res.redirect('/urls');
  });
});

// create url
app.post("/urls", (req, res) => {
  if(!loggedInUser(req, res)) {
    renderUnauthorized(req, res, getSessionVars(req, res));
    return;
  }
  let shortUrl = models.insertUrl({
    longUrl: req.body.longUrl,
    userId: req.session.userRecord.id
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