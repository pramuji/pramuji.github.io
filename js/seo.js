(function () {
  var host = location.hostname.replace(/^www\./, "");
  if (host !== "katalogatomy.online") return;
  var path = location.pathname.replace(/\/index\.html$/, "/");
  if (path === "/katalog") path = "/katalog.html";
  if (path === "") path = "/";
  var next = "https://katalogatomy.online" + path + location.search + location.hash;
  var now = location.protocol + "//" + location.host + location.pathname + location.search + location.hash;
  if (next !== now) location.replace(next);
})();
