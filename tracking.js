const models = require('./models');
const validUrl = require('valid-url');
require('./render_helpers')();

exports.routes = function(app) {
  // redirection
  app.get("/u/:shortUrl", (req, res) => {
    console.log('session', req.session);
    console.log(req.headers);
    let urlRecord = models.getUrlForId(req.params.shortUrl);
    if (urlRecord && urlRecord.longUrl) {
      res.redirect(urlRecord.longUrl);
    } else {
      renderNotFound(req, res, getSessionVars(req, res));
    }
  });
};
