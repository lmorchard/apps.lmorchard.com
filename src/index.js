var domready = require('domready');
var apps = require('../dist/index.json');
var indexBy = require('lodash.indexby');

var appsByManifest = indexBy(apps, 'manifest');

function init () {

  $('header button.back').on('click', function () {
    $$('.mainApp').className = 'mainApp appsList';
  });

  $('header button.help').on('click', function () {
    $$('.mainApp').className = 'mainApp help';
  });

  var apps = document.querySelector('.apps');

  $('.apps').on('click', function (ev) {

    var target = ev.target;
    if (!target.classList.contains('app')) {
      target = target.parentNode;
    }
    var manifest = target.getAttribute('data-manifest');

    var app = appsByManifest[manifest];

    $$('.appDetailView').setAttribute('data-manifest', manifest);
    $$('.appDetailView .name').innerHTML = app.name;
    $$('.appDetailView .icon').src = app.icon;
    $$('.appDetailView .description').innerHTML = app.description;

    $$('.mainApp').className = 'mainApp appDetail';
  });

  $('.appDetailView button.launch').on('click', function (ev) {
    var manifest = $$('.appDetailView').getAttribute('data-manifest');
    var app = appsByManifest[manifest];
    window.open(app.baseUrl + app.launch_path);
  });

  $('.appDetailView button.install').on('click', function (ev) {
    var manifest = $$('.appDetailView').getAttribute('data-manifest');
    var request = navigator.mozApps.install(manifest);
    console.log(manifest, request);
    request.onsuccess = function () {
      alert('installed ' + request.result.origin);
      console.log(request.result);
    };
    request.onerror = function () {
      alert('failed ' + request.error.name);
    };
  });

}

// bling.js - https://gist.github.com/paulirish/12fb951a8b893a454b32
var $ = document.querySelectorAll.bind(document);
var $$ = document.querySelector.bind(document);

Node.prototype.on = window.on = function (name, fn) {
  this.addEventListener(name, fn);
}

NodeList.prototype.__proto__ = Array.prototype;

NodeList.prototype.on = NodeList.prototype.addEventListener = function (name, fn) {
  this.forEach(function (elem, i) {
    elem.on(name, fn);
  });
}

domready(init);
