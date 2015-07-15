var parallel    = require('async').parallel;
var MongoClient = require('mongodb').MongoClient;

function save_word(word, db, cb) {
  var doc       = {
    word: word
  };

  var increment = {
    $inc: {
      count: 1
    }
  };

  var opts      = {
    upsert: true
  };

  db
    .collection('words')
    .updateOne(doc, increment, opts, function (err) {
      if(err) return cb(err);

      console.log('Successfully saved %s', word);

      cb(null);
    });
}

module.exports = function (ctx, done) {
  var words = ctx.data.title
    .split(' ')
    .concat(
      ctx.data.excerpt.split(' ')
    );

  MongoClient.connect(ctx.data.MONGO_URL, function (err, db) {
    if(err) return done(err);

    var job_list = words.map(function (word) {

      return function (cb) {
        save_word(word, db, function (err) {
          if(err) return cb(err);

          cb(null);
        });
      };

    });

    parallel(job_list, function (err) {
      if(err) return done(err);

      done(null, 'Success.');
    });

  });
};
