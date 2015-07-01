"use latest";

var { MongoClient } = require('mongodb');

function save_word(word, db, cb) {
  const doc       = { word };

  const increment = {
    $inc: {
      count: 1
    }
  };

  const opts      = {
    upsert: true
  };

  db
    .collection('words')
    .updateOne(doc, increment, opts, err => {
      if(err) return cb(err);

      console.log('Successfully saved %s', word);

      cb(null);
    });
}

return (ctx, done) => {
  const { MONGO_URL, title, excerpt } = ctx.data;
  const words = title
    .split(' ')
    .concat(
      excerpt.split(' ')
    );

  MongoClient.connect(MONGO_URL, (err, db) => {
    if(err) return done(err);

    words.forEach(word => {

      save_word(word, db, err => {
        if(err) done(err);
      });

    });

    done(null, 'Success.');
  });
};
