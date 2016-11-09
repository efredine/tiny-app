const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const BASE_URL =  `http://${HOST}:8080/u/`;
const bodyParser = require("body-parser");
const defaultNotFound = {
  statusCode: 404,
  statusMessage: "Not found",
  detailedMessage: "Couldn't find that URL."
};
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

function generateRandomString() {
  return Math.random().toString(36).substring(2, 8);
}

function handle400Error(req, res, overrides = {}) {
  let notFoundVars = Object.assign({}, defaultNotFound, overrides);
  notFoundVars.requestedUrl = req.url;
  res.status(notFoundVars.statusCode);
  res.render('not_found', notFoundVars);
}

app.get("/", (req, res) => {
  res.redirect("/urls");
});

app.get("/urls", (req, res) => {
  let templateVars = {baseUrl: BASE_URL, urls: urlDatabase};
  res.render('urls_index', templateVars);
});

app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});

app.get("/urls/:id", (req, res) => {
  let longUrl = urlDatabase[req.params.id];
  if (longUrl) {
    res.render('urls_show', {
      shortUrl: req.params.id,
      baseUrl: BASE_URL,
      longUrl: longUrl,
      edit: req.query.edit
    });
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