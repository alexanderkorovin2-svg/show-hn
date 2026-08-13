"use client";

import { useState, type PointerEvent } from "react";
import {
  MILESTONES,
  MONTHLY_DATA,
  SUCCESSFUL_SHOW_HN_DATA,
} from "./show-hn-data";

const ORANGE = "#ff6600";
const INK = "#20201d";
const MUTED = "#77776f";
const WIDTH = 1000;
const CHART_MARGIN = { top: 34, right: 24, bottom: 48, left: 62 };

const COVID_MILESTONE = {
  id: "covid-19",
  label: "COVID-19 pandemic",
  date: "2020-03",
} as const;

const VOLUME_MILESTONES = [COVID_MILESTONE, ...MILESTONES] as const;

type DataRow = {
  month: string;
  total: number;
  show: number;
  authors: number;
  share: number;
  rollingShare: number | null;
  successfulShare: number;
  rollingSuccessfulShare: number | null;
};

const numberFormatter = new Intl.NumberFormat("en-US");
const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatNumber(value: number) {
  return numberFormatter.format(Math.round(value));
}

function formatMonth(month: string) {
  return monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
}

function formatShare(value: number) {
  return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
}

const SUCCESS_BY_MONTH = new Map(SUCCESSFUL_SHOW_HN_DATA);

const DATA: readonly DataRow[] = MONTHLY_DATA.map(
  ([month, total, show, authors], index) => {
    const window = MONTHLY_DATA.slice(Math.max(0, index - 11), index + 1);
    const rollingShow = window.reduce((sum, row) => sum + row[2], 0);
    const rollingTotal = window.reduce((sum, row) => sum + row[1], 0);
    const successful = SUCCESS_BY_MONTH.get(month) ?? 0;
    const rollingSuccessful = window.reduce(
      (sum, row) => sum + (SUCCESS_BY_MONTH.get(row[0]) ?? 0),
      0,
    );
    return {
      month,
      total,
      show,
      authors,
      share: (show / total) * 100,
      rollingShare: index >= 11 ? (rollingShow / rollingTotal) * 100 : null,
      successfulShare: (successful / total) * 100,
      rollingSuccessfulShare:
        index >= 11 ? (rollingSuccessful / rollingTotal) * 100 : null,
    };
  },
);

function pathFor(
  rows: readonly DataRow[],
  x: (index: number) => number,
  y: (row: DataRow) => number | null,
) {
  let started = false;
  return rows
    .map((row, index) => {
      const value = y(row);
      if (value === null) return "";
      const command = started ? "L" : "M";
      started = true;
      return `${command}${x(index).toFixed(2)},${value.toFixed(2)}`;
    })
    .filter(Boolean)
    .join(" ");
}

function AreaPath({
  rows,
  x,
  y,
  baseline,
}: {
  rows: readonly DataRow[];
  x: (index: number) => number;
  y: (row: DataRow) => number;
  baseline: number;
}) {
  const top = rows
    .map((row, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(row)}`)
    .join(" ");
  return <path d={`${top} L${x(rows.length - 1)},${baseline} L${x(0)},${baseline} Z`} />;
}

function EventMarkers({
  x,
  top,
  bottom,
  compact = false,
  milestones = MILESTONES,
}: {
  x: (index: number) => number;
  top: number;
  bottom: number;
  compact?: boolean;
  milestones?: readonly { id: string; label: string; date: string }[];
}) {
  return milestones.map((milestone) => {
    const index = DATA.findIndex((row) => row.month === milestone.date);
    const markerX = x(index);
    return (
      <g className="event-marker" key={milestone.id}>
        <line x1={markerX} x2={markerX} y1={top} y2={bottom} />
        {!compact && (
          <text
            x={markerX - 7}
            y={top + 11}
            textAnchor="end"
          >
            {milestone.label}
          </text>
        )}
      </g>
    );
  });
}

function ShareChart({
  selectedIndex,
  onSelect,
}: {
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const height = 430;
  const plotWidth = WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const plotHeight = height - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const x = (index: number) =>
    CHART_MARGIN.left + (index / (DATA.length - 1)) * plotWidth;
  const y = (value: number) =>
    CHART_MARGIN.top + ((20 - value) / 20) * plotHeight;
  const active = DATA[selectedIndex];
  const activeX = x(selectedIndex);
  const monthlyPath = pathFor(DATA, x, (row) => y(row.share));
  const rollingPath = pathFor(DATA, x, (row) =>
    row.rollingShare === null ? null : y(row.rollingShare),
  );
  const yearTicks = DATA.filter(
    (row) => row.month.endsWith("-01") && Number(row.month.slice(0, 4)) % 2 === 0,
  );

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const localX = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
    const ratio = Math.max(
      0,
      Math.min(1, (localX - CHART_MARGIN.left) / plotWidth),
    );
    onSelect(Math.round(ratio * (DATA.length - 1)));
  }

  return (
    <div className="chart-body">
      <div className="chart-legend" aria-label="Chart legend">
        <span><i className="legend-line is-monthly" />Monthly share</span>
        <span><i className="legend-line is-rolling" />12-month rolling share</span>
      </div>

      <div className="chart-canvas">
        <div className="chart-readout" aria-live="polite">
          <span>{formatMonth(active.month)}</span>
          <div><small>Show HN</small><strong>{formatNumber(active.show)}</strong></div>
          <div><small>All URL stories</small><strong>{formatNumber(active.total)}</strong></div>
          <div><small>Share</small><strong className="orange-value">{formatShare(active.share)}</strong></div>
          <small>{formatNumber(active.authors)} distinct submitters</small>
        </div>

        <svg
          className="share-chart"
          viewBox={`0 0 ${WIDTH} ${height}`}
          role="img"
          aria-labelledby="share-chart-title share-chart-desc"
        >
          <title id="share-chart-title">Monthly Show HN share of URL submissions</title>
          <desc id="share-chart-desc">
            From January 2018 through July 2026, the share rises from roughly four
            percent to a peak near nineteen percent. ChatGPT and Claude Code launch
            dates are marked for context.
          </desc>
          {[0, 5, 10, 15, 20].map((tick) => (
            <g key={tick}>
              <line
                className="grid-line"
                x1={CHART_MARGIN.left}
                x2={WIDTH - CHART_MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text
                className="axis-label"
                x={CHART_MARGIN.left - 10}
                y={y(tick) + 4}
                textAnchor="end"
              >
                {tick}%
              </text>
            </g>
          ))}
          {yearTicks.map((row) => {
            const index = DATA.indexOf(row);
            return (
              <text
                className="axis-label"
                x={x(index)}
                y={height - 17}
                textAnchor="middle"
                key={row.month}
              >
                {row.month.slice(0, 4)}
              </text>
            );
          })}
          <EventMarkers
            x={x}
            top={CHART_MARGIN.top}
            bottom={height - CHART_MARGIN.bottom}
          />
          <path className="monthly-share-line" d={monthlyPath} />
          <path className="rolling-share-line" d={rollingPath} />
          <line
            className="hover-guide"
            x1={activeX}
            x2={activeX}
            y1={CHART_MARGIN.top}
            y2={height - CHART_MARGIN.bottom}
          />
          <circle
            className="active-point"
            cx={activeX}
            cy={y(active.share)}
            r="5"
          />
          <rect
            className="chart-hit-area"
            x={CHART_MARGIN.left}
            y={CHART_MARGIN.top}
            width={plotWidth}
            height={plotHeight}
            onPointerMove={handlePointerMove}
          />
        </svg>
      </div>
    </div>
  );
}

function VolumeChart({
  selectedIndex,
  onSelect,
}: {
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const height = 470;
  const plotWidth = WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const x = (index: number) =>
    CHART_MARGIN.left + (index / (DATA.length - 1)) * plotWidth;
  const totalPanel = { top: 50, bottom: 205, max: 35000 };
  const showPanel = { top: 270, bottom: 425, max: 6000 };
  const yTotal = (value: number) =>
    totalPanel.top + ((totalPanel.max - value) / totalPanel.max) *
      (totalPanel.bottom - totalPanel.top);
  const yShow = (value: number) =>
    showPanel.top + ((showPanel.max - value) / showPanel.max) *
      (showPanel.bottom - showPanel.top);
  const active = DATA[selectedIndex];
  const activeX = x(selectedIndex);
  const yearTicks = DATA.filter(
    (row) => row.month.endsWith("-01") && Number(row.month.slice(0, 4)) % 2 === 0,
  );

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const localX = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
    const ratio = Math.max(
      0,
      Math.min(1, (localX - CHART_MARGIN.left) / plotWidth),
    );
    onSelect(Math.round(ratio * (DATA.length - 1)));
  }

  return (
    <div className="volume-wrap">
      <div className="volume-key" aria-label="Chart legend">
        <span><i className="swatch is-total" />All submissions</span>
        <span><i className="swatch is-show" />Show HN stories</span>
        <span><i className="swatch is-authors" />Distinct Show HN submitters</span>
      </div>
      <svg
        className="volume-chart"
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-labelledby="volume-chart-title volume-chart-desc"
      >
        <title id="volume-chart-title">Monthly submissions and Show HN volume</title>
        <desc id="volume-chart-desc">
          Two synchronized panels show that overall submission volume stayed
          relatively stable while Show HN submissions and distinct submitters rose.
        </desc>
        <text className="panel-label" x={CHART_MARGIN.left} y="27">ALL SUBMISSIONS</text>
        <text className="panel-value" x={WIDTH - CHART_MARGIN.right} y="27" textAnchor="end">
          {formatNumber(active.total)} in {formatMonth(active.month)}
        </text>
        <text className="panel-label" x={CHART_MARGIN.left} y="248">SHOW HN</text>
        <text className="panel-value" x={WIDTH - CHART_MARGIN.right} y="248" textAnchor="end">
          {formatNumber(active.show)} posts · {formatNumber(active.authors)} submitters
        </text>

        {[0, 17500, 35000].map((tick) => (
          <g key={`total-${tick}`}>
            <line
              className="grid-line"
              x1={CHART_MARGIN.left}
              x2={WIDTH - CHART_MARGIN.right}
              y1={yTotal(tick)}
              y2={yTotal(tick)}
            />
            <text className="axis-label" x={CHART_MARGIN.left - 10} y={yTotal(tick) + 4} textAnchor="end">
              {tick === 0 ? "0" : `${tick / 1000}k`}
            </text>
          </g>
        ))}
        {[0, 3000, 6000].map((tick) => (
          <g key={`show-${tick}`}>
            <line
              className="grid-line"
              x1={CHART_MARGIN.left}
              x2={WIDTH - CHART_MARGIN.right}
              y1={yShow(tick)}
              y2={yShow(tick)}
            />
            <text className="axis-label" x={CHART_MARGIN.left - 10} y={yShow(tick) + 4} textAnchor="end">
              {tick === 0 ? "0" : `${tick / 1000}k`}
            </text>
          </g>
        ))}
        {yearTicks.map((row) => {
          const index = DATA.indexOf(row);
          return (
            <g key={`year-${row.month}`}>
              <line
                className="axis-tick"
                x1={x(index)}
                x2={x(index)}
                y1={showPanel.bottom}
                y2={showPanel.bottom + 6}
              />
              <text
                className="axis-label"
                x={x(index)}
                y={height - 16}
                textAnchor="middle"
              >
                {row.month.slice(0, 4)}
              </text>
            </g>
          );
        })}
        <g className="total-area">
          <AreaPath rows={DATA} x={x} y={(row) => yTotal(row.total)} baseline={totalPanel.bottom} />
        </g>
        <path className="total-line" d={pathFor(DATA, x, (row) => yTotal(row.total))} />
        <g className="show-area">
          <AreaPath rows={DATA} x={x} y={(row) => yShow(row.show)} baseline={showPanel.bottom} />
        </g>
        <path className="show-line" d={pathFor(DATA, x, (row) => yShow(row.show))} />
        <path className="authors-line" d={pathFor(DATA, x, (row) => yShow(row.authors))} />
        <EventMarkers
          x={x}
          top={totalPanel.top}
          bottom={showPanel.bottom}
          milestones={VOLUME_MILESTONES}
        />
        <line
          className="hover-guide"
          x1={activeX}
          x2={activeX}
          y1={totalPanel.top}
          y2={showPanel.bottom}
        />
        <circle className="active-point is-dark" cx={activeX} cy={yTotal(active.total)} r="4" />
        <circle className="active-point" cx={activeX} cy={yShow(active.show)} r="5" />
        <circle className="active-point is-author" cx={activeX} cy={yShow(active.authors)} r="4" />
        <rect
          className="chart-hit-area"
          x={CHART_MARGIN.left}
          y={totalPanel.top}
          width={plotWidth}
          height={showPanel.bottom - totalPanel.top}
          onPointerMove={handlePointerMove}
        />
      </svg>
    </div>
  );
}

function SuccessChart({
  selectedIndex,
  onSelect,
}: {
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const height = 350;
  const plotWidth = WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const x = (index: number) =>
    CHART_MARGIN.left + (index / (DATA.length - 1)) * plotWidth;
  const successfulPanel = { top: 50, bottom: 300, max: 1 };
  const ySuccessful = (value: number) =>
    successfulPanel.top +
    ((successfulPanel.max - value) / successfulPanel.max) *
      (successfulPanel.bottom - successfulPanel.top);
  const active = DATA[selectedIndex];
  const activeX = x(selectedIndex);
  const activeSuccessfulShare =
    active.rollingSuccessfulShare ?? active.successfulShare;
  const monthlySuccessfulPath = pathFor(DATA, x, (row) =>
    ySuccessful(row.successfulShare),
  );
  const rollingSuccessfulPath = pathFor(DATA, x, (row) =>
    row.rollingSuccessfulShare === null
      ? null
      : ySuccessful(row.rollingSuccessfulShare),
  );
  const yearTicks = DATA.filter(
    (row) => row.month.endsWith("-01") && Number(row.month.slice(0, 4)) % 2 === 0,
  );

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const localX = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
    const ratio = Math.max(
      0,
      Math.min(1, (localX - CHART_MARGIN.left) / plotWidth),
    );
    onSelect(Math.round(ratio * (DATA.length - 1)));
  }

  return (
    <div className="chart-body success-chart-body">
      <div className="chart-legend" aria-label="Chart legend">
        <span><i className="legend-line is-monthly" />Monthly share</span>
        <span><i className="legend-line is-successful" />12-month rolling share</span>
      </div>

      <div className="chart-canvas">
        <svg
          className="success-chart"
          viewBox={`0 0 ${WIDTH} ${height}`}
          role="img"
          aria-labelledby="success-chart-title success-chart-desc"
        >
          <title id="success-chart-title">Successful Show HNs as a share of all submissions</title>
          <desc id="success-chart-desc">
            Monthly and rolling 12-month shares show the portion of all submissions
            that were Show HN posts reaching at least 20 points.
          </desc>
          <text className="panel-label" x={CHART_MARGIN.left} y="27">20+ POINT SHOW HNS / ALL SUBMISSIONS</text>
          <text className="panel-value is-successful" x={WIDTH - CHART_MARGIN.right} y="27" textAnchor="end">
            {active.rollingSuccessfulShare === null ? "Monthly share" : "12-month share"}: {formatShare(activeSuccessfulShare)} in {formatMonth(active.month)}
          </text>

          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={`successful-share-${tick}`}>
              <line
                className="grid-line"
                x1={CHART_MARGIN.left}
                x2={WIDTH - CHART_MARGIN.right}
                y1={ySuccessful(tick)}
                y2={ySuccessful(tick)}
              />
              <text
                className="axis-label"
                x={CHART_MARGIN.left - 10}
                y={ySuccessful(tick) + 4}
                textAnchor="end"
              >
                {formatShare(tick)}
              </text>
            </g>
          ))}
          {yearTicks.map((row) => {
            const index = DATA.indexOf(row);
            return (
              <text
                className="axis-label"
                x={x(index)}
                y={height - 17}
                textAnchor="middle"
                key={row.month}
              >
                {row.month.slice(0, 4)}
              </text>
            );
          })}
          <EventMarkers
            x={x}
            top={successfulPanel.top}
            bottom={successfulPanel.bottom}
            compact
          />
          <path className="monthly-share-line" d={monthlySuccessfulPath} />
          <path className="rolling-success-line" d={rollingSuccessfulPath} />
          <line
            className="hover-guide"
            x1={activeX}
            x2={activeX}
            y1={successfulPanel.top}
            y2={successfulPanel.bottom}
          />
          <circle
            className="active-point is-successful"
            cx={activeX}
            cy={ySuccessful(activeSuccessfulShare)}
            r="5"
          />
          <rect
            className="chart-hit-area"
            x={CHART_MARGIN.left}
            y={successfulPanel.top}
            width={plotWidth}
            height={successfulPanel.bottom - successfulPanel.top}
            onPointerMove={handlePointerMove}
          />
        </svg>
      </div>
    </div>
  );
}

export function ShowHnStory() {
  const [selectedIndex, setSelectedIndex] = useState(DATA.length - 1);

  return (
    <div className="site-frame">
      <header className="topbar">
        <a className="brand" href="/" aria-label="OrangeCrumbs home">
          <span className="logo" aria-hidden="true">O</span>
          <strong>orangecrumbs</strong>
        </a>
      </header>

      <main>
        <section className="hero">
          <h1>Show HN<sup>*</sup> volume increased 6x since ChatGPT, <span>while the number of successful submissions remained relatively flat.</span></h1>
          <p className="dek">
            From ChatGPT&apos;s launch to the February 2026 peak, monthly Show HN
            submissions jumped from 0.9k to 5.8k — a 6.3× increase. Posts reaching
            20+ points rose from 128 to 211, just 1.6×.
          </p>
          <p className="show-hn-definition">
            <span aria-hidden="true">*</span> Show HN is Hacker News’s format for
            sharing something you personally built that other HN users can actually
            try. Hacker News (HN) is a discussion and link-sharing website focused on
            technology, startups, programming, science, and related topics. It is run
            by Y Combinator, the startup accelerator.
          </p>
          <p className="dateline">
            138,445 Show HN posts across 2.49 million surviving URL submissions ·
            January 2018–July 2026
          </p>
        </section>

        <section className="chart-section" aria-labelledby="volume-title">
          <header className="section-heading">
            <div>
              <span className="section-number">01.</span>
              <div>
                <h2 id="volume-title">Show HN submissions increased by as much as 6.3x at peak volume</h2>
                <p>The panels use separate scales but share the same timeline and selected month.</p>
              </div>
            </div>
          </header>
          <VolumeChart selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
        </section>

        <section className="chart-section" aria-labelledby="share-title">
          <header className="section-heading">
            <div>
              <span className="section-number">02.</span>
              <div>
                <h2 id="share-title">Show HN became a much larger slice of Hacker News</h2>
                <p>Monthly share of all surviving URL-story submissions. Hover to inspect a month.</p>
              </div>
            </div>
          </header>
          <ShareChart selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
        </section>

        <section className="chart-section" aria-labelledby="success-title">
          <header className="section-heading">
            <div>
              <span className="section-number">03.</span>
              <div>
                <h2 id="success-title">…however, the share of successful Show HN submissions (20+ points) remained relatively flat</h2>
                <p>Monthly 20-point Show HNs as a share of all submissions, with a rolling 12-month share.</p>
              </div>
            </div>
          </header>
          <SuccessChart selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
        </section>

        <section className="methodology" id="methodology" aria-label="Methodology">
          <div>
            <span>Methodology</span>
          </div>
          <dl>
            <div><dt>Show HN</dt><dd>A surviving URL story whose normalized title begins with “Show HN,” with or without a colon.</dd></div>
            <div><dt>All submissions</dt><dd>Surviving, non-dead URL stories. Ask HN and other text-only stories are not in this local archive, so the denominator is labeled accordingly.</dd></div>
            <div><dt>Successful Show HN</dt><dd>A qualifying Show HN with a recorded score of at least 20 points. This is a proxy for HN reception, not a judgment of intrinsic product quality.</dd></div>
            <div>
              <dt>Source</dt>
              <dd>
                The historical archive was downloaded as yearly Parquet files from OpenIndex&apos;s{" "}
                <a href="https://huggingface.co/datasets/open-index/hacker-news">open-index/hacker-news dataset on Hugging Face</a>
                {" "}and materialized locally in DuckDB. Recent stories and scores were refreshed through August 12, 2026 from the{" "}
                <a href="https://hn.algolia.com/api">Algolia HN Search API</a>. Monthly charts stop at July 2026, the latest complete month; incomplete December 2022 point totals were checked against Algolia and Hacker News item records.
              </dd>
            </div>
          </dl>
        </section>
      </main>

      <footer>
        <span><a className="footer-brand" href="https://www.orangecrumbs.com/">OrangeCrumbs</a> · Small tools for people who read Hacker News.</span>
        <span>Not affiliated with Y Combinator.</span>
      </footer>
    </div>
  );
}
