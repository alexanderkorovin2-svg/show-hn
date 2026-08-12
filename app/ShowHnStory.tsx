"use client";

import { useMemo, useState, type PointerEvent } from "react";
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

type DataRow = {
  month: string;
  total: number;
  show: number;
  authors: number;
  share: number;
  rollingShare: number | null;
  successful: number;
  successfulOverallShare: number;
  rollingSuccessfulOverallShare: number | null;
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

function changePercent(before: number, after: number) {
  return Math.round((after / before - 1) * 100);
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
      successful,
      successfulOverallShare: (successful / total) * 100,
      rollingSuccessfulOverallShare:
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
}: {
  x: (index: number) => number;
  top: number;
  bottom: number;
  compact?: boolean;
}) {
  return MILESTONES.map((milestone, markerIndex) => {
    const index = DATA.findIndex((row) => row.month === milestone.date);
    const markerX = x(index);
    return (
      <g className="event-marker" key={milestone.id}>
        <line x1={markerX} x2={markerX} y1={top} y2={bottom} />
        {!compact && (
          <text
            x={markerX + (markerIndex === 0 ? 7 : -7)}
            y={top + 11}
            textAnchor={markerIndex === 0 ? "start" : "end"}
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
        <span><i className="legend-line is-event" />AI product launch</span>
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

      <label className="month-scrubber">
        <span>Explore month</span>
        <input
          type="range"
          min="0"
          max={DATA.length - 1}
          value={selectedIndex}
          onChange={(event) => onSelect(Number(event.target.value))}
          aria-label="Selected month"
        />
        <strong>{formatMonth(active.month)}</strong>
      </label>
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
        <span><i className="swatch is-total" />All URL stories</span>
        <span><i className="swatch is-show" />Show HN stories</span>
        <span><i className="swatch is-authors" />Distinct Show HN submitters</span>
      </div>
      <svg
        className="volume-chart"
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-labelledby="volume-chart-title volume-chart-desc"
      >
        <title id="volume-chart-title">Monthly URL stories and Show HN volume</title>
        <desc id="volume-chart-desc">
          Two synchronized panels show that overall URL story volume stayed
          relatively stable while Show HN submissions and distinct submitters rose.
        </desc>
        <text className="panel-label" x={CHART_MARGIN.left} y="27">ALL URL STORIES</text>
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
        <EventMarkers x={x} top={totalPanel.top} bottom={showPanel.bottom} compact />
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
    active.rollingSuccessfulOverallShare ?? active.successfulOverallShare;
  const monthlySuccessfulPath = pathFor(DATA, x, (row) =>
    ySuccessful(row.successfulOverallShare),
  );
  const rollingSuccessfulPath = pathFor(DATA, x, (row) =>
    row.rollingSuccessfulOverallShare === null
      ? null
      : ySuccessful(row.rollingSuccessfulOverallShare),
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
        <span><i className="legend-line is-successful" />20+ Show HN, rolling 12 months</span>
      </div>

      <div className="chart-canvas">
        <svg
          className="success-chart"
          viewBox={`0 0 ${WIDTH} ${height}`}
          role="img"
          aria-labelledby="success-chart-title success-chart-desc"
        >
          <title id="success-chart-title">Successful Show HN share of all URL stories</title>
          <desc id="success-chart-desc">
            Monthly and rolling 12-month shares show that Show HN stories reaching
            20 points remained a relatively flat share of all URL stories.
          </desc>
          <text className="panel-label" x={CHART_MARGIN.left} y="27">20+ SHOW HN / ALL URL STORIES</text>
          <text className="panel-value is-successful" x={WIDTH - CHART_MARGIN.right} y="27" textAnchor="end">
            {active.rollingSuccessfulOverallShare === null ? "Monthly" : "12-month"}: {formatShare(activeSuccessfulShare)} in {formatMonth(active.month)}
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
                {tick === 0 ? "0%" : `${tick.toFixed(2).replace(/0$/, "")}%`}
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

function MilestoneComparison() {
  const [activeId, setActiveId] = useState<(typeof MILESTONES)[number]["id"]>(
    "claude-code",
  );
  const milestone = MILESTONES.find((item) => item.id === activeId) ?? MILESTONES[1];
  const metrics = [
    {
      label: "Show HN submissions",
      before: milestone.pre.show,
      after: milestone.post.show,
      format: formatNumber,
    },
    {
      label: "All URL submissions",
      before: milestone.pre.total,
      after: milestone.post.total,
      format: formatNumber,
    },
    {
      label: "Show HN share",
      before: milestone.pre.share,
      after: milestone.post.share,
      format: formatShare,
    },
    {
      label: "Distinct submitters",
      before: milestone.pre.authors,
      after: milestone.post.authors,
      format: formatNumber,
    },
  ];

  return (
    <section className="comparison-section" aria-labelledby="comparison-title">
      <header className="section-heading comparison-heading">
        <div>
          <span className="section-number">04.</span>
          <div>
            <h2 id="comparison-title">Before and after the milestones</h2>
            <p>Equal 12-month windows. Useful context, not a causal estimate.</p>
          </div>
        </div>
        <div className="milestone-tabs" role="group" aria-label="Choose milestone">
          {MILESTONES.map((item) => (
            <button
              type="button"
              className={item.id === activeId ? "is-active" : ""}
              aria-pressed={item.id === activeId}
              onClick={() => setActiveId(item.id)}
              key={item.id}
            >
              {item.id === "chatgpt" ? "ChatGPT" : "Claude Code"}
            </button>
          ))}
        </div>
      </header>

      <div className="comparison-context">
        <strong>{milestone.label}</strong>
        <span>{milestone.displayDate}</span>
        <span><i className="is-before" />Before: {milestone.preLabel}</span>
        <span><i className="is-after" />After: {milestone.postLabel}</span>
      </div>

      <div className="comparison-grid">
        {metrics.map((metric) => {
          const change = changePercent(metric.before, metric.after);
          const beforeWidth = Math.min(100, (metric.before / metric.after) * 100);
          return (
            <article className="comparison-card" key={metric.label}>
              <header>
                <span>{metric.label}</span>
                <strong>+{change}%</strong>
              </header>
              <div className="comparison-values">
                <div><small>Before</small><strong>{metric.format(metric.before)}</strong></div>
                <div><small>After</small><strong>{metric.format(metric.after)}</strong></div>
              </div>
              <div className="comparison-bars" aria-hidden="true">
                <i className="bar-before" style={{ width: `${beforeWidth}%` }} />
                <i className="bar-after" />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ShowHnStory() {
  const [selectedIndex, setSelectedIndex] = useState(DATA.length - 1);
  const latestRollingShare = useMemo(
    () => DATA[DATA.length - 1].rollingShare ?? DATA[DATA.length - 1].share,
    [],
  );
  const latestRollingSuccessfulOverallShare = useMemo(
    () =>
      DATA[DATA.length - 1].rollingSuccessfulOverallShare ??
      DATA[DATA.length - 1].successfulOverallShare,
    [],
  );

  return (
    <div className="site-frame">
      <header className="topbar">
        <a className="brand" href="/" aria-label="OrangeCrumbs home">
          <span className="logo" aria-hidden="true">O</span>
          <strong>orangecrumbs</strong>
        </a>
        <span className="topbar-note">Data stories for Hacker News</span>
        <a className="topbar-link" href="#methodology">Methodology ↓</a>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">Data story · August 2026</p>
          <h1>Show HN got a lot busier <span>after AI coding took off.</span></h1>
          <p className="dek">
            In the 12 months after Claude Code&apos;s preview, Show HN submissions
            rose 89%. Overall HN URL submissions rose 10%. Nearly twice as many
            distinct accounts launched something.
          </p>
          <p className="dateline">
            192,390 Show HN posts across 4.45 million surviving URL submissions ·
            October 2006–August 12, 2026
          </p>

          <div className="hero-stats" aria-label="Key findings">
            <article>
              <span>Show HN submissions</span>
              <strong>+89%</strong>
              <small>after Claude Code</small>
            </article>
            <article>
              <span>All URL submissions</span>
              <strong>+10%</strong>
              <small>over the same windows</small>
            </article>
            <article>
              <span>Share of URL stories</span>
              <strong>6.5% → 11.2%</strong>
              <small>12 months before vs. after</small>
            </article>
            <article>
              <span>Distinct submitters</span>
              <strong>+87%</strong>
              <small>11,553 → 21,557</small>
            </article>
          </div>
        </section>

        <section className="chart-section" aria-labelledby="share-title">
          <header className="section-heading">
            <div>
              <span className="section-number">01.</span>
              <div>
                <h2 id="share-title">Show HN became a larger slice of Hacker News</h2>
                <p>Monthly share of all surviving URL-story submissions. Hover or use the month slider.</p>
              </div>
            </div>
            <strong className="section-stat">{formatShare(latestRollingShare)}<small>latest 12-month share</small></strong>
          </header>
          <ShareChart selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
          <aside className="chart-takeaway">
            <span>Peak month</span>
            <p><strong>Nearly one in five URL submissions was a Show HN in February 2026.</strong> The monthly spike later cooled, but the rolling share remained well above its pre-2023 baseline.</p>
          </aside>
        </section>

        <section className="chart-section" aria-labelledby="volume-title">
          <header className="section-heading">
            <div>
              <span className="section-number">02.</span>
              <div>
                <h2 id="volume-title">The growth was specific to Show HN</h2>
                <p>The panels use separate scales but share the same timeline and selected month.</p>
              </div>
            </div>
          </header>
          <VolumeChart selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
          <div className="finding-grid">
            <article>
              <span>More builders, not just more repeat posts</span>
              <strong>Submitters rose almost as quickly as submissions.</strong>
              <p>The average number of Show HNs per participating account barely changed across the Claude Code comparison windows.</p>
            </article>
            <article>
              <span>A useful counterexample</span>
              <strong>Show HN also jumped in spring 2020.</strong>
              <p>The pandemic-era side-project spike predates ChatGPT, a reminder that product launches are not the only force shaping this series.</p>
            </article>
          </div>
        </section>

        <section className="chart-section" aria-labelledby="success-title">
          <header className="section-heading">
            <div>
              <span className="section-number">03.</span>
              <div>
                <h2 id="success-title">However, successful Show HNs remained a relatively flat share of HN</h2>
                <p>Show HN posts reaching 20+ points as a share of all surviving URL-story submissions. Hover to inspect a month.</p>
              </div>
            </div>
            <strong className="section-stat">{formatShare(latestRollingSuccessfulOverallShare)}<small>20+ Show HNs / all URL stories</small></strong>
          </header>
          <SuccessChart selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
          <aside className="chart-takeaway success-takeaway">
            <span>More launches, same share of HN successes</span>
            <p><strong>20-point Show HNs were 0.69% of all URL submissions before Claude Code and 0.68% after.</strong> Their count rose 8%, almost exactly in line with HN overall (+10%), while all Show HN submissions rose 89%.</p>
          </aside>
        </section>

        <MilestoneComparison />

        <section className="interpretation" aria-labelledby="reading-title">
          <header>
            <span>What the data supports</span>
            <h2 id="reading-title">A bigger launch funnel, not proof that AI caused it</h2>
          </header>
          <div className="interpretation-grid">
            <article><span>01</span><p><strong>Show HN clearly outgrew HN overall.</strong> Normalizing by all URL stories makes the increase hard to explain as site-wide growth alone.</p></article>
            <article><span>02</span><p><strong>The increase is broad-based.</strong> Distinct submitting accounts rose alongside post volume, consistent with more people building and launching.</p></article>
            <article><span>03</span><p><strong>The dates are annotations, not experiments.</strong> Releases overlap with model improvements, startup cycles, moderation, spam, and other changes.</p></article>
          </div>
        </section>

        <section className="methodology" id="methodology" aria-labelledby="methodology-title">
          <div>
            <span>Methodology</span>
            <h2 id="methodology-title">What counts—and what does not</h2>
          </div>
          <dl>
            <div><dt>Show HN</dt><dd>A surviving URL story whose normalized title begins with “Show HN,” with or without a colon.</dd></div>
            <div><dt>All submissions</dt><dd>Surviving, non-dead URL stories. Ask HN and other text-only stories are not in this local archive, so the denominator is labeled accordingly.</dd></div>
            <div><dt>Successful Show HN</dt><dd>A qualifying Show HN with a recorded score of at least 20 points. Section 03 divides these stories by all surviving URL-story submissions in the same period.</dd></div>
            <div><dt>Pre/post windows</dt><dd>Equal 12-month windows ending immediately before and beginning in the launch month. They describe timing; they do not isolate causal effects.</dd></div>
            <div><dt>Source</dt><dd>The local OpenIndex Hacker News archive, materialized in DuckDB and refreshed through August 12, 2026. Monthly charts stop at July 2026, the latest complete month. Incomplete December 2022 point totals were repaired from Algolia and Hacker News item records.</dd></div>
          </dl>
        </section>
      </main>

      <footer>
        <span>OrangeCrumbs · Small tools for people who read Hacker News.</span>
        <span>Not affiliated with Y Combinator.</span>
      </footer>
    </div>
  );
}
