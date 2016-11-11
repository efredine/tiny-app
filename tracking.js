const models = require('./models');
const validUrl = require('valid-url');
require('./render_helpers')();

function summaryStats(urlRecord) {
  const clicks = urlRecord.clicks;
  const clickCount = clicks ? clicks.length : 0;
  let uniques = 0;
  if(clickCount > 0) {
    let freq = {};
    clicks.forEach(clickRecord => {
      const trackingId = clickRecord.trackingId;
      if(!freq[trackingId]) {
        freq[trackingId] = 0;
      }
      freq[trackingId] += 1;
    });
    uniques = Object.keys(freq).length;
  }
  return {clickCount, uniques};
}

function track(req, urlRecord) {
  // don't track clicks by logged in users on their own links.
  let userRecord = loggedInUser(req);
  if(userRecord && urlRecord.userId === userRecord.id) {
    return;
  }

  if(!urlRecord.clicks) {
    urlRecord.clicks = [];
  }
  let trackingId = req.session.trackingId;
  if(!trackingId) {
    let trackingId = models.insertUser({});
    req.session.trackingId = trackingId;
  }
  // record trackingId and headers for each click
  urlRecord.clicks.push({trackingId: trackingId, headers: req.headers});
  console.log(summaryStats(urlRecord));
}

exports.routes = function(app) {
  // redirection
  app.get("/u/:shortUrl", (req, res) => {
    console.log('session', req.session);
    console.log(req.headers);
    let urlRecord = models.getUrlForId(req.params.shortUrl);
    if (urlRecord && urlRecord.longUrl) {
      track(req, urlRecord);
      res.redirect(urlRecord.longUrl);
    } else {
      renderNotFound(req, res, getSessionVars(req, res));
    }
  });
};

exports.summaryStats = summaryStats;
