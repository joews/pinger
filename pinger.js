var pinger = require('./index.js');

setInterval(function() {
  pinger.ping('8.8.8.8');
}, 1000);
