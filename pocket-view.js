"use latest";

var { MongoClient } = require('mongodb');
var handlebars      = require('handlebars');

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
