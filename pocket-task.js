"use latest";

var { MongoClient } = require('mongodb');

function save_word(word, db, cb) {
  console.log('saving...');
  db
    .collection('words')
    .updateOne({ word }, { $inc: { count: 1 } }, { upsert: true }, err => {
      if(err) return cb(err);

      cb(null);
    });
}

return (ctx, done) => {
  let { MONGO_URL, title, excerpt } = ctx.data;

  MongoClient.connect(MONGO_URL, (err, db) => {
    if(err) return done(err);

    let words = title.split(' ').concat(excerpt.split(' '));

    words.forEach(word => {

      save_word(word, db, err => {
        if(err) done(err);
      });

    });

    done(null, 'Success.');
  });

};
