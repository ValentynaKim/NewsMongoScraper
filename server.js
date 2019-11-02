const express = require("express");
const app = express();

app.set("view engine", "ejs");

const bodyParser = require("body-parser");
app.use(bodyParser())

const cheerio = require("cheerio");

const mongojs = require("mongojs");

const databaseUrl = "scraper";
const collections = ["scrapedData"];

const request = require("request");

const db = mongojs(process.env.MONGODB_URI || databaseUrl, collections);


db.on("error", function (error) {
    console.log("Database Error:", error);
});

function updateDb(title, link) {
    db.scrapedData.update({ Title: title, Link: link }, { $set: { Title: title, Link: link } }, { upsert: true });
};
app.use(express.static(__dirname + '/public/'));

app.post("/saveArticle", function (req, res) {

    var title = req.body.title;
    var link = req.body.link;
    updateDb(title, link);
})


app.get("/", function (req, res) {
    request.get("https://www.theguardian.com/us", function (err, response, body) {
        var $ = cheerio.load(body);
        var results = [];
        $("h3.fc-item__title ").each(function (i, element) {
            var title = $(element).text();
            var link = $(element).children().eq(0).attr("href");
            if (link[0] == "/") {
                link = "https://www.theguardian.com" + link;
            }
            if (title != "")
                results.push({ Title: title, Link: link });
        });

        res.render("index", { results: results });
    });
});
app.get("/savedArticles", function (req, res) {
    db.scrapedData.find(function (error, result) {
        res.render("savedArticles", { results: result });
    });
});

app.post("/addComment", function (req, res) {
    var id = req.body.id;
    var comment = req.body.newComment;
    db.scrapedData.update({ "_id": mongojs.ObjectID(id) }, { $push: { Comments: comment } }, function (error, response) {
        if (error) {
            console.log(error)
        }
    });
    res.redirect("/savedArticles");
})
app.listen(process.env.PORT || 3000, function () {
    console.log("Listening on 3000");
});