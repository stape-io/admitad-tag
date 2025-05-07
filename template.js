const BigQuery = require('BigQuery');
const encodeUriComponent = require('encodeUriComponent');
const getAllEventData = require('getAllEventData');
const getContainerVersion = require('getContainerVersion');
const getCookieValues = require('getCookieValues');
const getRequestHeader = require('getRequestHeader');
const getTimestampMillis = require('getTimestampMillis');
const getType = require('getType');
const JSON = require('JSON');
const logToConsole = require('logToConsole');
const makeInteger = require('makeInteger');
const makeString = require('makeString');
const parseUrl = require('parseUrl');
const sendHttpRequest = require('sendHttpRequest');
const setCookie = require('setCookie');

/**********************************************************************************************/

const traceId = getRequestHeader('trace-id');

const eventData = getAllEventData();

if (!isConsentGivenOrNotRequired()) {
  return data.gtmOnSuccess();
}

const url = eventData.page_location || getRequestHeader('referer');
if (url && url.lastIndexOf('https://gtm-msr.appspot.com/', 0) === 0) {
  return data.gtmOnSuccess();
}

const actionHandlers = {
  page_view: trackPageView,
  conversion: trackConversion
};

const handler = actionHandlers[data.type];
if (handler) {
  handler();
} else {
  return data.gtmOnFailure();
}

return data.gtmOnSuccess();

/**********************************************************************************************/
// Vendor related functions

function trackPageView() {
  if (!url) return;

  const cookieOptions = {
    domain: data.cookieDomain || 'auto',
    path: '/',
    secure: true,
    httpOnly: false,
    'max-age': 60 * 60 * 24 * (makeInteger(data.cookieExpiration) || 395)
  };

  const urlSearchParams = parseUrl(url).searchParams;

  const clickIdValue = urlSearchParams[data.clickIdParameterName || 'admitad_uid'];
  if (clickIdValue) {
    setCookie('_aid', clickIdValue, cookieOptions, false);
  }

  const sourceChannelParametersName = (data.sourceChannelParameterName || 'utm_source')
    .concat(',', data.additionalSourceChannelParametersName || '')
    .split(',')
    .filter((p) => !!p)
    .map((p) => p.trim());
  sourceChannelParametersName.some((p) => {
    const sourceChannelParameterValue = urlSearchParams[p];
    if (sourceChannelParameterValue) {
      setCookie('_admitad_source', sourceChannelParameterValue, cookieOptions, false);
      return true;
    }
    return false;
  });
}

function trackConversion() {
  // [TO DO] Remove it from code.
  /*
  const admitadSourceChannelParameterValue = (data.admitadSourceChannelParameterValue || 'admitad').toLowerCase();
  const lastSourceChannel = (getCookieValues('_admitad_source')[0] || '').toLowerCase();

  if (lastSourceChannel !== admitadSourceChannelParameterValue) return;
  */

  const requestUrls = getRequestUrls();

  (requestUrls || []).forEach((requestUrl) => {
    if (!requestUrl) return;
    sendRequest(requestUrl);
  });
}

function sendRequest(requestUrl) {
  log({
    Name: 'Admitad',
    Type: 'Request',
    TraceId: traceId,
    EventName: 'Conversion',
    RequestMethod: 'GET',
    RequestUrl: requestUrl
  });

  sendHttpRequest(
    requestUrl,
    (statusCode, headers, body) => {
      log({
        Name: 'Admitad',
        Type: 'Response',
        TraceId: traceId,
        EventName: 'Conversion',
        ResponseStatusCode: statusCode,
        ResponseHeaders: headers,
        ResponseBody: body
      });
      // https://support.mitgo.com/knowledge-base/article/integration-via-postback-request_2#how-to-set-postback-request
      // "The Admitad server doesn't have any special response to postback requests.
      // You will always see the status "HTTP 200 OK".
    },
    { method: 'GET' }
  );
}

function getRequestUrls() {
  let requestUrl =
    'https://ad.admitad.com/tt?postback=1&response_type=img&adm_method=plugin&adm_method_name=server_gtm_stape';

  requestUrl = requestUrl + '&campaign_code=' + enc(data.campaignCode);
  requestUrl = requestUrl + '&postback_key=' + enc(data.postbackKey);
  requestUrl = requestUrl + '&action_code=' + enc(data.actionCode);
  requestUrl = requestUrl + '&tariff_code=' + enc(data.tariffCode);
  requestUrl = requestUrl + '&payment_type=' + enc(data.paymentType);

  requestUrl = requestUrl + '&channel=' + enc(getChannelParameter());

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

  const coupon = data.promocode || eventData.promocode || eventData.coupon;
  if (coupon) {
    requestUrl = requestUrl + '&promocode=' + enc(coupon);
  }

  const clickId = data.clickId || getCookieValues('_aid')[0] || '';
  if (clickId) {
    requestUrl = requestUrl + '&uid=' + enc(clickId);
  }

  const userAddress = getUserAddressFromCommonEventData();
  const countryCode = data.countryCode || eventData.countryCode || eventData.country || userAddress.country;
  if (countryCode) {
    requestUrl = requestUrl + '&country_code=' + enc(countryCode);
  }
  const city = data.city || eventData.city || userAddress.city;
  if (city) {
    requestUrl = requestUrl + '&city=' + enc(city);
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

  const items = data.items || eventData.items || [];

  if (!items || !items.length) {
    return [requestUrl];
  }

  const requestUrls = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    let itemUrl = requestUrl + '&quantity=' + enc(item.quantity || item.item_quantity);

    itemUrl = itemUrl + '&position_id=' + (item.positionId ? enc(item.positionId) : enc(i + 1));

    itemUrl = itemUrl + '&position_count=' + (item.positionCount ? enc(item.positionCount) : enc(items.length));

    const productId = item.productId || item.product_id || item.item_id;
    if (productId) {
      itemUrl = itemUrl + '&product_id=' + enc(productId);
    }

    if (sameUrlExists(requestUrls, itemUrl)) {
      continue;
    }

    requestUrls.push(itemUrl);
  }

  return requestUrls;
}

function getChannelParameter() {
  const admitadSourceCookie = (getCookieValues('_admitad_source')[0] || '').toLowerCase();
  if (!admitadSourceCookie) return 'na';
  const admitadSourceChannelParameterValue = (data.admitadSourceChannelParameterValue || 'admitad').toLowerCase();
  return admitadSourceCookie === admitadSourceChannelParameterValue ? 'admitad' : 'other';
}

function getUserAddressFromCommonEventData() {
  const user_data = eventData.user_data || {};
  let user_address = user_data.address;
  if (['array', 'object'].indexOf(getType(user_address)) === -1) {
    user_address = {};
  }
  return user_address[0] || user_address || {};
}

/**********************************************************************************************/
// Helpers

function sameUrlExists(urls, url) {
  for (let i = 0; i < urls.length; i++) {
    if (urls[i] === url) return true;
  }
  return false;
}

function enc(data) {
  return encodeUriComponent(makeString(data || ''));
}

function isConsentGivenOrNotRequired() {
  if (data.adStorageConsent !== 'required') return true;
  if (eventData.consent_state) return !!eventData.consent_state.ad_storage;
  const xGaGcs = eventData['x-ga-gcs'] || ''; // x-ga-gcs is a string like "G110"
  return xGaGcs[2] === '1';
}

function log(rawDataToLog) {
  const logDestinationsHandlers = {};
  if (determinateIsLoggingEnabled()) logDestinationsHandlers.console = logConsole;
  if (determinateIsLoggingEnabledForBigQuery()) logDestinationsHandlers.bigQuery = logToBigQuery;

  // Key mappings for each log destination
  const keyMappings = {
    // No transformation for Console is needed.
    bigQuery: {
      Name: 'tag_name',
      Type: 'type',
      TraceId: 'trace_id',
      EventName: 'event_name',
      RequestMethod: 'request_method',
      RequestUrl: 'request_url',
      RequestBody: 'request_body',
      ResponseStatusCode: 'response_status_code',
      ResponseHeaders: 'response_headers',
      ResponseBody: 'response_body'
    }
  };

  for (const logDestination in logDestinationsHandlers) {
    const handler = logDestinationsHandlers[logDestination];
    if (!handler) continue;

    const mapping = keyMappings[logDestination];
    const dataToLog = mapping ? {} : rawDataToLog;
    // Map keys based on the log destination
    if (mapping) {
      for (const key in rawDataToLog) {
        const mappedKey = mapping[key] || key; // Fallback to original key if no mapping exists
        dataToLog[mappedKey] = rawDataToLog[key];
      }
    }

    handler(dataToLog);
  }
}

function logConsole(dataToLog) {
  logToConsole(JSON.stringify(dataToLog));
}

function logToBigQuery(dataToLog) {
  const connectionInfo = {
    projectId: data.logBigQueryProjectId,
    datasetId: data.logBigQueryDatasetId,
    tableId: data.logBigQueryTableId
  };

  // timestamp is required.
  dataToLog.timestamp = getTimestampMillis();

  // Columns with type JSON need to be stringified.
  ['request_body', 'response_headers', 'response_body'].forEach((p) => {
    // GTM Sandboxed JSON.parse returns undefined for malformed JSON but throws post-execution, causing execution failure.
    // If fixed, could use: dataToLog[p] = JSON.stringify(JSON.parse(dataToLog[p]) || dataToLog[p]);
    dataToLog[p] = JSON.stringify(dataToLog[p]);
  });

  // assertApi doesn't work for 'BigQuery.insert()'. It's needed to convert BigQuery into a function when testing.
  // Ref: https://gtm-gear.com/posts/gtm-templates-testing/
  const bigquery = getType(BigQuery) === 'function' ? BigQuery() /* Only during Unit Tests */ : BigQuery;
  bigquery.insert(connectionInfo, [dataToLog], { ignoreUnknownValues: true });
}

function determinateIsLoggingEnabled() {
  const containerVersion = getContainerVersion();
  const isDebug = !!(containerVersion && (containerVersion.debugMode || containerVersion.previewMode));

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

function determinateIsLoggingEnabledForBigQuery() {
  if (data.bigQueryLogType === 'no') return false;
  return data.bigQueryLogType === 'always';
}
