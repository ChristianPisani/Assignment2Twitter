var express = require('express');
var router = express.Router();

var keys = require('../keys');
var aws = require('aws-sdk');

var Map = require('collections/map');

const Twitter = require('twitter-node-client').Twitter;
const twitter = new Twitter(keys.twitterKey);

const TwitterStream = require('node-tweet-stream');
const twitterStreams = new Map();

const bucket = "tweetbucketcab432";

//Filestream
const fs = require("fs");

aws.config.update(keys.awsKey);

var s3 = new aws.S3();

let tweetsReceived = [];

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Twitter Search' });
});

router.post('/trackstreams', function(req, res) {
  let keywords = req.param('keywords');
  keywords = keywords.replace(/(["´`'])/g, '');
  keywords = keywords.split(',');

  let tStream = new TwitterStream(keys.twitterStreamKey);
  tStream.tweets = [];
  let streamName = "";

  for(i = 0; i < keywords.length; i++) {
    tStream.track(keywords[i]);
    streamName += keywords[i];
  }

  if(!twitterStreams.has(streamName)) {
    tStream.on('tweet', function (tweet) {
      tStream.tweets.push(tweet);
    });

    tStream.on('error', function (err) {
      console.log('Error in stream: ' + err);
    });

    twitterStreams.set(streamName, tStream);
  }

  res.end();
});

router.get('/twitterstream', function(req, res) {
  res.render('twitterstream', { title: 'Twitter Stream '});
});

router.post('/twitterstream/:lastIndex', function(req, res) {
  const lastIndex = req.params.lastIndex;
  let keywords = req.param('keywords');
  keywords = keywords.replace(/(["´`'])/g, '');
  keywords = keywords.replace(',', "");
  console.log(keywords);

  const tweets = twitterStreams.get(keywords).tweets;

  const slicedtweets = tweets.slice(lastIndex,
    tweets.length);
  console.log(slicedtweets);

  let newLastIndex = tweets.length;

  res.json({lastIndex: newLastIndex, tweets: slicedtweets});
  res.end();
});

router.get('/tweets/:date', function(req, res) {
  let keywords = req.param('keywords');
  let date = req.params.date;

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
