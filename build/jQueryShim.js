'use strict';

const jQueryDeferred = require('jquery-deferred'),
      jQueryParam = require('jquery-param'),
      jqueryFunction = function (a) {
  let b = a.events || {};

  if (a && a === a.window) return {
    0: a,
    load: handler => a.addEventListener('load', handler, !1),
    bind: (event, handler) => a.addEventListener(event, handler, !1),
    unbind: (event, handler) => a.removeEventListener(event, handler, !1)
  };

  return {
    0: a,

    unbind(c, d) {
      let f = b[c] || [];

      if (d) {
        let g = f.indexOf(d);
        if (g !== -1) f.splice(g, 1);
      } else f = [];

      b[c] = f;
      a.events = b;
    },
    bind(c, d) {
      let f = b[c] || [];
      b[c] = f.concat(d);
      a.events = b;
    },
    triggerHandler(c, d) {
      let f = b[c] || [];
      f.forEach(g => {
        if (d && d[0] && d[0].type === void 0) {
          d = [{
            type: c
          }].concat(d || []);
        } else {
          d = d || [];
        }

        g.apply(this, d);
      });
    }
  };
},
      xhr = function () {
  try {
    return new window.XMLHttpRequest();
  } catch (e) {}
},
      ajax = function (a) {
  const b = xhr();
  b.onreadystatechange = () => {
    if (b.readyState !== 4) {
      return;
    }

    if (b.status === 200 && !b._hasError) {
      try {
        a.success && a.success(JSON.parse(b.responseText));
      } catch (e) {
        a.error && a.error(b);
      }
    } else {
      a.error && a.error(b);
    }
  };

  b.withCredentials = a.xhrFields.withCredentials;
  b.open(a.type, a.url);
  b.setRequestHeader('content-type', a.contentType);
  if (a.extraHeaders) {
    a.extraHeaders.forEach(c => {
      b.setRequestHeader(c.key, c.value);
    });
  }
  b.send(a.data.data && `data=${a.data.data}`);

  return {
    abort: function (c) {
      return b.abort(c);
    }
  };
};

module.exports = jQueryDeferred.extend(jqueryFunction, jQueryDeferred, {
  defaultAjaxHeaders: null,
  ajax: ajax,
  inArray: (arr, item) => arr.indexOf(item) !== -1,
  trim: str => str && str.trim(),
  isEmptyObject: obj => !obj || Object.keys(obj).length === 0,
  makeArray: arr => [].slice.call(arr, 0),
  param: obj => jQueryParam(obj),
  support: {
    cors: function () {
      const a = xhr();
      return !!a && "withCredentials" in a;
    }()
  }
});