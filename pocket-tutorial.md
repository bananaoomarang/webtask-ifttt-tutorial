# Using Webtasks.io to Extend IFTTT

## What's a Webtask?

```
return function (done) {
  done(null, 'Hello, Webtasks!');
}
```

A webtask is a snippet of code that runs an entry function on a GET request, returning the result. The above is a very simple example but, as we will see in a moment, they can be extended to achieve virtually anything you desire. Their major benefits include:

+ Ease of use. No complicated setup, just code.
+ Vastly simplifies/eliminates the need for backend code, boiling it down into reusable, functional pieces.
+ Streaming logs for quick debugging
+ Tamper proof (uses JSON Webtokens behind the scenes), and encrypted where they need to be
+ Access to hundreds of dependency-managed [pre-installed modules](https://tehsis.github.io/webtaskio-canirequire/), many across multiple versions
+ Bonus access to the latest ES6 features with no setup, just `"use latest";` and you're set.

You can play with the service online [here](https://webtask.io/tryit), and read more about it's [technical implementation](https://webtask.io/docs/how), as well as [problems it solves](https://webtask.io/docs/101), but what it amounts to is a safe and frictionless way to run custom micro-services, and here we'll use it to build a basic app which tracks our reading habits.

## Setup

Firstly we need to install the command line application, to make task management easier. To set it up all we need is:

```
$ npm i -g wt-cli
$ wt init
```

To test if it's working after the setup, make the file `hello-webtasks.js` and write either the following, or something to that effect:

```
"use latest";

return (done) => {
  done(null, 'Hello, Webtasks!');
}
```

The only requirement is that you return a function to be run on Webtask.io's servers, here we just send back a simple message. If you run `wt create hello-webtasks.js` you should be given a URL, visit it in you're browser of choice and you can see the message is returned. It's pretty neat, right?

![Cool beans.](/IFTTT1.jpg "Hello There!")

Even moreso is the ability to add some context to the request (through a query string), and access it like so:

```
"use latest";

return (ctx, done) => {
  let { name } = ctx.data;

  done(null, 'Hello, ' + name);
}
```

Generate a new URL with `wt create`, but this time when you visit it add `&name=<your name>` to the end of the address, and you're webtask will greet you!

## Building a Basic App

Assuming that's working, we can move onto something a little more adventurous. If you've ever thought it might be fun if IFTTT let you execute some code of choice on one of their triggers, without having to go through the mildly arduous process of setting up a backend server specifically for that service, webtasks have you covered.

Here we're going to build an app which logs words in the headers and bylines of articles we save to [Pocket](https://getpocket.com/), and then sorts them by frequency and presents an organised list to the user.

We're going to use a Mongo database (hosted for free by [Mongolab](https://mongolab.com)) to store our data, then we can securly access that data and show it to the user.

To do this we'll use two webtasks, one to interface with IFTTT and save the relevant data, and one to view it.

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

Our `save_word` function should insert our word with a count '1' if it hasn't been encountered before, and increment our count if it has been. Mongo makes this easy with its update `upsert` option:

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

Now we need to supply our webtask with access to database, but we can't just pass our credentials in on the querystring, hardly the safest place for passwords! Instead we'll embed it, encrypted, in our URL. Sounds like it might require some setup, but webtasks supports the passing of encrypted variables out of the box (see [these docs](https://webtask.io/docs/token), for those interested). To pass your secrets safely to your task, just run:

```
$ wt create --secret SECRET=<my-darkest-secrets> <my-webtask.js>
```

And `SECRET` will by passed on `ctx.data`, just like the variables attached on the querystring. If you haven't already set one up, sign up for a sandbox account at [Mongolab](mongolab.com/) and pass in your database's address as a secret `MONGO_URL=mongodb://<your-database>`.

### If This Then Webtask

Connecting your webtask to IFTTT is relatiely painless, just setup a recipe that is triggered everytime you save something to Pocket and configure the result to be a 'Maker Channel'. Copy and paste the URL given by `wt create` into the box, but add `&title={{Title}}&excerpt={{Excerpt}}` to the very end. This dumps the data given by the Pocket channel into our app and makes it consumable in the webtask's context.

You can test to see if everything's working by saving something in Pocket and watching your webtask's logs with `wt logs`. Sometimes it takes a little while for IFTTT to send the request (within a couple of minutes), but you should see a bunch of 'Succesfully saved' messages in your console.

![Success.](/IFTTT2.jpg "Nice logging skills.")

### Never Enough Webtasks

Now all that's left is to write a view to see our data. Another nifty feature of webtasks is that they support full, node requests and response objects, as well as the simple callback model, which allows us to easily implemented a simple web page to organise the data. We'll use [handlebars](http://handlebarsjs.com/) as a templating engine, because I like it, but there are many available. A simple (unstyled) view might look something like this:

```
var View = `
<html>
  <head>
    <title>Pocketed Words</title>
  </head>
  <body>
    {{#if words.length}}
      <ul>
        {{#each words}}
          <li>{{word}}: {{count}}</li>
        {{/each}}
      </ul>
    {{else}}
      <h1>No words :(</h1>
    {{/if}}
  </body>
</html>
`;
```

Where we just display each of the words in a list.

The webtask entry function just needs to sort the words into descending frequency order and and return a compiled handlebars view.

```
return (ctx, req, res) => {
  let { MONGO_URL } = ctx.data;

  MongoClient.connect(MONGO_URL, (err, db) => {
    if(err) return res.end(err);

    db
      .collection('words')
      .find()
      .toArray( (err, words) => {
        if(err) return res.end(err);

        const view_ctx = {
          words: words.sort( (word1, word2) => {
            return word2.count - word1.count;
          })
        };

        const template = handlebars.compile(View);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(template(view_ctx));
      });
  });
};
```

We use the Nodejs response interface to package our compiled view and send it to the browser, after fetching the words from our database. Now if we `wt create` our webtask, passing in `MONGO_URL` as before, visiting the result should give us a bare bones list!

![Ta da!](/IFTTT3.jpg "Ta da!")

We can soup it up by ignoring common words and punctuation, as well as styling the result, but the use of webtasks would remain the same.

### To the Backend and Beyond

If you'd like to find out more about how they work and more advanced features, you should check out the [docs](https://webtasks.io) on Webtasks.io, but hopefully you can see that their simplicity and versatility is already pretty exciting!
