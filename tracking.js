const models = require('./models');
const validUrl = require('valid-url');
require('./auth_helpers')();

function eventsByTrackingId(clicks) {
  let group = {};
  clicks.forEach(clickRecord => {
    const trackingId = clickRecord.trackingId;
    if(!group[trackingId]) {
      group[trackingId] = [];
    }
    group[trackingId].push(clickRecord);
  });
  return group;
}

/**
 * Walks the clickCount array and generates summary statistics.
 * @param  {Object} urlRecord
 * @return {Object} With clickCount and unique user count.
 */
function summaryStats(urlRecord) {
  const clicks = urlRecord.clicks;
  const clickCount = clicks ? clicks.length : 0;
  let uniques = 0;
  if(clickCount > 0) {
    uniques = Object.keys(eventsByTrackingId(clicks)).length;
  }
  return {clickCount, uniques};
}

function clickDetails(urlRecord) {
//
}
/**
 * Records a click record for the URL.  Click records are kept in an array.
 * @param  {Object} req the httpRequest object
 * @param  {Object} the urlRecord
 * @return {undefined}
 */
function track(req, urlRecord) {

  // don't track clicks by logged in users on their own links.
  let userRecord = loggedInUser(req);
  if(userRecord && urlRecord.userId === userRecord.id) {
    return;
  }

  // If this URL doesn't have a click record array, create it.
  if(!urlRecord.clicks) {
    urlRecord.clicks = [];
  }

  let trackingId = req.session.trackingId;

  // If this session doesn't have a tracking Id, craete a new one and store it in the session.
  if(!trackingId) {
    let trackingId = models.insertUser({});
    req.session.trackingId = trackingId;
  }

  // record trackingId and headers for each click
  urlRecord.clicks.push({trackingId: trackingId, headers: req.headers, time: new Date()});
}

exports.routes = function(app) {

  // redirection route
  app.get("/u/:shortUrl", (req, res) => {
    let urlRecord = models.getUrlForId(req.params.shortUrl);
    if (urlRecord && urlRecord.longUrl) {
      track(req, urlRecord);
      res.redirect(urlRecord.longUrl);
    } else {
      renderNotFound(req, res);
    }
  });
};

exports.summaryStats = summaryStats;
