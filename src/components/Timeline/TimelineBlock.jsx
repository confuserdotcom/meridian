import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, EyeOff, Play, Brain, Activity } from 'lucide-react';
import { categories } from '../../data/categories';
import { parseTime, getDurationMinutes, getDurationLabel, formatTime, minutesToTime, snapTo } from '../../utils/time';
import { sounds } from '../../utils/sounds';

const MIN_HEIGHT_PX = 28;
const DRAG_THRESHOLD = 4;

export default function TimelineBlock({
  block, baseIndex, isActive, isCustom,
  isTracking, canTrack, prediction,
  gridStart, gridEnd, pxPerMin, snapGrid, minDuration,
  scrollRef, interactive,
  onMove, onResize, onEdit, onHide, onTrack,
}) {
  const [dragPreview, setDragPreview] = useState(null);

  const cat = categories[block.category] || categories.transit;
  const startMin = parseTime(block.start);
  const endMin = parseTime(block.end);
  const duration = endMin - startMin;

  const dispStart = dragPreview?.start ?? startMin;
  const dispEnd = dragPreview?.end ?? endMin;
  const isDragging = dragPreview !== null;

  const top = (dispStart - gridStart) * pxPerMin;
  const height = Math.max(MIN_HEIGHT_PX, (dispEnd - dispStart) * pxPerMin);

  const ghostTop = (startMin - gridStart) * pxPerMin;
  const ghostHeight = Math.max(MIN_HEIGHT_PX, duration * pxPerMin);

  function startDrag(e, type) {
    if (!interactive) return;
    e.preventDefault();
    e.stopPropagation();

    const startY = e.clientY;
    const origStart = startMin;
    const origEnd = endMin;
    const origDur = origEnd - origStart;
    let hasMoved = false;
    let lastPreview = null;
    let lastSnapMin = origStart;

    function handleMove(ev) {
      const deltaY = ev.clientY - startY;

      if (!hasMoved && Math.abs(deltaY) < DRAG_THRESHOLD) return;
      if (!hasMoved) {
        hasMoved = true;
        sounds.dragStart();
      }

      const deltaMins = deltaY / pxPerMin;
      let ns, ne;

      if (type === 'move') {
        ns = snapTo(origStart + deltaMins, snapGrid);
        ne = ns + origDur;
        if (ns < gridStart) { ns = gridStart; ne = gridStart + origDur; }
        if (ne > gridEnd) { ne = gridEnd; ns = gridEnd - origDur; }
      } else if (type === 'resize-top') {
        ns = snapTo(origStart + deltaMins, snapGrid);
        ne = origEnd;
        if (ne - ns < minDuration) ns = ne - minDuration;
        if (ns < gridStart) ns = gridStart;
      } else {
        ns = origStart;
        ne = snapTo(origEnd + deltaMins, snapGrid);
        if (ne - ns < minDuration) ne = ns + minDuration;
        if (ne > gridEnd) ne = gridEnd;
      }

      const currentSnap = type === 'resize-bottom' ? ne : ns;
      if (currentSnap !== lastSnapMin) {
        lastSnapMin = currentSnap;
      }

      lastPreview = { start: ns, end: ne };
      setDragPreview({ start: ns, end: ne, type });

      if (scrollRef?.current) {
        const rect = scrollRef.current.getBoundingClientRect();
        const edge = 60;
        if (ev.clientY < rect.top + edge) {
          scrollRef.current.scrollTop -= 5;
        } else if (ev.clientY > rect.bottom - edge) {
          scrollRef.current.scrollTop += 5;
        }
      }
    }

    function handleUp() {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);

      if (hasMoved && lastPreview) {
        if (type === 'move') {
          onMove(block, baseIndex, lastPreview.start, lastPreview.end);
        } else {
          onResize(block, baseIndex, lastPreview.start, lastPreview.end);
        }
      } else if (type === 'move') {
        onEdit(block, baseIndex);
        sounds.click();
      }

      setDragPreview(null);
    }

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  const showNote = height >= 48 && block.note;
  const showTime = height >= 32;
  const compact = height < 32;
  const ultraCompact = height < 20;

  return (
    <>
      {/* Ghost at original position during drag */}
      {isDragging && (
        <motion.div
          className="absolute left-0 right-0 rounded-sm border border-dashed pointer-events-none"
          style={{
            top: ghostTop,
            height: ghostHeight,
            borderColor: cat.color + '50',
            backgroundColor: cat.color + '0D',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
        />
      )}

      {/* Time label while dragging */}
      {isDragging && (
        <motion.div
          className="absolute z-50 pointer-events-none"
          style={{ top: top - 20, left: -4 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="px-1.5 py-0.5 bg-ink text-paper dark:bg-paper dark:text-ink">
            <span className="font-mono text-[9px] tabular-nums tracking-[0.08em]">
              {formatTime(minutesToTime(dispStart))}—{formatTime(minutesToTime(dispEnd))}
            </span>
          </div>
        </motion.div>
      )}

      {/* The block */}
      <motion.div
        data-block="true"
        className={`group absolute left-0 right-0 rounded-sm overflow-hidden select-none touch-none ${
          isDragging
            ? 'z-40 cursor-grabbing'
            : 'z-10 cursor-grab hover:z-20'
        } ${isActive && !isDragging ? 'ring-1 ring-accent z-20' : ''}`}
        style={{
          top,
          height,
          borderLeft: `3px solid ${cat.color}`,
        }}
        initial={{ opacity: 0, scale: 0.96, x: -6 }}
        animate={{
          opacity: 1,
          scale: isDragging ? 1.02 : 1,
          x: 0,
        }}
        exit={{ opacity: 0, scale: 0.96, x: 6 }}
        transition={{
          type: 'spring',
          stiffness: isDragging ? 600 : 400,
          damping: isDragging ? 35 : 28,
        }}
        onPointerDown={(e) => startDrag(e, 'move')}
      >
        {/* Top resize handle — thin amber line, hover-only */}
        <div
          className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize z-30 group/top"
          onPointerDown={(e) => { e.stopPropagation(); startDrag(e, 'resize-top'); }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-transparent group-hover:bg-accent/30 group-hover/top:bg-accent transition-colors duration-150" />
        </div>

        {/* Content — light mode */}
        <div
          className="dark:hidden h-full px-2.5 flex items-center pointer-events-none"
          style={{ backgroundColor: cat.bg }}
        >
          <BlockContent
            cat={cat}
            block={block}
            dispStart={dispStart}
            dispEnd={dispEnd}
            isCustom={isCustom}
            isDragging={isDragging}
            isTracking={isTracking}
            prediction={prediction}
            showNote={showNote}
            showTime={showTime}
            compact={compact}
            ultraCompact={ultraCompact}
          />
        </div>
        {/* Content — dark mode */}
        <div
          className="hidden dark:flex h-full px-2.5 items-center pointer-events-none"
          style={{ backgroundColor: cat.darkBg }}
        >
          <BlockContent
            cat={cat}
            block={block}
            dispStart={dispStart}
            dispEnd={dispEnd}
            isCustom={isCustom}
            isDragging={isDragging}
            isTracking={isTracking}
            prediction={prediction}
            dark
            showNote={showNote}
            showTime={showTime}
            compact={compact}
            ultraCompact={ultraCompact}
          />
        </div>

        {/* Tracking indicator */}
        {isTracking && !isDragging && (
          <div className="absolute left-1 top-1 flex items-center gap-0.5 px-1 py-0.5 bg-accent text-ink rounded-sm text-[7px] font-mono font-bold pointer-events-none z-20">
            <Activity size={8} className="animate-pulse" />
            LIVE
          </div>
        )}

        {/* Hover action buttons */}
        {!isDragging && interactive && (
          <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-auto z-20">
            {canTrack && onTrack && !isTracking && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onTrack(block); }}
                className="flex items-center gap-0.5 pl-1 pr-1.5 py-0.5 bg-ink dark:bg-paper text-paper dark:text-ink rounded-sm hover:opacity-80 transition-opacity"
              >
                <Play size={9} fill="currentColor" />
                <span className="font-mono text-[8px] uppercase tracking-[0.1em]">Track</span>
              </button>
            )}
            {!isCustom && onHide && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onHide(baseIndex); }}
                className="p-1 border border-line/50 rounded-sm text-muted hover:text-ink dark:hover:text-paper hover:border-line transition-colors"
              >
                <EyeOff size={9} />
              </button>
            )}
          </div>
        )}

        {/* Drag grip */}
        {!isDragging && interactive && (
          <div className="absolute left-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
            <GripVertical size={10} className="text-muted" />
          </div>
        )}

        {/* Bottom resize handle — thin amber line, hover-only */}
        <div
          className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize z-30 group/bottom"
          onPointerDown={(e) => { e.stopPropagation(); startDrag(e, 'resize-bottom'); }}
        >
          <div className="absolute bottom-0 left-0 right-0 h-px bg-transparent group-hover:bg-accent/30 group-hover/bottom:bg-accent transition-colors duration-150" />
        </div>
      </motion.div>
    </>
  );
}

function BlockContent({ cat, block, dispStart, dispEnd, dark, isCustom, isDragging, isTracking, prediction, showNote, showTime, compact, ultraCompact }) {
  if (ultraCompact) {
    return (
      <div className="flex-1 min-w-0 flex items-center">
        <span
          className="text-[8px] font-semibold uppercase tracking-[0.22em] truncate"
          style={{ color: dark ? cat.darkColor : cat.color }}
        >
          {cat.label}
        </span>
      </div>
    );
  }
  const plannedDuration = parseTime(block.end) - parseTime(block.start);
  const showPrediction = prediction
    && prediction.confidence >= 25
    && Math.abs(prediction.predicted - plannedDuration) >= 3
    && !compact;

  return (
    <div className="flex-1 min-w-0 flex flex-col justify-center gap-0">
      <div className={`flex items-center gap-1.5 ${compact ? '' : 'justify-between'}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          {isDragging && (
            <GripVertical size={10} className="text-muted flex-shrink-0 animate-pulse" />
          )}
          <span
            className={`font-semibold uppercase tracking-[0.22em] truncate ${compact ? 'text-[8px]' : 'text-[10px]'}`}
            style={{ color: dark ? cat.darkColor : cat.color }}
          >
            {cat.label}
          </span>
          {block.ai && (
            <span className="text-[7px] font-mono uppercase tracking-[0.1em] border border-muted/40 text-muted px-1 rounded-sm flex-shrink-0 leading-tight">
              AI
            </span>
          )}
        </div>
        {showTime && (
          <span className="font-mono text-[9px] text-muted flex-shrink-0 tabular-nums">
            {isDragging
              ? `${formatTime(minutesToTime(dispStart))}–${formatTime(minutesToTime(dispEnd))}`
              : getDurationLabel(block.start, block.end)
            }
          </span>
        )}
      </div>
      {showNote && (
        <p className="text-[10px] text-muted leading-snug line-clamp-1 mt-0.5">
          {block.note}
        </p>
      )}
      {showPrediction && (
        <div className="flex items-center gap-1 mt-0.5 text-[8px] font-mono text-muted">
          <Brain size={8} className="flex-shrink-0" />
          <span className="tabular-nums">~{prediction.predicted}m</span>
        </div>
      )}
    </div>
  );
}
