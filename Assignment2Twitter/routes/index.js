var express = require('express');
var router = express.Router();

var aws_keys = require('../aws_keys');
var aws = require('aws-sdk');

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

router.get('/tweets', function(req, res) {
  let keywords = req.param('keywords');

  //Remove dangerous symbols
  keywords = keywords.replace(/(["´`'])/g, '');
  keywords = keywords.split(',');

  res.json(keywords);
  res.end();
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
