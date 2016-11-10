const models = require('./models');
require('./render_helpers')();

/**
 * Define routes for processing urls.
 *
 * @param  {object} app: express application object.
 * @param {String} host
 * @param {string} port
 * @return {[undefined]}
 */
module.exports = function(app, host, port) {
  const BASE_URL =  `http://${host}:${port}/u/`;

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
};