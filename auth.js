var Auth = function Auth(rec, res) {
  this.rec = rec;
  this.res = res;
  this.userId = req.cookies.userId;
  this.userRecord = models.getUserForId(userId);
};
Auth.prototype.templateVars = function(moreVars){
  return Object.assign({userName: this.userRecord.email}, moreVars);
};
Auth.prototype.loggedIn = function(callback) {
  if(this.userRecord) {
    callback(userRecord, this.prototype.templateVars);
  }
  return this;
};
Auth.prototype.otherwise = function(callback) {
  if(!this.userRecord) {
    callback();
  }
  return this;
};

var UrlRecord = function UrlRecord(user, urlId) {
  this.user = user;
  this.urlId = urlId;
  urlRecord = models.getUrlForId(req.params.id);
  if (urlRecord) {
    if(urlRecord.userId === user.id) {
      this.UrlRecord = UrlRecord;
    } else {
      handle400Error(req, res, {statusCode: 401, statusMessage: "Unauthorized"});
    }
  } else {
    // not found
    handle400Error(req, res);
  }
};

UrlRecord.prototype.authorized = function(callback) {
  if(this.urlRecord) {
    callback(this.urlRecord);
  }
};

app.get("/urls", (req, res) => {
  Auth(req, res).loggedIn(function(user, templateVars) {
    let userUrls = models.urlsForUser(user.id);
    res.render('urls_index', templateVars({baseUrl: BASE_URL, urls: userUrls}));
  }).otherwise(function() {
    res.redirect("/login");
  });
});

app.get("/urls/new", (req, res) => {
  Auth(req, res).loggedIn((user, templateVars) => {
    res.render("urls_new", templateVars());
  }).otherwise(() => {
    res.redirect("/login");
  });
});

//read url
app.get("/urls/:id", (req, res) => {
  Auth(req, res).loggedIn((user, templateVars) => {
    UrlRecord(user, req.params.id)
    .authorized(function(url) {
      res.render('urls_show', templateVars({
        shortUrl: req.params.id,
        baseUrl: BASE_URL,
        longUrl: urlRecord.longUrl,
        edit: req.query.edit})
      );
    });
  }).otherwise(() => {
    // unauthorized
    handle400Error(req, res);
  });
});

//update url
app.post("/urls/:id", function(req, res) {
  Auth(req, res)
  .loggedIn((user, templateVars) => {
    UrlRecord(user, req.params.id).authorized(url => {
      urlRecord.longUrl = req.body.longUrl;
      models.updateUrlForId(urlRecord.id, urlRecord);
      res.redirect('/urls');
    });
  }).otherwise(function() {
    // unauthorized
    handle400Error(req, res);
  });
});

// // delete url
app.post("/urls/:id/delete", (req, res) => {
  Auth(req, res).loggedIn((user, templateVars) => {
    UrlRecord(user, req.params.id).authorized(url => {
      models.deleteUrlForId(urlRecord.id);
      res.redirect('/urls');
    });
  }).otherwise(() => {
    // unauthorized
    handle400Error(req, res);
  });
});

// create url
app.post("/urls", (req, res) => {
  Auth(req, res).loggedIn(function(user, templateVars) {
    let shortUrl = models.insertUrl({
      longUrl: req.body.longUrl,
      userId: userRecord.id
    });
    res.redirect("/urls/" + shortUrl);
  }).otherwise(function() {
    handle400Error(req, res, {statusCode: 401, statusMessage: "Unauthorized"});
  });
});