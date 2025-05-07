# Admitad Tag for Google Tag Manager Server-Side

The **Admitad tag** supports two types of events: **PageView** and **Conversion**.

- **PageView event** – Stores the Click ID URL parameter (`admitad_uid`) inside the `_aid` cookie and the traffic source (e.g., `utm_source`) inside the `_admitad_source` cookie.
- **Conversion event** – Sends an HTTP request with the specified conversion data to Admitad.

## How to Use the Admitad Tag

1. Create an Admitad tag and add both **PageView** and **Conversion** triggers.
2. For **Conversion** events, provide the required fields; other values will be automatically parsed from the Event Data, if not set.

### Required Fields

- **Campaign Code** – Provided by Admitad.
- **Postback Key** – Provided by Admitad.
- **Action Code** – Provided by Admitad.
- **Tariff Code** – Provided by Admitad.
- **Payment Type** – Must be set to `sale`.

### Optional Fields

- **Order ID**
- **Price**
- **Client ID**
- **Quantity**
- **Position ID**
- **Position Count**
- **Product ID**
- **Currency Code**
- **City**
- **Promocode**

### Cookie Settings

- **Cookie Expiration** – The number of days the Admitad cookies (Click ID and source channel) will remain active. Set this value according to the agreement. Default: 395 days.
- **Cookie Domain** – Override the default domain where the cookies are stored. By default, the domain is automatically determined.

### Logging Settings

- **Log Type** – Defines the logging level. Options: `no`, `debug`, or `always`.
- **BigQuery Logs** – Optionally log events to BigQuery for later analysis.

## Useful Resources

- [Admitad tag for server GTM](https://stape.io/solutions/admitad-tag)
- [How to Set Up Admitad Tracking With GTM](https://stape.io/blog/admitad-gtm-tag-setup)

## Open Source

The **Admitad tag for GTM Server Side** is developed and maintained by [Stape Team](https://stape.io/) under the Apache 2.0 license.
