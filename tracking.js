const models = require('./models');
const validUrl = require('valid-url');
require('./auth_helpers')();

var trackingIds = undefined;
var events = undefined;

// Mongo db collection access
function init(db) {
  trackingIds = db.collection('trackingIds');
  events = db.collection('events');
}

function groupBy(arr, keyFn) {
  let group = {};
  arr.forEach(x => {
    let key = keyFn(x);
    if(!group[key]) {
      group[key] = [];
    }
    group[key].push(x);
  });
  return group;
}

function summaryStats(urls, callback) {
  events.aggregate([
    {
      $match: { shortUrl: { $in: urls.map(x => x.shortUrl) } }
    },
    {
      $group: {
        _id: {
          shortUrl: "$shortUrl",
          trackingId: "$trackingId"
        },
        count: {
          $sum: 1
        }
      }
    }
  ]).toArray((err, result) => {
    if(err) {
      callback(err, result);
    } else {
      let groups = groupBy(result, x => x._id.shortUrl);
      callback(null, urls.map(urlRecord => {
        let group = groups[urlRecord.shortUrl];
        return Object.assign(urlRecord, {
          uniques: group.length,
          clickCount: group.reduce((sum, x) => sum + x.count, 0)
        });
      }));
    }
  });
}

function eventsForUrl(urlRecord, callback) {
  events.find({shortUrl: urlRecord.shortUrl}).toArray((err, events) => {
    callback(err, events);
  });
}

function stats(urlRecord, callback) {
  eventsForUrl(urlRecord, (err, events) => {
    if(err) {
      callback(err, null);
      return;
    }
    let groups = groupBy(events, x => x.trackingId);
    let groupsFormatted = Object.keys(groups).map(groupKey => {
      const userAgent = groups[groupKey][0].headers['user-agent'];
      return {
        trackingId: groupKey,
        userAgent: userAgent,
        events: groups[groupKey]
      };
    });
    let result = {
      eventDetails: groupsFormatted,
      uniques: groupsFormatted.length,
      clickCount: groupsFormatted.reduce( (sum, x) => sum + x.events.length, 0)
    };
    callback(null, result);
  });
}

function insertEvent(req, urlRecord, trackingId) {
  events.insertOne({
    trackingId: trackingId,
    urlRecordId: urlRecord._id,
    longUrl: urlRecord.longUrl,
    shortUrl: urlRecord.shortUrl,
    headers: req.headers,
    time: new Date()
  });
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
  if(userRecord && urlRecord.userId === userRecord._id) {
    return;
  }

  let trackingId = req.session.trackingId;

  // If this session doesn't have a tracking Id, create a new one and store it in the session.
  if(!trackingId) {
    let userAgent = req.headers['user-agent'];
    trackingIds.insertOne({userAgent}, (err, result) => {
      if(!err && result.insertedCount === 1) {
        trackingId = result[0]._id;
        req.session.trackingId = trackingId;
        insertEvent(req, urlRecord, trackingId);
      }
    });
  } else {
    insertEvent(req, urlRecord, trackingId);
  }
}

module.exports = {
  init, track, stats, summaryStats
};
