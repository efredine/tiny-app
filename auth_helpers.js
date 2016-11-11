function loggedInUser(req, res) {
  return req.session.userRecord;
}

/**
 * Exports helper functions into the importing module's namespace.
 *
 * @return {undefined}
 */
module.exports = function() {

  this.blockUnauthorized = function blockUnauthorized(req, res, next) {
    if(loggedInUser(req, res)) {
      next();
    } else {
      renderUnauthorized(req, res);
    }
  };

  this.redirectUnathorized = function renderUnauthorized(redirectUrl) {
    return function(req, res, next) {
      if(loggedInUser(req, res)) {
        next();
      } else {
        res.redirect(redirectUrl);
      }
    };
  };

  this.renderUnauthorized = function renderUnauthorized(req, res, templateVars = {}) {
    res.status(401);
    res.render('not_found', Object.assign({
      statusCode: 401,
      statusMessage: "Unauthorized",
      requestedUrl: req.url,
      detailedMessage: "You have to be logged in to access that URL."
    }, templateVars));
  };

  this.renderForbidden = function renderForbidden(req, res, templateVars = {}) {
    res.status(403);
    res.render('not_found', Object.assign({
      statusCode: 403,
      statusMessage: "Forbidden",
      requestedUrl: req.url,
      detailedMessage: "You don't have permission to access that URL."
    }, templateVars));
  };

  this.renderNotFound = function renderNotFound(req, res, templateVars = {}) {
    res.status(404);
    res.render('not_found', Object.assign({
      statusCode: 404,
      statusMessage: "Not found",
      requestedUrl: req.url,
      detailedMessage: ""
    }, templateVars));
  };

  this.loggedInUser = loggedInUser;
};