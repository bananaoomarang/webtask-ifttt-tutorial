# If This Then [run nodejs]: Extending IFTTT with Webtasks.io

If you've ever used IFTTT as a developer and thought something like: "Gee, I wish I could write my own scripts as channels", you may just be in luck, webtasks have you covered. In this article we'll build a simple IFTTT channel which logs words used in the headers and bylines of articles we save to [Pocket](https://getpocket.com/), so they are sortable by frequency.

## What's a Webtask?

```
return function (done) {
  done(null, 'Hello, Webtasks!');
}
```

A webtask is a snippet of code that runs an entry function on a GET request, returning the result. The above is a very simple example but, as we will see in a moment, they can be extended as much as you wish. Their major benefits include:

+ Ease of use. No complicated setup, just code.
+ Vastly simplifies/eliminates the need for backend code, boiling it down into reusable, functional pieces.
+ Tamper proof (uses JSON Webtokens behind the scenes), and encrypted where they need to be

You can play with the service online [here](https://webtask.io/tryit), and read more about it [here](https://webtask.io/docs), but what it amounts to is a safe and frictionless way to run custom micro-services.

## Setup

Firstly we need to install the command line application, to make task management easier. To set it up all we need is:

```
$ npm i -g auth0/wt-cli
$ wt init
```

To test if it's working after the setup, make the file `hello-webtasks.js` and write either the following, or something to that effect:

```
"use latest";

return (done) => {
  done(null, 'Hello, Webtasks!');
}
```

The only requirement is that you return an entry function to be run on Webtask.io's servers, here we just send back a simple message. If you run `wt create hello-webtasks.js` you should be given a URL, visit it in you're browser of choice and you can see the message is returned. It's pretty neat, right?

![Cool beans.](/IFTTT1.jpg "Hello There!")

Even neater is the ability to add some context to the request (through a query string), and access it like so:

```
"use latest";

return (ctx, done) => {
  let { name } = ctx.data;

  done(null, 'Hello, ' + name);
}
```

Generate a new URL with `wt create`, but this time when you visit it add `&name=<your name>` to the end of the address, and you're webtask will greet you!

## Backend, What Backend?

In order for our app to work, we will need to store the data somewhere more persistent. We're going to use a Mongo database (hosted for free by [Mongolab](https://mongolab.com)) to store our data, then we can use it later however we want.

Our webtask can look something like:

```
"use latest";

var { MongoClient } = require('mongodb');

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
```

We connect to the remote database, put all the words Pocket gives us in an array and loop over it, saving each one, then we confirm to IFTTT that we're done by responding.

Note that we can use require just as in regular Node. There is a list of installed modules [here](https://tehsis.github.io/webtaskio-canirequire/), with many of them available in multiple versions.

Our `save_word` function should insert our word with a count '1' if it hasn't been encountered before, and increment our count if it has been. Mongo makes this easy with its update `upsert` option, so something like this should do the trick:

```
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
```

### Top secrets

Now we need to supply our webtask with access to a database, but we can't just pass our credentials in on the querystring, hardly the safest place for passwords! Instead we'll embed it, encrypted, in our URL. Sounds like it might require some setup, but webtasks supports the passing of encrypted variables out of the box (see [these docs](https://webtask.io/docs/token), for those interested). To pass your secrets safely to your task, just run:

```
$ wt create --secret SECRET=<my-darkest-secrets> <my-webtask.js>
```

And `SECRET` will by passed on `ctx.data`, just like the variables attached on the querystring. If you haven't already set one up, sign up for a sandbox account at [Mongolab](mongolab.com/) and pass in your database's address as a secret `MONGO_URL=mongodb://<your-database>`.

### If This Then Webtask
 
Connecting your webtask to IFTTT is relatively painless, just setup a recipe that is triggered every time you save something to Pocket and configure the `that` component to be a 'Maker Channel', where we can pass off control. Copy and paste the URL given by `wt create` into the box, but add `&title={{Title}}&excerpt={{Excerpt}}` to the very end. This dumps the data given by the Pocket channel into our app and makes it consumable in the webtask's context.

You can test to see if everything's working by saving something in Pocket and watching your webtask's logs with `wt logs`. Sometimes it takes a little while for IFTTT to send the request (though it is almost always within a couple of minutes), but you should see a bunch of 'Successfully saved' messages in your console.

![Success.](/IFTTT2.jpg "Nice logging skills.")

We can soup it up by ignoring common words and punctuation, as well as styling the result, but the use of webtasks would remain the same.

### To the Backend and Beyond

If you'd like to find out more about how they work and more advanced features, you should check out the [docs](https://webtasks.io/docs) on Webtasks.io, but hopefully you can see that their simplicity and versatility is already pretty exciting!

![Ta da!](/IFTTT3.jpg "Ta da!")
