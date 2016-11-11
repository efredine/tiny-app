const models = require('./models');
const tracking = require('./tracking');
const validUrl = require('valid-url');
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
    let userUrls = models.urlsForUser(req.session.userRecord.id).map(urlRecord => {
      return Object.assign({}, urlRecord, tracking.summaryStats(urlRecord));
    });
    let templateVars = {baseUrl: BASE_URL, urls: userUrls};
    res.render('urls_index', getSessionVars(req, res, templateVars));
  });

  // render a page where the user can enter a new url
  app.get("/urls/new", (req, res) => {
    if(!loggedInUser(req, res)) {
      res.redirect("/login");
      return;
    }
    res.render("urls_new", getSessionVars(req, res, {errorMessage: ""}));
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
/**
 * Returns a validated url or undefined.
 * @param  {string}
 * @return {string}
 */
  function checkUrl(url) {
    let validatedUrl = validUrl.isUri(url);
    return validatedUrl;
  }

  // create url
  app.post("/urls", (req, res) => {
    if(!loggedInUser(req, res)) {
      renderUnauthorized(req, res, getSessionVars(req, res));
      return;
    }
    let longUrl = req.body.longUrl;
    let validatedUrl = checkUrl(req.body.longUrl);
    if(validatedUrl) {
      let shortUrl = models.insertUrl({
        longUrl: validatedUrl,
        userId: req.session.userRecord.id
      });
      res.redirect("/urls/" + shortUrl);
    } else {
      res.render("urls_new", getSessionVars(req, res, {errorMessage: `${longUrl} is not a valid URL`}));
    }
  });

  // read url
  app.get("/urls/:id", (req, res) => {
    if(!loggedInUser(req, res)) {
      renderUnauthorized(req, res, getSessionVars(req, res));
      return;
    }
    forAuthorizedUrl(req, res, urlRecord => {
      const templateVars = Object.assign({
        shortUrl: req.params.id,
        baseUrl: BASE_URL,
        longUrl: urlRecord.longUrl,
        edit: req.query.edit,
        errorMessage: ""
      }, tracking.summaryStats(urlRecord));
      res.render('urls_show', getSessionVars(req, res, templateVars));
    });
  });

  // update url
  app.post("/urls/:id", (req, res) => {
    if(!loggedInUser(req, res)) {
      renderUnauthorized(req, res, getSessionVars(req, res));
      return;
    }
    forAuthorizedUrl(req, res, urlRecord => {
      let longUrl = req.body.longUrl;
      let validatedUrl = checkUrl(longUrl);
      if(validatedUrl) {
        urlRecord.longUrl = validatedUrl;
        models.updateUrlForId(urlRecord.id, urlRecord);
        res.redirect('/urls');
      } else {
        res.render('urls_show', getSessionVars(req, res, {
          shortUrl: req.params.id,
          baseUrl: BASE_URL,
          longUrl: longUrl,
          edit: true,
          errorMessage: `${longUrl} is not a valid URL`
        }));
      }
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

};