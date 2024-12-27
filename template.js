const sendHttpRequest = require('sendHttpRequest');
const setCookie = require('setCookie');
const parseUrl = require('parseUrl');
const JSON = require('JSON');
const getRequestHeader = require('getRequestHeader');
const encodeUriComponent = require('encodeUriComponent');
const getCookieValues = require('getCookieValues');
const getAllEventData = require('getAllEventData');
const logToConsole = require('logToConsole');
const getContainerVersion = require('getContainerVersion');
const makeString = require('makeString');

const containerVersion = getContainerVersion();
const isDebug = containerVersion.debugMode;
const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = getRequestHeader('trace-id');
const eventData = getAllEventData();

if (!isConsentGivenOrNotRequired()) {
  return data.gtmOnSuccess();
}

if (data.type === 'page_view') {
  const url = eventData.page_location || getRequestHeader('referer');

  if (url) {
    const value = parseUrl(url).searchParams[data.clickIdParameterName];

    if (value) {
      const options = {
        domain: 'auto',
        path: '/',
        secure: true,
        httpOnly: false,
        'max-age': 86400 * 395
      };

      setCookie('_aid', value, options, false);
    }
  }
} else {
  const requestUrl = getRequestUrls();

  for (let i = 0; i < requestUrl.length; i++) {
    if (requestUrl[i]) {
      sendRequest(requestUrl[i]);
    }
  }
}

data.gtmOnSuccess();

function sendRequest(requestUrl) {
  if (isLoggingEnabled) {
    logToConsole(
      JSON.stringify({
        Name: 'Admitad',
        Type: 'Request',
        TraceId: traceId,
        EventName: 'Conversion',
        RequestMethod: 'GET',
        RequestUrl: requestUrl
      })
    );
  }

  sendHttpRequest(
    requestUrl,
    (statusCode, headers, body) => {
      if (isLoggingEnabled) {
        logToConsole(
          JSON.stringify({
            Name: 'Admitad',
            Type: 'Response',
            TraceId: traceId,
            EventName: 'Conversion',
            ResponseStatusCode: statusCode,
            ResponseHeaders: headers,
            ResponseBody: body
          })
        );
      }
    },
    { method: 'GET' }
  );
}

function getRequestUrls() {
  let requestUrl = 'https://ad.admitad.com/r?postback=1';

  requestUrl = requestUrl + '&campaign_code=' + enc(data.campaignCode);
  requestUrl = requestUrl + '&postback_key=' + enc(data.postbackKey);
  requestUrl = requestUrl + '&action_code=' + enc(data.actionCode);
  requestUrl = requestUrl + '&tariff_code=' + enc(data.tariffCode);
  requestUrl = requestUrl + '&payment_type=' + enc(data.paymentType);

  const orderId = data.orderId || eventData.orderId || eventData.order_id || eventData.transaction_id;
  if (orderId) {
    requestUrl = requestUrl + '&order_id=' + enc(orderId);
  }

  const price = data.price || eventData.amount || eventData.value || eventData.price;
  if (price) {
    requestUrl = requestUrl + '&price=' + enc(price);
  }

  const clientId = data.clientId || eventData.external_id;
  if (clientId) {
    requestUrl = requestUrl + '&client_id=' + enc(clientId);
  }

  const currency = data.currencyCode || eventData.currencyCode || eventData.currency;
  if (currency) {
    requestUrl = requestUrl + '&currency_code=' + enc(currency);
  }

  const city = data.city || eventData.city || eventData.city;
  if (city) {
    requestUrl = requestUrl + '&city=' + enc(city);
  }

  const coupon = data.promocode || eventData.promocode || eventData.coupon;
  if (coupon) {
    requestUrl = requestUrl + '&promocode=' + enc(coupon);
  }

  const cookie = getCookieValues('_aid')[0] || '';
  if (cookie) {
    requestUrl = requestUrl + '&uid=' + enc(cookie);
  }

  if (data.quantity || data.positionId || data.positionCount || data.productId) {
    const quantity = data.quantity || eventData.quantity;
    if (quantity) {
      requestUrl = requestUrl + '&quantity=' + enc(quantity);
    }

    if (data.positionId) {
      requestUrl = requestUrl + '&position_id=' + enc(data.positionId);
    }

    if (data.positionCount) {
      requestUrl = requestUrl + '&position_count=' + enc(data.positionCount);
    }

    const productId = data.productId || eventData.productId;
    if (productId) {
      requestUrl = requestUrl + '&product_id=' + enc(productId);
    }

    return [requestUrl];
  }


  const items = data.items || eventData.items || {};

  if (!items && !items.length) {
    return [requestUrl];
  }

  let requestUrls = [];

  for (let i = 0; i < items.length; i++) {
    let item = items[i];
    let itemUrl = requestUrl + '&quantity=' + enc((item.quantity || item.item_quantity));

    if (item.positionId) {
      itemUrl = itemUrl + '&position_id=' + enc((i+1));
    }

    if (item.positionCount) {
      itemUrl = itemUrl + '&position_count=' + enc((items.length+1));
    }

    if (item.productId) {
      itemUrl = itemUrl + '&product_id=' + enc((item.productId || item.product_id || item.item_id));
    }

    if (sameUrlExists(requestUrls, itemUrl)) {
      continue;
    }

    requestUrls.push(itemUrl);
  }

  return requestUrls;
}

function sameUrlExists(urls, url) {
  for (let i = 0; i < urls.length; i++) {
    if (urls[i] === url) {
      return true;
    }
  }

  return false;
}

function enc(data) {
  data = data || '';
  return encodeUriComponent(makeString(data));
}

function determinateIsLoggingEnabled() {
  if (!data.logType) {
    return isDebug;
  }

  if (data.logType === 'no') {
    return false;
  }

  if (data.logType === 'debug') {
    return isDebug;
  }

  return data.logType === 'always';
}

function isConsentGivenOrNotRequired() {
  if (data.adStorageConsent !== 'required') return true;
  if (eventData.consent_state) return !!eventData.consent_state.ad_storage;
  const xGaGcs = eventData['x-ga-gcs'] || ''; // x-ga-gcs is a string like "G110"
  return xGaGcs[2] === '1';
}
