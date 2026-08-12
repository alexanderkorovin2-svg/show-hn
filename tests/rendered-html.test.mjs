import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Show HN data story", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Show HN volume surged; 20-point posts barely moved — OrangeCrumbs<\/title>/i);
  assert.match(html, /Show HN volume increased 6x since ChatGPT/);
  assert.match(html, /submissions jumped from 0\.9k to 5\.8k/);
  assert.match(html, /20\+ points rose from 128 to 211/);
  assert.match(html, /138,445 Show HN posts across 2\.49 million/);
  assert.match(html, /January 2018–July 2026/);
  assert.match(html, /Show HN became a much larger slice of Hacker News/);
  assert.match(html, /Show HN submissions increased by as much as 6\.3x at peak volume/);
  assert.ok(
    html.indexOf("Show HN submissions increased by as much as 6.3x at peak volume") <
      html.indexOf("Show HN became a much larger slice of Hacker News"),
    "volume section should render before share section",
  );
  assert.match(html, /Monthly submissions and Show HN volume/);
  assert.doesNotMatch(html, /Monthly URL stories and Show HN volume/);
  assert.match(html, /the share of successful Show HN submissions \(20\+ points\) remained relatively flat/i);
  assert.match(html, /Successful Show HNs as a share of all submissions/i);
  assert.match(html, /20\+ POINT SHOW HNS \/ ALL SUBMISSIONS/i);
  assert.match(html, /12-month share<!-- -->: <!-- -->0\.61%/i);
  assert.doesNotMatch(html, /20\+ posts \/ month, latest 12m/i);
  assert.doesNotMatch(html, /Volume surged; hits did not/i);
  assert.doesNotMatch(html, /Submission growth outran 20-point posts|What the data supports/);
  assert.match(html, /What counts—and what does not/);
  assert.match(html, /href="https:\/\/huggingface\.co\/datasets\/open-index\/hacker-news"/);
  assert.match(html, /href="https:\/\/hn\.algolia\.com\/api"/);
  assert.match(html, /class="footer-brand" href="https:\/\/www\.orangecrumbs\.com\/"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("keeps the finished page free of starter preview assets", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /ShowHnStory/);
  assert.match(layout, /Show HN volume surged/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(
    access(new URL("../app/_sites-preview/SkeletonPreview.tsx", templateRoot)),
  );
});
