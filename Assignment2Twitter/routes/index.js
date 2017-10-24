var express = require('express');
var router = express.Router();

var aws_keys = require('../aws_keys');
var aws = require('aws-sdk');

const twitterConfig = ({
  "consumerKey": "LWCuMto6lz7lixA6dV4jHaFKO",
  "consumerSecret": "38WGBgeGKCCce4gw1DVhImUIuNuJpW6Lyoz5VuOtwoZUPepXjJ",
  "accessToken": "286845436-EZsgffpRk72RUGy40WVBSEAnjl6UYNmPbc1bMJ1M",
  "accessTokenSecret": "JPT2G2lXHHkQUInR6ALsGgUpiAhqxsTDvPOrXkCJ3Rzr0"
});

const Twitter = require('twitter-node-client').Twitter;
const twitter = new Twitter(twitterConfig);

const bucket = "tweetbucketcab432";

//Filestream
const fs = require("fs");

aws.config.update({
    accessKeyId: aws_keys.access_key,
    secretAccessKey: aws_keys.secret
});

var s3 = new aws.S3();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Twitter Search' });
});

router.get('/tweets/:date', function(req, res) {
  let keywords = req.param('keywords');
  let date = req.params.date;
  console.log(date);

  //Remove dangerous symbols
  keywords = keywords.replace(/(["´`'])/g, '');
  keywords = keywords.split(',');

  let tweets = [];

  let processed = 0;

  var receivedTweet = function() {
    processed++;

    if(processed >= keywords.length) {
      res.json(tweets);
      res.end();
    }
  }

  for(i = 0; i < keywords.length; i++) {
    twitter.getSearch({'q':`#${keywords[i]} since:${date}`,'count': 100},
    function(err, response, body) { //Error
      console.log(err);
      receivedTweet();
    },
    function(data) { //Success
      console.log(JSON.parse(data).statuses);
      tweets.push(JSON.parse(data).statuses);
      receivedTweet();
    });
  }
});

router.get("/visualization", function(req, res) {
  res.render('datavisualization', {title: 'Data'});
});

router.get("/persistence", function(req, res) {
  var params = {
    Bucket: bucket,
    Key: "tweetkey.txt"
  };
  s3.getObject(params, function(err, data) {
    if (err) {
      console.log(err, err.stack);
      res.write("<h1>An error occurred</h1>");
      res.end();
    } else {
      res.write(data.Body);
      res.end();
    }
  });
});

router.post("/persistence", function(req, res) {
  var params = {
    Body: "Test Twitter Text",
    Bucket: bucket,
    Key: "tweetkey.txt",
    ServerSideEncryption: "AES256",
    Tagging: "key1=value1&key2=value2"
  };
  console.log(params);
  s3.putObject(params, function(err, data) {
    if (err) {
      console.log(err, err.stack);
      res.end();
    } else {
      console.log(data);
      res.json(data);
      res.end();
    }
  });
});

module.exports = router;
