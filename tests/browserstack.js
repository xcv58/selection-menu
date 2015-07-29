// See https://www.browserstack.com/automate/node
var webdriver = require('browserstack-webdriver');

var capabilities = {
  'browserName' : 'iPhone',
  'platform' : 'MAC',
  'device' : 'iPhone 5C',
  'browserstack.debug': true,
  'browserstack.user': process.env.BROWSERSTACK_USER,
  'browserstack.key': process.env.BROWSERSTACK_KEY
}

var driver = new webdriver.Builder().
  usingServer('http://hub.browserstack.com/wd/hub').
  withCapabilities(capabilities).
  build();
  
function $(selector) {
  return driver.findElement(webdriver.By.css(selector))
}  

try {

  driver.get('https://idorecall.github.io/selection-menu/');


  $('.project-name').getText().then(function (text) {
    console.log(text)
  });



} finally {
  // required, or the test will time out
  driver.quit();
}
