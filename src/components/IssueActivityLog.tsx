import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  History,
  Copy,
  Check,
  ArrowUpDown,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { IssueStatus, TimelineEvent } from '../types';

interface IssueActivityLogProps {
  issueId: number;
  currentStatus: IssueStatus;
  createdAt: string;
  updatedAt?: string;
  timeline: TimelineEvent[];
  compact?: boolean;
}

function formatDurationBetween(startIso: string, endIso: string): string {
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    return 'Instant';
  }
  const diffMinutes = Math.round((endMs - startMs) / (1000 * 60));
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }
  const hours = Math.floor(diffMinutes / 60);
  const remMins = diffMinutes % 60;
  if (hours < 24) {
    return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

function formatRelativeTimeAgo(iso: string): string {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function formatStageLabel(status: IssueStatus | null): string {
  if (!status || status === 'Open') return 'Reported (Open)';
  return status;
}

export const IssueActivityLog: React.FC<IssueActivityLogProps> = ({
  issueId,
  currentStatus,
  createdAt,
  timeline,
  compact = false,
}) => {
  const [sortDesc, setSortDesc] = useState(false);
  const [copiedLog, setCopiedLog] = useState(false);

  // Ensure timeline is sorted chronologically first to compute step deltas
  const chronologicalEvents: TimelineEvent[] =
    timeline && timeline.length > 0
      ? [...timeline].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
      : [
          {
            from: null,
            to: 'Open',
            note: 'Reported via public resident portal',
            at: createdAt,
          },
        ];

  const reportedEvent =
    chronologicalEvents.find((e) => e.from === null || e.to === 'Open') ||
    chronologicalEvents[0];
  const inProgressEvent = chronologicalEvents.find((e) => e.to === 'In Progress');
  const resolvedEvent = chronologicalEvents.find((e) => e.to === 'Resolved');

  const reportedTimestamp = reportedEvent?.at || createdAt;
  const inProgressTimestamp = inProgressEvent?.at || null;
  const resolvedTimestamp = resolvedEvent?.at || null;

  const eventsWithMetadata = chronologicalEvents.map((ev, index) => {
    const prevTimestamp = index > 0 ? chronologicalEvents[index - 1].at : null;
    const stepDelta = prevTimestamp ? formatDurationBetween(prevTimestamp, ev.at) : null;
    return {
      ...ev,
      stepNumber: index + 1,
      stepDelta,
      actor: ev.from === null ? 'Resident Portal Filing' : 'Ward Authority Officer',
    };
  });

  const displayedEvents = sortDesc
    ? [...eventsWithMetadata].reverse()
    : eventsWithMetadata;

  const handleCopyAuditTrail = () => {
    const lines = [
      `CivicCare Haldia — Official Issue #${issueId} Activity & Audit Log`,
      `Current Status: ${formatStageLabel(currentStatus)}`,
      `------------------------------------------------------------------`,
      ...eventsWithMetadata.map((ev) => {
        const transition = ev.from
          ? `${formatStageLabel(ev.from)} -> ${formatStageLabel(ev.to)}`
          : `Reported (Open)`;
        return `[Step #0${ev.stepNumber}] ${new Date(ev.at).toLocaleString()} (${ev.at}) | ${transition} | Actor: ${ev.actor} | Note: "${ev.note}"`;
      }),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header Bar with Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#4f46c8] shrink-0" />
          <h3 className={`${compact ? 'text-xs' : 'text-base'} font-bold text-[#17181d]`}>
            Activity Log &amp; Status Audit Trail
          </h3>
          <span className="text-xs font-mono tabular-nums text-[#858793]">
            ({eventsWithMetadata.length} {eventsWithMetadata.length === 1 ? 'entry' : 'entries'})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSortDesc((prev) => !prev)}
            className="h-7 px-2.5 rounded-[6px] border border-[#d8dbe2] bg-[#f7f8fb] hover:bg-white text-[11px] font-medium text-[#17181d] inline-flex items-center gap-1 cursor-pointer transition-colors"
            title="Toggle chronological sort order"
          >
            <ArrowUpDown className="w-3 h-3 text-[#5e606b]" />
            <span>{sortDesc ? 'Newest First' : 'Oldest First'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyAuditTrail}
            className="h-7 px-2.5 rounded-[6px] border border-[#d8dbe2] bg-[#f7f8fb] hover:bg-white text-[11px] font-medium text-[#17181d] inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            {copiedLog ? (
              <>
                <Check className="w-3 h-3 text-[#25985a]" />
                <span className="text-[#25985a]">Copied Log</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-[#5e606b]" />
                <span>Copy Audit Log</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3-Stage Status Lifecycle Stepper: Reported -> In Progress -> Resolved */}
      <div className="bg-[#f7f8fb] border border-[#d8dbe2] rounded-[10px] p-3.5 space-y-3">
        <div className="flex items-center justify-between text-[11px] text-[#5e606b]">
          <span className="font-semibold text-[#17181d]">
            Lifecycle Chain: Reported &rarr; In Progress &rarr; Resolved
          </span>
          {resolvedTimestamp ? (
            <span className="font-mono text-[#25985a] font-semibold">
              Total Resolution Time: {formatDurationBetween(reportedTimestamp, resolvedTimestamp)}
            </span>
          ) : inProgressTimestamp ? (
            <span className="font-mono text-[#344da6] font-semibold">
              Dispatch Response: {formatDurationBetween(reportedTimestamp, inProgressTimestamp)}
            </span>
          ) : (
            <span className="font-mono text-[#a33e3e] font-semibold">
              Awaiting Initial Dispatch
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Stage 1: Reported */}
          <div className="p-2.5 rounded-[8px] bg-white border border-[#c9c8f1] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#4f46c8] inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>1. Reported</span>
              </span>
              <span className="text-[10px] font-mono text-[#25985a] font-semibold">
                Logged
              </span>
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#17181d] font-medium">
              {new Date(reportedTimestamp).toLocaleString()}
            </div>
            <div className="text-[10px] text-[#858793]">
              {formatRelativeTimeAgo(reportedTimestamp)}
            </div>
          </div>

          {/* Stage 2: In Progress */}
          <div
            className={`p-2.5 rounded-[8px] border space-y-1 ${
              inProgressTimestamp || currentStatus === 'In Progress' || currentStatus === 'Resolved'
                ? 'bg-white border-[#344da6]/40'
                : 'bg-[#f4f5f8]/70 border-[#d8dbe2] opacity-75'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#344da6] inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>2. In Progress</span>
              </span>
              <span className="text-[10px] font-mono text-[#5e606b]">
                {inProgressTimestamp
                  ? `+${formatDurationBetween(reportedTimestamp, inProgressTimestamp)}`
                  : 'Pending'}
              </span>
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#17181d] font-medium">
              {inProgressTimestamp
                ? new Date(inProgressTimestamp).toLocaleString()
                : 'Awaiting crew dispatch'}
            </div>
            <div className="text-[10px] text-[#858793]">
              {inProgressTimestamp
                ? formatRelativeTimeAgo(inProgressTimestamp)
                : 'Next allowed transition'}
            </div>
          </div>

          {/* Stage 3: Resolved */}
          <div
            className={`p-2.5 rounded-[8px] border space-y-1 ${
              resolvedTimestamp || currentStatus === 'Resolved'
                ? 'bg-white border-[#25985a]/50'
                : 'bg-[#f4f5f8]/70 border-[#d8dbe2] opacity-75'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#25985a] inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>3. Resolved</span>
              </span>
              <span className="text-[10px] font-mono text-[#5e606b]">
                {resolvedTimestamp
                  ? `+${formatDurationBetween(
                      inProgressTimestamp || reportedTimestamp,
                      resolvedTimestamp
                    )}`
                  : 'Pending'}
              </span>
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#17181d] font-medium">
              {resolvedTimestamp
                ? new Date(resolvedTimestamp).toLocaleString()
                : 'Awaiting final verification'}
            </div>
            <div className="text-[10px] text-[#858793]">
              {resolvedTimestamp
                ? formatRelativeTimeAgo(resolvedTimestamp)
                : 'Terminal state'}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Timestamped Activity Log Entries */}
      <ol className="relative border-l-2 border-[#c9c8f1] ml-3 space-y-4">
        {displayedEvents.map((ev) => {
          const isResolved = ev.to === 'Resolved';
          const isInProgress = ev.to === 'In Progress';
          const dotColor = isResolved
            ? 'bg-[#25985a]'
            : isInProgress
            ? 'bg-[#344da6]'
            : 'bg-[#4f46c8]';

          return (
            <li key={`${ev.stepNumber}-${ev.at}`} className="ml-5">
              <span
                className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white ${dotColor}`}
              />
              <div className="bg-white border border-[#d8dbe2] rounded-[10px] p-3.5 space-y-2 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#f4f5f8] pb-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#17181d]">
                    <span className="font-mono text-[11px] text-[#4f46c8]">
                      #{String(ev.stepNumber).padStart(2, '0')}
                    </span>
                    <span aria-hidden="true">·</span>
                    {ev.from ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-[#5e606b]">{formatStageLabel(ev.from)}</span>
                        <ArrowRight className="w-3 h-3 text-[#858793]" />
                        <span
                          className={
                            isResolved
                              ? 'text-[#25985a] font-bold'
                              : isInProgress
                              ? 'text-[#344da6] font-bold'
                              : 'text-[#4f46c8] font-bold'
                          }
                        >
                          {formatStageLabel(ev.to)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[#4f46c8] font-bold">
                        Reported ({ev.to})
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums text-[#5e606b]">
                    <time dateTime={ev.at} title={ev.at}>
                      {new Date(ev.at).toLocaleString()}
                    </time>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#858793]">{formatRelativeTimeAgo(ev.at)}</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#17181d] leading-relaxed">
                  {ev.note}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#858793]">
                  <span className="inline-flex items-center gap-1">
                    {ev.from === null ? (
                      <UserCheck className="w-3 h-3 text-[#4f46c8]" />
                    ) : (
                      <ShieldCheck className="w-3 h-3 text-[#25985a]" />
                    )}
                    <span>{ev.actor}</span>
                  </span>

                  <span className="font-mono text-[10px]">
                    {ev.stepDelta
                      ? `Elapsed since previous status: +${ev.stepDelta}`
                      : `ISO Timestamp: ${ev.at}`}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
