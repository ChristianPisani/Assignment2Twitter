var express = require('express');
var router = express.Router();

var keys = require('../keys');
var aws = require('aws-sdk');

var Map = require('collections/map');

const Twitter = require('twitter-node-client').Twitter;
const twitter = new Twitter(keys.twitterKey);

const TwitterStream = require('node-tweet-stream');
//Create a new stream for each unique query
const twitterStreams = new Map();

const bucket = "tweetbucketcab432";

//Filestream
const fs = require("fs");

const ignoreWords = ['and', 'this', 'or', 'to', 'a', 'rt', 'is', 'in', 'of', 'if'];

aws.config.update(keys.awsKey);
var s3 = new aws.S3();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'Twitter Search'
  });
});

/**
 * Add keywords to track
 * keywords - Sent with request
 */
router.post('/trackstreams', function(req, res) {
  let keywords = req.param('keywords');
  keywords = keywords.replace(/(["´`'])/g, '');
  keywords = keywords.split(',');

  let tStream = new TwitterStream(keys.twitterStreamKey);
  tStream.tweets = [];
  let streamName = "";

  for (i = 0; i < keywords.length; i++) {
    tStream.track(keywords[i]);
    streamName += keywords[i];
  }

  if (!twitterStreams.has(streamName)) {
    tStream.on('tweet', function(tweet) {
      tStream.tweets.push(tweet);
    });

    tStream.on('error', function(err) {
      console.log('Error in stream: ' + err);
    });

    twitterStreams.set(streamName, tStream);
  }

  res.end();
});

/*
 * Render twitter stream page
 */
router.get('/twitterstream', function(req, res) {
  res.render('twitterstream', {
    title: 'Twitter Stream '
  });
});

/*
 * Get stream corresponding to the keywords written
 * Gets the tweets from the map, and only sends back tweets
 * that are newer than the last seen (client keeps track of this)
 */
router.post('/twitterstream/:lastIndex', function(req, res) {
  const lastIndex = req.params.lastIndex;
  let keywords = req.param('keywords');
  keywords = keywords.replace(/(["´`'])/g, '');
  keywords = keywords.replace(',', "");

  const tweets = twitterStreams.get(keywords).tweets;
  console.log(tweets);

  const slicedtweets = tweets.slice(lastIndex,
    tweets.length);

  let newLastIndex = tweets.length;

  let tweetsToString = "";
  for(i = 0; i < slicedtweets.length; i++) {
    tweetsToString += slicedtweets[i].text;
  }

  let wordcounts = AnalyseData(tweetsToString);

  res.json({
    lastIndex: newLastIndex,
    tweets: slicedtweets,
    wordscounts: wordcounts
  });
  res.end();
});

/*
* Count words in string
*/
function AnalyseData(input) {
  let words = [];
  let wordscounts = [];

  input = input.replace(/\s+/g," ").split(" ");

  for (let i = 0; i < input.length; i++) {
    if (input[i] !== "") {
      const word = input[i].toLowerCase();
      if(ignoreWords.includes(word))
        continue;

      if (!words.includes(word)) {
        words.push(word);
        wordscounts.push({
          word: word,
          count: 1
        });
      } else {
        wordscounts[words.indexOf(word)].count++;
      }
    }
  }
  wordscounts.sort(function(a, b) {
    return b.count - a.count;
  });
  return wordscounts;
}

/*
 * Basic twitter search, not used, but will keep it in for now
 */
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

    if (processed >= keywords.length) {
      res.json(tweets);
      res.end();
    }
  }

  for (i = 0; i < keywords.length; i++) {
    twitter.getSearch({
        'q': `#${keywords[i]}`,
        'count': 100
      },
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

/*
 * Renders the page for bar chart. For testing.
 */
router.get("/visualization", function(req, res) {
  res.render('datavisualization', {
    title: 'Data'
  });
});

/*
 * Get objects from bucket.
 * Needs to be expanded.
 */
router.get("/persistence", function(req, res) {
  var params = {
    Bucket: bucket,
    Key: "tweetkey.txt"
  };
  s3.getObject(params, function(err, data) {
    if (err) {
      console.log(err, err.stack);
      res.write(err.message);
      res.end();
    } else {
      res.write(data.Body);
      res.end();
    }
  });
});

/*
 * Add objects to aws bucket.
 * Needs to be expanded.
 */
router.post("/persistence", function(req, res) {
  var params = {
    Body: req.param.body,
    Bucket: bucket,
    Key: "tweetkey.txt",
    ServerSideEncryption: "AES256",
    Tagging: "key1=value1&key2=value2"
  };

  s3.putObject(params, function(err, data) {
    if (err) {
      res.write(err.message);
      res.end();
    } else {
      res.json(data);
      res.end();
    }
  });
});

module.exports = router;
