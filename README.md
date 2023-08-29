# proxy
A proxy resources for Raiku App

That said, this proxy can handle just about any cors request you can think of including:
- Resource: `<img src="...">`, `<video src="...">`...
- API for httprequest: `XMLHtttpRequest`, `fetch`...

## Usage
```url
https://<domain release>/?url=<url resource>&headers=<json send to url resource>
```

This proxy allows direct URL anchoring to html tags without the need for JS. Try:
```html
<img src="https;//localhost:3000?url=https://google.com/favicon.ico">
```

### `?url=`
- `@type`: `string`
- `@required`
Url send request

### `?headers=`
- `@type`: `json Record<string, string>`
- `@optional`
This option is of type json. It will merge with the headers from the request sent to the proxy and send to `url`

### `?-headers=`
- `@type`: `json string[]`
- `@optional`
This option is a json array. It will remove any headers in the array from the proxy list of headers before sending to `url`

### `?rsheaders=`
- `@type`: `json Record<string, string>`
- `@optional`
This option is of type json.
This option is the same as `-headers` but it applies to headers that return `url` it will fix it before returning it to the response.

### `?-rsheaders=`
- `@type`: `json string[]`
- `@optional`
This option is a json array. Same as `-headers` but for return headers.

### `?timeout=`
- `@type`: `number`
- `@optional`
Request time will be canceled if the request to `url` takes too long.
