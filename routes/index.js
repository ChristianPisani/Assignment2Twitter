const express = require('express');
const router = express.Router();

const keys = require('../keys');
const aws = require('aws-sdk');

const Map = require('collections/map');

const TwitterStream = require('node-tweet-stream');
//Create a new stream for each unique query
const twitterStreams = new Map();

const persistence = {
    Bucket: 'tweetbucketcab432',
    Key: 'tweetkey.txt'
};

const ignoreWords = ['and', 'this', 'or', 'to', 'a', 'rt', 'is', 'in', 'of', 'if',
    'we', 'as', 'if', 'the', 'for', 'on', 'was', 'how'];

aws.config.update(keys.awsKey);
const s3 = new aws.S3();

const notPersisted = new Map();

setInterval(()=>{
    updateBucket();
}, 10000);

/* GET home page. */
router.get('/', function (req, res, next) {
    s3.getObject(persistence, function (err, data) {

        let statistics = data.Body.toString().split('\n');
        let output = '';
        for(let i in statistics){
            output += statistics[i].split(/\s+/g)[0];
            output += '\n';
        }

        res.render('index', {
            title: 'Twitter Search',
            statistics: output
        });
    });
});

/**
 * Add keywords to track
 * keywords - Sent with request
 */
router.post('/trackstreams', function (req, res) {
    let keywords = decodeURIComponent(req.param('keywords'));
    keywords = keywords.replace(/(["´`'])/g, '');

    addStream(keywords);
    updateKeywordStatistics(keywords);
    res.end();
});

function addStream(keywords) {

    if (!twitterStreams.has(keywords)) {
        let tStream = new TwitterStream(keys.twitterStreamKey);
        tStream.tweets = [];

        let split = keywords.split(',');

        for (let i = 0; i < split.length; i++) {
            tStream.track(split[i]);
        }

        tStream.on('tweet', function (tweet) {
            tStream.tweets.push(tweet);
        });

        tStream.on('error', function (err) {
            console.log('Error in stream: ' + err);
        });

        twitterStreams.set(keywords, tStream);

    }
}

/*
 * Render twitter stream page
 */
router.get('/twitterstream', function (req, res) {
    res.render('twitterstream', {
        title: 'Twitter Stream '
    });
});

/*
 * Get stream corresponding to the keywords written
 * Gets the tweets from the map, and only sends back tweets
 * that are newer than the last seen (client keeps track of this)
 */
router.post('/twitterstream/:lastIndex', function (req, res) {
    const lastIndex = req.params.lastIndex;
    let keywords = decodeURIComponent(req.param('keywords'));
    keywords = keywords.replace(/(["´`'])/g, '');

    addStream(keywords);

    const tweets = twitterStreams.get(keywords).tweets;

    const slicedTweets = tweets.slice(lastIndex,
        tweets.length);

    let newLastIndex = tweets.length;

    let tweetsToString = "";
    for (let i = 0; i < slicedTweets.length; i++) {
        tweetsToString += slicedTweets[i].text;
    }

    let wordCounts = AnalyseData(tweetsToString);

    res.json({
        lastIndex: newLastIndex,
        tweets: slicedTweets,
        wordscounts: wordCounts
    });
    res.end();
});

/*
* Count words in string
*/
function AnalyseData(input) {
    let words = [];
    let wordscounts = [];

    input = input.replace(/\s+/g, " ").split(" ");

    for (let i = 0; i < input.length; i++) {
        if (input[i] !== "") {
            const word = input[i].toLowerCase();
            if (ignoreWords.includes(word))
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
    wordscounts.sort(function (a, b) {
        return b.count - a.count;
    });
    return wordscounts;
}

/*
 * Renders the page for bar chart. For testing.
 */
router.get("/visualization", function (req, res) {
    res.render('datavisualization', {
        title: 'Data'
    });
});

function updateKeywordStatistics(keywords) {
    const split = keywords.split(',');

    for (let i in split) {
        let entry = notPersisted.get(split[i]);
        if (entry) {
            notPersisted.set(split[i], entry + 1);
        } else {
            notPersisted.set(split[i], 1);
        }
    }
}

function updateBucket() {

    s3.getObject(persistence, (err, data) => {
        if(err){
            console.log(err.message);
        }else{

            const lines = data.Body.toString().split('\n');

            let newBucket = "";

            for (let i in lines) {
                if(lines[i] === "")
                    continue;

                let line = lines[i].split(/\s+/g);
                let entry = notPersisted.get(line[0]);

                if (entry) {
                    let newValue = Number(line[1]) + entry;
                    newBucket += `${line[0]} ${newValue}\n`;
                    notPersisted.delete(line[0]);
                } else {
                    newBucket += lines[i] + "\n";
                }
            }
            notPersisted.forEach((v, k) =>{
                newBucket += `${k} ${v}\n`;

            });

            notPersisted.clear();

            const params = {
                Body: newBucket,
                Bucket: persistence.Bucket,
                Key: persistence.Key,
                ServerSideEncryption: "AES256"
            };

            s3.putObject(params, function (err, data) {
                if (err) {
                    console.log(err);
                }
            });
        }
    });
}

/*
 * Get objects from bucket.
 * Needs to be expanded.
 */
router.get("/persistence", function (req, res) {
    s3.getObject(persistence, function (err, data) {
        if (err) {
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
router.post("/persistence", function (req, res) {
    const params = {
        Body: req.param('content'),
        Bucket: persistence.Bucket,
        Key: persistence.Key,
        ServerSideEncryption: "AES256",
        Tagging: "key1=value1&key2=value2"
    };

    s3.putObject(params, function (err, data) {
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
