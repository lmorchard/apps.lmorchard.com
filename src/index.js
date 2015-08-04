var domready = require('domready');

domready(function () {
  console.log("DOM READY");

  var apps = document.querySelector('.apps');
  apps.addEventListener('click', function (ev) {
    var target = ev.target;
    if (!target.classList.contains('app')) {
      target = target.parentNode;
    }
    var manifest = target.getAttribute('data-manifest');
    var request = navigator.mozApps.install(manifest);
    console.log(manifest, request);
    request.onsuccess = function () {
      alert('installed ' + request.result.origin);
      console.log(request.result);
    };
    request.onerror = function () {
      alert('failed ' + request.error.name);
    };
    window.apprequest = request;
  });

})
