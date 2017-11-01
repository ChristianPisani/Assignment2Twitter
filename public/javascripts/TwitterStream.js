script(src = "https://code.jquery.com/jquery-3.1.1.min.js") //JQuery
script(src = "https://d3js.org/d3.v4.min.js") //D3

function FetchTwitterStream(keywords) {
    $.post(`/twitterstream/${lastindex}`, {keywords: keywords},
        function (res) {
            lastindex = res.lastIndex;

            const tweetsDiv = d3.select('#stream');

            const tweets = res.tweets;

            for (let i = 0; i < tweets.length; i++) {
                tweetsDiv.append('p').text(tweets[i].text);
            }
        });
}

exports.FetchTwitterStream = FetchTwitterStream;
