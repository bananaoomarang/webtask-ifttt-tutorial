"use latest";

var { MongoClient } = require('mongodb');
var ejs             = require('ejs');

var View = `
<html>
  <head>
    <title>Pocketed Words</title>
  </head>
  <body>
    <% if(!words.length) { %>
      <h1>No words :(</h1>
    <% } else { %>
    <ul>
      <% words.sort(sortFunction).forEach(function (word) { %>
        <li> <%= word.word %> : <%= word.count%></li>
      <% }); %>
    </ul>
    <% } %>
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

        res.writeHead(200, { 'Content-Type': 'text/html' });

        res.end(ejs.render(View, {
          words,
          sortFunction: (word1, word2) => {
            return word2.count - word1.count;
          }
        }));
      });
  });
};
