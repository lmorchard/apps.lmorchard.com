var domready = require('domready');
var apps = require('../dist/index.json');
var indexBy = require('lodash.indexby');

var appsByManifest = indexBy(apps, 'manifest');

function init () {

  var header = document.querySelector('header');

  header.querySelector('button.back').addEventListener('click', function () {
    setView('appsList');
  });

  header.querySelector('button.help').addEventListener('click', function () {
    setView('help');
  });

  var apps = document.querySelector('.apps');
  apps.addEventListener('click', function (ev) {

    var target = ev.target;
    if (!target.classList.contains('app')) {
      target = target.parentNode;
    }

    var manifest = target.getAttribute('data-manifest');
    var app = appsByManifest[manifest];
    if (!app) { return; }

    fillTemplate(document.querySelector('.appDetailView'), {
      '*': function (node) {
        node.setAttribute('data-manifest', manifest);
      },
      '.icon': function (node) {
        node.setAttribute('src', app.icon);
      },
      '.name': app.name,
      '.description': app.description
    });

    setView('appDetail');
  });

  var appDetailView = document.querySelector('.appDetailView');

  appDetailView.querySelector('button.launch').addEventListener('click', function (ev) {
    var manifest = appDetailView.getAttribute('data-manifest');
    var app = appsByManifest[manifest];
    window.open(app.baseUrl + app.launch_path);
  });

  appDetailView.querySelector('button.install').addEventListener('click', function (ev) {
    var manifest = appDetailView.getAttribute('data-manifest');
    var request = navigator.mozApps.install(manifest);
    request.onsuccess = function () {
      alert('installed ' + request.result.origin);
      console.log(request.result);
    };
    request.onerror = function () {
      alert('failed ' + request.error.name);
    };
  });

}

function setView (name) {
  document.querySelector('.mainApp').className = 'mainApp ' + name;
}

function fillTemplate (node, data) {
  Object.keys(data).forEach(function (selector) {
    var target = selector === '*' ? node : node.querySelector(selector);
    var content = data[selector];
    if (Object.prototype.toString.call(content) === '[object Function]') {
      content(target);
    } else {
      target.innerHTML = content;
    }
  });
};

domready(init);
