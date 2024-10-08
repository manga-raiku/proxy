import { inMemoryCache } from "https://deno.land/x/httpcache@0.1.2/in_memory.ts";

function parseJSON(json: string, assert: (val: any) => boolean): any | null {
  try {
    const val = JSON.parse(json);
    if (assert(val) !== true) return null

    return val
  } catch {
    return null;
  }
}

const RS_FORBIDDEN_HEADERS = [
  // 'Accept-Charset',
  // 'Accept-Encoding',
  // 'Connection',
  // 'Content-Length',
  "Set-Cookie",
  // 'Date',
  // 'DNT',
  // 'Expect',
  "Host",
  // 'Keep-Alive',
  "Origin",
  // 'Referer',
  // 'TE',
  // 'Trailer',
  // 'Transfer-Encoding',
  // 'Upgrade',
  // 'Via'
];
const RS_DEFAULT_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};
const PROXYS = {
  "win": "https://api.allorigins.win/raw?url="
};
const DOMAIN_BANNED = ["nipogota.com.br", "chat.typefunnel.space", "localhost:3000"]

const CACHE_DIR = "./cache/";
const CACHE_TIME = 3600; // 1 hour
const CACHE_SIZE_LIMIT = 300 * 1024 * 1024; // 300MB

const isArray = Array.isArray
const isObject = (val: any) => typeof val === 'object' && val !== null

const server = Deno.listen({ port: 8000 });
console.log(`HTTP webserver running. Access it at: http://localhost:8000/`);

for await (const conn of server) {
  serveHttp(conn);
}

async function controlRequest({ request, respondWith }: Deno.RequestEvent) {
  const $url = new URL(request.url);

  const url = $url.searchParams.get("url");

  if (!url) {
    respondWith(
      new Response("Missing url parameter", { status: 400 }),
    );
    return;
  }

  const rqHeaders = parseJSON(
    $url.searchParams.get("headers") ?? "{}",
    isObject
  ) ?? {} as Record<string, string>;
  const rqExcludeHeaders = parseJSON(
    $url.searchParams.get("-headers") ?? "[]",
    isArray
  ) ?? [] as string[];
  const rsHeaders = parseJSON(
    $url.searchParams.get("rsheaders") ?? "{}",
    isObject
  ) ?? {} as Record<string, string>;
  const rsExcludeHeaders = parseJSON(
    $url.searchParams.get("-rsheaders") ?? "[]",
    isArray
  ) ?? [] as string[];
  // const useCache = !!$url.searchParams.get("cache");
  const timeout = parseInt($url.searchParams.get("timeout") ?? "0");
  const _proxy = PROXYS[$url.searchParams.get("proxy")] ?? null;
  const proxy: string = typeof _proxy === "string" ? _proxy : "";
  
  // Always exclude the Host header
  rqExcludeHeaders.push("Host");

  // Always exclude the Origin header in response
  rsExcludeHeaders.push("Origin");
  
  // Get the hheadersfrom the current request
  const headers = new Headers();
  rqExcludeHeaders.forEach((item) => headers.delete(item));
  const method = request.method;
  const body = request.body;

  for (const [key, value] of Object.entries(rqHeaders)) {
    headers.set(key, value);
  }

  const host = request.headers.get("origin") || request.headers.get("referer")
  console.log("Request to: %s from %s", url, host)
  if (host && DOMAIN_BANNED.some(domain => host.endsWith(domain))) {
    console.warn(`Domain name ${domain} banned`)
    return respondWith(
      new Response(`Your domain name ${domain} has been banned due to suspected service abuse. Please contact shin@shin.is-a.dev and explain your reasons for using this proxy.`, { status: 403 })
    )
  }

  try {
    const response = await fetch(proxy + url, {
      headers,
      method,
      body,
      signal: timeout ? AbortSignal.timeout(timeout) : undefined,
    });
    
    const responseHeaders = new Headers(response.headers);
    rsExcludeHeaders.forEach((item) => {
      const value = responseHeaders.get(item);
      responseHeaders.delete(item);
      if (value) {
        responseHeaders.set(`ck-${item}`, value);
      }
    });
    RS_FORBIDDEN_HEADERS.forEach((item) => {
      const value = responseHeaders.get(item);
      responseHeaders.delete(item);
      if (value) {
        responseHeaders.set(`c-${item}`, value);
      }
      // responseHeaders.set(item, RS_FORBIDDEN_HEADERS[item]);
    });
    for (const [key, value] of Object.entries(RS_DEFAULT_HEADERS)) {
      responseHeaders.set(key, value);
    }
    for (const [key, value] of Object.entries(rsHeaders)) {
      responseHeaders.set(key, value);
    }
    
    respondWith(
      new Response(response.body, {
        ...response,
        status: response.status,
        headers: responseHeaders,
      }),
    );
    console.log("Request success")
  } catch(err) {
    console.error(err)
    respondWith(
      new Response(err + '', {
        status: 500
      })
    )
  }
}

async function serveHttp(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);

  for await (const requestEvent of httpConn) {
    await controlRequest(requestEvent);
    // const url = new URL(requestEvent.request.url);
    // const targetUrl = url.searchParams.get("url");

    // if (targetUrl) {
    //   const response = await fetch(targetUrl, {
    //     method: requestEvent.request.method,
    //   });
    //   requestEvent.respondWith(
    //     new Response(response.body, {
    //       status: response.status,
    //       headers: response.headers,
    //     }),
    //   );
    // } else {
    //   requestEvent.respondWith(
    //     new Response("Missing url parameter", { status: 400 }),
    //   );
    // }
  }
}
