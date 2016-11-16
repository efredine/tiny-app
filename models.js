const bcrypt = require('bcrypt');
const data = {
  "users": {
    "666XXX": {
      id: "666XXX",
      email: "eric.fredine@gmail.com",
      password: bcrypt.hashSync("hello", 10)
    }
  },
  "urls": {
    "b2xVn2": {
      userId: "666XXX",
      id: "b2xVn2",
      longUrl: "http://www.lighthouselabs.ca",
      created: new Date(),
      lastUpdated: new Date()
    },
    "9sm5xK": {
      userId: "666XXX",
      id: "9sm5xK",
      longUrl: "http://www.google.com",
      created: new Date(),
      lastUpdated: new Date()
    }
  }
};

function generateRandomString() {
  return Math.random().toString(36).substring(2, 8);
}

function insert(model, record) {
  let id = generateRandomString();
  record.id = id;
  data[model][id] = record;
  return id;
}

function update(model, id, record) {
  return data[model][id] = record;
}

function get(model, id) {
  return data[model][id];
}

function deleteRecord(model, id) {
  delete data[model][id];
}

function find(modelKey, field, value) {
  let model = data[modelKey];
  return Object.keys(model).find(id => { 
    return model[id][field] === value;
  });

  // Nice use of find here!
  // FYI there is a concise syntax you can use here
  // because your find function is a one-liner.
  // The 'return' is implicit.
  let model = data[modelKey];
  return Object.keys(model)
          .find(id => model[id][field] === value);
}

function urlsForUser(userId) {
  let urls = data['urls'];
  return Object.keys(urls).filter(urlId => {
    return urls[urlId].userId === userId;
  })
  .map(key => urls[key]);
}

module.exports = {
  insertUser: insert.bind(null, 'users'),  // hehe, very clever.
  getUserForId: get.bind(null, 'users'),
  findUserId: find.bind(null, 'users'),
  updateUserForId: update.bind(null, 'users'),
  insertUrl: insert.bind(null, 'urls'),
  getUrlForId: get.bind(null, 'urls'),
  findUrlId: find.bind(null, 'urls'),
  updateUrlForId: update.bind(null, 'urls'),
  deleteUrlForId: deleteRecord.bind(null, 'urls'),
  urlsForUser: urlsForUser
};
