const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const BASE_URL =  `https://${HOST}:8080/`;

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.end("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.end("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls", (req, res) => {
  let templateVars = {baseUrl: BASE_URL, urls: urlDatabase};
  res.render('urls_index', templateVars);
});

app.get("/urls/:id", (req, res) => {
  let longUrl = urlDatabase[req.params.id];
  res.render('urls_show', {
    shortUrl: req.params.id,
    baseUrl: BASE_URL,
    originalUrl: longUrl
  });
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});