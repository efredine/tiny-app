const data = {
  'users': {}
};

function generateRandomString() {
  return Math.random().toString(36).substring(2, 8);
}

function insert(model, record) {
  let id = generateRandomString();
  data[model][id] = record;
  return id;
}

function update(model, id, record) {
  return data[model][id] = record;
}

function get(model, id) {
  return data[model][id];
}

function find(modelKey, field, value) {
  let model = data[modelKey];
  return Object.keys(model).find(id => {
    return model[id][field] === value;
  });
}

module.exports = {
  insertUser: insert.bind(null, 'users'),
  getUserForId: get.bind(null, 'users'),
  findUserId: find.bind(null, 'users'),
  updateUserForId: update.bind(null, 'users')
};
