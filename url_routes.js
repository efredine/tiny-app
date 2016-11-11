const models = require('./models');
const tracking = require('./tracking');
const validUrl = require('valid-url');
require('./auth_helpers')();

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

  // helper function that abstracts the pattern repeated in read, update and delete
  function forAuthorizedUrl(req, res, onSuccess) {
    let urlRecord = models.getUrlForId(req.params.id);
    if (urlRecord) {
      if(urlRecord.userId === req.session.userRecord.id) {
        onSuccess(urlRecord);
      } else {
        renderForbidden(req, res);
      }
    } else {
      renderNotFound(req, res);
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

  // ROUTES -------------------------------------------------------

  // render list of urls for a logged in user
  app.get("/urls", redirectUnathorized("/login"), (req, res) => {
    let userUrls = models.urlsForUser(req.session.userRecord.id).map(urlRecord => {
      return Object.assign({}, urlRecord, tracking.summaryStats(urlRecord));
    });
    res.render('urls_index', {baseUrl: BASE_URL, urls: userUrls});
  });

  // render a page where the user can enter a new url
  app.get("/urls/new", redirectUnathorized("/login"), (req, res) => {
    res.render("urls_new", {errorMessage: ""});
  });

  // create url
  app.post("/urls", blockUnauthorized, (req, res) => {
    let longUrl = req.body.longUrl;
    let validatedUrl = checkUrl(req.body.longUrl);
    if(validatedUrl) {
      const now = new Date();
      let shortUrl = models.insertUrl({
        longUrl: validatedUrl,
        userId: req.session.userRecord.id,
        created: now,
        lastUpdated: now
      });
      res.redirect("/urls/" + shortUrl);
    } else {
      res.render("urls_new", {errorMessage: `${longUrl} is not a valid URL`});
    }
  });

  /**
   * Read a URL.  This url accepts an optional query parameter &edit which is used as the value
   * of an edit boolean passed to the template.  The template renders a read-only version of the
   * viefw if edit is false or an editable version if edit is true.  The editable version of the
   * form posts to the update url.
   */
  app.get("/urls/:id", blockUnauthorized, (req, res) => {
    forAuthorizedUrl(req, res, urlRecord => {
      const templateVars = Object.assign({
        baseUrl: BASE_URL,
        edit: req.query.edit,
        errorMessage: ""
      }, urlRecord, tracking.summaryStats(urlRecord));
      res.render('urls_show', templateVars);
    });
  });

  // update url
  app.post("/urls/:id", blockUnauthorized, (req, res) => {
    forAuthorizedUrl(req, res, urlRecord => {
      let longUrl = req.body.longUrl;
      let validatedUrl = checkUrl(longUrl);
      if(validatedUrl) {
        urlRecord.longUrl = validatedUrl;
        urlRecord.lastUpdated = new Date();
        models.updateUrlForId(urlRecord.id, urlRecord);
        res.redirect('/urls');
      } else {
        const templateVars = Object.assign({
          baseUrl: BASE_URL,
          edit: true,
          errorMessage: `${longUrl} is not a valid URL`
        }, urlRecord, tracking.summaryStats(urlRecord));
        res.render('urls_show', templateVars);
      }
    });
  });

  // delete url
  app.post("/urls/:id/delete", blockUnauthorized, (req, res) => {
    forAuthorizedUrl(req, res, urlRecord => {
      models.deleteUrlForId(urlRecord.id);
      res.redirect('/urls');
    });
  });

};