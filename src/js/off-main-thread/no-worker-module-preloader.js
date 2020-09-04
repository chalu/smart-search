(function () {
  // See https://web.dev/module-workers/
  const preloader = new Worker('./importscripts-shim.js#/omt.js');
}());
