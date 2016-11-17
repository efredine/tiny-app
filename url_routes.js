const models = require('./models');
const ObjectId = require('mongodb').ObjectID;
const assert = require('assert');
const tracking = require('./tracking');

// const tracking = {
//   summaryStats: function(urlRecord) {
//     return {clickCount: 0, uniques: 0};
//   },
//   clickDetails: function(urlRecord) {
//     return [];
//   },
//   track: function() {
//     //
//   }
// };
const validUrl = require('valid-url');
require('./auth_helpers')();

/**
 * Define routes for processing urls.
 *
 * @param  {object} app: express application object.
 * @param {object} db mongo db
 * @param  {object} options
 * @return {[undefined]}
 */
module.exports = function(app, db, options) {

  const BASE_URL =  `http://${options.host}:${options.port}/u/`;
  const users = db.collection('users');
  const urls = db.collection('urls');

  tracking.init(db);

  // helper function that abstracts the pattern repeated in read, update and delete
  function forAuthorizedUrl(req, res, authorized) {
    const urlObjectId = getObjectIdIfValid(req, res, req.params.id);
    if(!urlObjectId) {
      return;
    }
    urls.findOne(urlObjectId).then(urlRecord => {
      if (urlRecord) {
        if(new ObjectId(urlRecord.userId).equals(new ObjectId(req.session.userRecord._id))) {
          authorized(urlRecord);
        } else {
          renderForbidden(req, res);
        }
      } else {
        renderNotFound(req, res);
      }
    }).catch(err => {
      renderInternalError(req, res, err);
    });
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

  function generateRandomString() {
    return Math.random().toString(36).substring(2, 8);
  }

  // ROUTES -------------------------------------------------------

  // render list of urls for a logged in user
  app.get("/urls", redirectUnathorized("/login"), (req, res) => {
    urls.find({userId: new ObjectId(req.session.userRecord._id)}).toArray().then( urlRecords => {
      tracking.summaryStats(urlRecords, (err, urlsWithStats) => {
        res.render('urls_index', {baseUrl: BASE_URL, urls: urlsWithStats});
      });
    }).catch(err => {
      renderInternalError(req, res, err);
    });
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
      let urlRecord = {
        shortUrl: generateRandomString(),
        longUrl: validatedUrl,
        userId: new ObjectId(req.session.userRecord._id),
        created: now,
        lastUpdated: now
      };
      urls.insert(urlRecord).then(result => {
        assert.equal(1, result.result.n);
        let userRecord = result.ops[0];
        res.redirect("/urls/" + urlRecord._id);
      }).catch(err => {
        renderInternalError(req, res, err);
      });
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
      const edit = req.query.edit;
      let templateVars = Object.assign({
        baseUrl: BASE_URL,
        edit: edit,
        errorMessage: ""
      }, urlRecord);
      if(!edit) {
        tracking.stats(urlRecord, (err, stats) => {
          console.log(stats);
          if(err) {
            renderInternalError(req, res);
            return;
          }
          res.render('urls_show', Object.assign(templateVars, stats));
        });
      } else {
        res.render('urls_show', templateVars);
      }
    });
  });

  // update url
  app.post("/urls/:id", blockUnauthorized, (req, res) => {
    forAuthorizedUrl(req, res, urlRecord => {
      let longUrl = req.body.longUrl;
      let validatedUrl = checkUrl(longUrl);
      if(validatedUrl) {
        urls.updateOne({_id: new ObjectId(urlRecord._id)}, {
          $set: {
            longUrl: validatedUrl,
            lastUpdated: new Date()
          }
        }, (err, result) => {
          if(err) {
            renderInternalError(req, res, err);
            return;
          }
          res.redirect('/urls');
        });
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
      urls.deleteOne({_id: new ObjectId(urlRecord._id)}, (err, result) => {
        res.redirect('/urls');
      });
    });
  });

  // redirection
  app.get("/u/:shortUrl", (req, res) => {
    urls.findOne({shortUrl: req.params.shortUrl}, (err, urlRecord) => {
      if(err) {
        renderInternalError(req, res);
        return;
      }
      if (urlRecord && urlRecord.longUrl) {
        tracking.track(req, urlRecord);
        res.redirect(urlRecord.longUrl);
      } else {
        renderNotFound(req, res);
      }
    });
  });

};