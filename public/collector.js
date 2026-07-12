(function () {
  'use strict';

  var DEFAULT_ENDPOINT = 'https://app.unauth.co/api/checkout-signals/ingest';
  var VISITOR_COOKIE = '_unauth_vid';
  var SESSION_KEY = '_unauth_sid';
  var config = null;
  var payloadQueue = [];
  var pendingEvents = [];
  var flushTimer = null;
  var deviceFpPromise = null;

  function noop() {}

  function safe(fn, fallback) {
    try {
      return fn();
    } catch (_) {
      return fallback;
    }
  }

  function hasCrypto() {
    return Boolean(window.crypto && window.crypto.subtle && window.TextEncoder);
  }

  async function sha256(str) {
    if (!hasCrypto()) return null;
    try {
      var buffer = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(String(str))
      );
      return Array.from(new Uint8Array(buffer))
        .map(function (b) { return b.toString(16).padStart(2, '0'); })
        .join('');
    } catch (_) {
      return null;
    }
  }

  function uuid() {
    return safe(function () {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
      var bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      var hex = Array.from(bytes).map(function (b) {
        return b.toString(16).padStart(2, '0');
      });
      return (
        hex.slice(0, 4).join('') + '-' +
        hex.slice(4, 6).join('') + '-' +
        hex.slice(6, 8).join('') + '-' +
        hex.slice(8, 10).join('') + '-' +
        hex.slice(10, 16).join('')
      );
    }, String(Date.now()) + Math.random().toString(16).slice(2));
  }

  function getCookie(name) {
    return safe(function () {
      var match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : null;
    }, null);
  }

  function setCookie(name, value) {
    safe(function () {
      document.cookie = name + '=' + encodeURIComponent(value) + '; Path=/; Max-Age=31536000; SameSite=Lax; Secure';
    }, null);
  }

  function getVisitorId() {
    var existing = getCookie(VISITOR_COOKIE);
    if (existing) return existing;
    var vid = uuid();
    setCookie(VISITOR_COOKIE, vid);
    return vid;
  }

  function getSessionId() {
    return safe(function () {
      var existing = window.sessionStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      var sid = uuid();
      window.sessionStorage.setItem(SESSION_KEY, sid);
      return sid;
    }, uuid());
  }

  function canvasFingerprint() {
    return safe(function () {
      var canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 50;
      var ctx = canvas.getContext('2d');
      if (!ctx) return '';
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#34251f';
      ctx.fillText('UnauthFP', 10, 30);
      ctx.fillRect(2, 2, 18, 7);
      return canvas.toDataURL();
    }, '');
  }

  function computeDeviceFp() {
    if (!deviceFpPromise) {
      deviceFpPromise = Promise.resolve().then(function () {
        return safe(function () {
          var parts = [
            navigator.userAgent || '',
            navigator.language || '',
            (screen && screen.width ? screen.width : '') + 'x' + (screen && screen.height ? screen.height : ''),
            screen && screen.colorDepth ? screen.colorDepth : '',
            Intl && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone || '' : '',
            canvasFingerprint()
          ];
          return sha256(parts.join('|'));
        }, Promise.resolve(null));
      }).catch(function () { return null; });
    }
    return deviceFpPromise;
  }

  function pathIsCheckout() {
    return safe(function () {
      var path = window.location.pathname || '';
      return path.indexOf('/checkout') !== -1 || path.indexOf('/cart') !== -1 || path.indexOf('/order') !== -1;
    }, false);
  }

  function readTextCount(selector) {
    return safe(function () {
      var el = document.querySelector(selector);
      if (!el) return null;
      var match = String(el.textContent || '').match(/\d+/);
      return match ? Number(match[0]) : null;
    }, null);
  }

  async function detectCartCount() {
    var platform = config && config.platform;
    try {
      if (platform === 'shopify') {
        var metaCount = safe(function () {
          return window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.cart
            ? window.ShopifyAnalytics.meta.cart.item_count
            : null;
        }, null);
        if (Number.isFinite(Number(metaCount))) return Number(metaCount);
        var shopifyRes = await fetch('/cart.js', { credentials: 'same-origin' });
        if (shopifyRes.ok) {
          var shopifyCart = await shopifyRes.json();
          if (Number.isFinite(Number(shopifyCart.item_count))) return Number(shopifyCart.item_count);
        }
      }

      if (platform === 'woocommerce') {
        var domCount = readTextCount('.cart-count');
        if (domCount === null) domCount = readTextCount('.cart-contents-count');
        if (domCount !== null) return domCount;
        var wooRes = await fetch('/?wc-ajax=get_refreshed_fragments', { credentials: 'same-origin' });
        if (wooRes.ok) {
          var wooData = await wooRes.json();
          var fragments = wooData && wooData.fragments ? JSON.stringify(wooData.fragments) : '';
          var match = fragments.match(/cart-(?:count|contents-count)[^>]*>\s*(\d+)/i) || fragments.match(/(\d+)\s+items?/i);
          if (match) return Number(match[1]);
        }
      }

      if (platform === 'bigcommerce') {
        var bcRes = await fetch('/api/storefront/carts', { credentials: 'same-origin' });
        if (bcRes.ok) {
          var carts = await bcRes.json();
          var cart = Array.isArray(carts) ? carts[0] : carts;
          var items = cart && cart.lineItems ? cart.lineItems : null;
          if (items) {
            var count = 0;
            Object.keys(items).forEach(function (key) {
              var group = Array.isArray(items[key]) ? items[key] : [];
              group.forEach(function (item) { count += Number(item.quantity || 0); });
            });
            return count;
          }
        }
      }
    } catch (_) {}
    return null;
  }

  function detectAccountType() {
    return safe(function () {
      var platform = config && config.platform;
      if (platform === 'shopify') {
        var customerId = window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.page
          ? window.ShopifyAnalytics.meta.page.customerId
          : null;
        return customerId ? 'registered' : (pathIsCheckout() ? 'guest' : 'unknown');
      }
      if (platform === 'woocommerce') {
        if (document.body && document.body.classList.contains('logged-in')) return 'registered';
        return getCookie('woocommerce_items_in_cart') ? 'guest' : 'unknown';
      }
      if (platform === 'bigcommerce') {
        var bcCustomer = window.BCData && window.BCData.customer_id;
        return bcCustomer ? 'registered' : (pathIsCheckout() ? 'guest' : 'unknown');
      }
      return 'unknown';
    }, 'unknown');
  }

  async function buildPayload(eventType, extra) {
    var deviceFp = await computeDeviceFp();
    var checkoutReached = eventType === 'checkout' || pathIsCheckout();
    var cartCount = await detectCartCount();
    return {
      merchantId: config.merchantId,
      collectorToken: config.token || null,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      deviceFp: deviceFp,
      emailHash: extra && extra.emailHash ? extra.emailHash : null,
      accountType: detectAccountType(),
      platform: config.platform,
      page: safe(function () { return window.location.pathname || ''; }, ''),
      referrer: safe(function () { return document.referrer || ''; }, ''),
      checkoutReached: checkoutReached,
      cartCount: Number.isFinite(Number(cartCount)) ? Number(cartCount) : null,
      eventType: eventType,
      ts: Date.now()
    };
  }

  function enqueueDescriptor(eventType, extra) {
    pendingEvents.push({ eventType: eventType, extra: extra || {} });
  }

  function track(eventType, extra) {
    try {
      if (!config || !config.merchantId || !config.platform) {
        enqueueDescriptor(eventType, extra);
        return;
      }
      Promise.resolve()
        .then(function () { return buildPayload(eventType, extra || {}); })
        .then(function (payload) {
          payloadQueue.push(payload);
        })
        .catch(noop);
    } catch (_) {}
  }

  async function flush() {
    if (!config || payloadQueue.length === 0) return;
    var endpoint = config.endpoint || DEFAULT_ENDPOINT;
    var batch = payloadQueue.splice(0, payloadQueue.length);
    for (var i = 0; i < batch.length; i++) {
      try {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch[i]),
          keepalive: true
        });
      } catch (_) {}
    }
  }

  function flushBeacon() {
    safe(function () {
      if (!config || payloadQueue.length === 0 || !navigator.sendBeacon) return;
      var endpoint = config.endpoint || DEFAULT_ENDPOINT;
      var batch = payloadQueue.splice(0, payloadQueue.length);
      for (var i = 0; i < batch.length; i++) {
        navigator.sendBeacon(endpoint, new Blob([JSON.stringify(batch[i])], { type: 'application/json' }));
      }
    }, null);
  }

  function flushPendingDescriptors() {
    var pending = pendingEvents.splice(0, pendingEvents.length);
    pending.forEach(function (evt) {
      track(evt.eventType, evt.extra);
    });
  }

  function firePageviewAndCheckout() {
    track('pageview');
    if (pathIsCheckout()) track('checkout');
  }

  function installEmailListener() {
    safe(function () {
      document.addEventListener('blur', function (event) {
        try {
          var target = event.target;
          if (!target || !target.matches) return;
          if (!target.matches('input[type="email"], input[name*="email" i]')) return;
          var value = String(target.value || '').trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;
          sha256(value).then(function (emailHash) {
            if (emailHash) track('email_capture', { emailHash: emailHash });
          }).catch(noop);
        } catch (_) {}
      }, true);
    }, null);
  }

  function installHistoryListener() {
    safe(function () {
      var originalPushState = history.pushState;
      var originalReplaceState = history.replaceState;

      function onUrlChange() {
        setTimeout(function () {
          if (pathIsCheckout()) track('checkout');
        }, 0);
      }

      history.pushState = function () {
        var result = originalPushState.apply(this, arguments);
        onUrlChange();
        return result;
      };
      history.replaceState = function () {
        var result = originalReplaceState.apply(this, arguments);
        onUrlChange();
        return result;
      };
      window.addEventListener('popstate', onUrlChange);
    }, null);
  }

  function startFlushTimer() {
    if (flushTimer) return;
    flushTimer = window.setInterval(function () {
      flush().catch(noop);
    }, 5000);
  }

  window.UnauthCollector = {
    init: function (input) {
      try {
        input = input || {};
        config = {
          merchantId: String(input.merchantId || ''),
          platform: String(input.platform || ''),
          token: input.token ? String(input.token) : null,
          endpoint: input.endpoint || DEFAULT_ENDPOINT
        };
        startFlushTimer();
        flushPendingDescriptors();
        flush().catch(noop);
      } catch (_) {}
    }
  };

  installEmailListener();
  installHistoryListener();
  window.addEventListener('pagehide', flushBeacon);
  window.addEventListener('beforeunload', flushBeacon);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', firePageviewAndCheckout, { once: true });
  } else {
    setTimeout(firePageviewAndCheckout, 0);
  }
})();
