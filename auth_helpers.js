// Returns the user record for a logged in user.  This will be undefined if the user is not logged in.
function loggedInUser(req, res) {
  return req.session.userRecord;
}

/**
 * Exports helper functions into the importing module's namespace.
 *
 * @return {undefined}
 */
module.exports = function() {

  /**
   * Used in route definitions to render an unauthorized page if the user is not logged in.
   * If the user is logged in, it passes processing on to the route.  Example usage:
   * app.post("/urls", blockUnauthorized, (req, res) => {// processing for logged in user}
   */
  this.blockUnauthorized = function blockUnauthorized(req, res, next) {
    if(loggedInUser(req, res)) {
      next();
    } else {
      renderUnauthorized(req, res);
    }
  };

  /**
   * Used in route definitions to redirect the user to the specified URL if the user is not logged in.
   * If the user is logged in, passes processing on to the route.  Example usage:
   * app.get("/urls", redirectUnathorized("/login"), (req, res) => {// processing for logged in user}
   * @param  {String} redirectUrl to use
   * @return {Function} A middleware function.
   */
  this.redirectUnathorized = function renderUnauthorized(redirectUrl) {
    return function(req, res, next) {
      if(loggedInUser(req, res)) {
        next();
      } else {
        res.redirect(redirectUrl);
      }
    };
  };

  // Render error as a 401 page.
  this.renderUnauthorized = function renderUnauthorized(req, res, templateVars = {}) {
    res.status(401);
    res.render('not_found', Object.assign({
      statusCode: 401,
      statusMessage: "Unauthorized",
      requestedUrl: req.url,
      detailedMessage: "You have to be logged in to access that URL."
    }, templateVars));
  };

  // Render error as a 403 page.
  this.renderForbidden = function renderForbidden(req, res, templateVars = {}) {
    res.status(403);
    res.render('not_found', Object.assign({
      statusCode: 403,
      statusMessage: "Forbidden",
      requestedUrl: req.url,
      detailedMessage: "You don't have permission to access that URL."
    }, templateVars));
  };

  // Render error as a 404 page.
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