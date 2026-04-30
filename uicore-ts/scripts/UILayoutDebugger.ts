/// #if DEV

/**
 * UILayoutDebugger
 *
 * A development-only utility for visualizing and debugging the UIView layout
 * system. Disabled entirely at runtime unless explicitly enabled.
 *
 * FEATURES
 * ─────────
 *
 * 1. Record-and-replay step debugger
 *    Every layout pass is recorded as an ordered sequence of steps. Each step
 *    captures the view that was laid out, its frame before and after, and the
 *    frames assigned to each of its subviews. After the pass completes you can
 *    scrub through the steps one at a time in the overlay UI, seeing exactly
 *    which view was processed at each point and how the frames changed.
 *
 * 2. Live breakpoint step-through
 *    When breakpoint mode is enabled (UILayoutDebugger.enableBreakpoints()), a
 *    special sentinel line is executed before each view's layoutIfNeeded() call.
 *    Put a browser debugger breakpoint on that line and the JS debugger will
 *    pause before every layout step — the full live JS stack and all object
 *    state are available at that point, exactly as with any other breakpoint.
 *
 *    The sentinel line is:
 *      const breakpointOnThisLine = "Add a breakpoint on this line to step through layout."
 *    Search for that string in the Sources panel to find it quickly.
 *
 * 3. View-tree heat-map overlay
 *    A floating panel renders the full view hierarchy as an indented tree.
 *    Each node is coloured by how many times it was laid out in the most recent
 *    pass: untouched (grey), once (green), twice (orange), three-or-more (red).
 *    The node currently active in the step scrubber is highlighted in blue.
 *    Hovering a node shows its class, elementID, and frame.
 *
 * INTEGRATION POINTS IN UIView.ts
 * ────────────────────────────────
 * Add the following calls alongside the existing UILayoutCycleTracer calls:
 *
 *   layoutViewsIfNeeded():
 *     window.UILayoutDebugger?.willBeginLayoutPass(UIView._viewsToLayout)    // before the while loop
 *     window.UILayoutDebugger?.willBeginIteration(iteration)                 // inside the while loop, top
 *     window.UILayoutDebugger?.willLayoutView(view)                          // before view.layoutIfNeeded()
 *     [breakpoint sentinel — see below]
 *     view.layoutIfNeeded()
 *     window.UILayoutDebugger?.didLayoutView(view)                           // after view.layoutIfNeeded()
 *     window.UILayoutDebugger?.didFinishLayoutPass(iteration)                // after the while loop
 *
 *   layoutSubviews():
 *     window.UILayoutDebugger?.willSetSubviewFrames(this)                    // before the subview loop
 *     [existing subview loop]
 *     window.UILayoutDebugger?.didSetSubviewFrames(this)                     // after the subview loop
 *
 *   The breakpoint sentinel block (inside layoutViewsIfNeeded, before
 *   view.layoutIfNeeded()):
 *
 *     if (window.UILayoutDebugger?._shouldHitBreakpoint(view)) {
 *         const breakpointOnThisLine = "Add a breakpoint on this line to step through layout."
 *     }
 *
 * USAGE
 * ─────
 *   UILayoutDebugger.enable()            — record traces and show the overlay
 *   UILayoutDebugger.disable()           — hide overlay and stop recording
 *   UILayoutDebugger.enableBreakpoints() — also pause at each layout step
 *   UILayoutDebugger.stepForward()       — advance the replay scrubber by one
 *   UILayoutDebugger.stepBack()          — retreat the replay scrubber by one
 *   UILayoutDebugger.goToStep(n)         — jump to step n (0-based)
 */


// ─── Data model ─────────────────────────────────────────────────────────────

interface UILayoutDebugFrame {
    top: number
    left: number
    width: number
    height: number
}

/** A snapshot of a view's intrinsic size cache at a point in time. */
interface UILayoutDebugCacheSnapshot {
    entryCount: number
    entries: Record<string, { width: number; height: number }>
    isShared: boolean
    sharedKey?: string
    /** Whether _frameCache was populated at snapshot time. */
    hasFrameCache: boolean
    /** Snapshot of _frameCache if populated; null if absent. */
    frameCache: UILayoutDebugFrame | null
    /** Whether _frameCacheForVirtualLayouting was populated at snapshot time. */
    hasVirtualFrameCache: boolean
    /** Snapshot of _frameCacheForVirtualLayouting if populated; null if absent. */
    virtualFrameCache: UILayoutDebugFrame | null
}

/**
 * Global UITextMeasurement cache sizes at a snapshot instant.
 * These are not per-view — they're attached to the snapshot as a whole.
 */
interface UILayoutDebugTextMeasurementSnapshot {
    preparedCacheSize: number
    styleCacheSize: number
}

interface UILayoutDebugSubviewRecord {
    viewIndex: number           // _UIViewIndex of the subview
    className: string
    elementID: string
    frameBefore: UILayoutDebugFrame | null
    frameAfter: UILayoutDebugFrame | null
}

/** What caused a view to enter the layout queue. */
interface UILayoutDebugTrigger {
    callerFunction: string      // first application frame, e.g. "MyView.layoutSubviews"
    cleanStack: string          // full cleaned stack string
}

/** One step = one call to layoutIfNeeded() on one view. */
interface UILayoutDebugStep {
    stepIndex: number
    iteration: number
    viewIndex: number           // _UIViewIndex of the laid-out view
    className: string
    elementID: string
    frameBefore: UILayoutDebugFrame | null
    frameAfter: UILayoutDebugFrame | null
    cacheBefore: UILayoutDebugCacheSnapshot | null
    cacheAfter: UILayoutDebugCacheSnapshot | null
    subviewRecords: UILayoutDebugSubviewRecord[]
    trigger: UILayoutDebugTrigger | null    // what called setNeedsLayout on this view
}

interface UILayoutDebugTreeNode {
    viewIndex: number
    className: string
    elementID: string
    depth: number
    frame: UILayoutDebugFrame | null
    layoutCount: number         // times laid out in the recorded pass
    cacheAfterPass: UILayoutDebugCacheSnapshot | null   // intrinsic cache state after the pass
    children: UILayoutDebugTreeNode[]
}

interface UILayoutDebugTrace {
    passIndex: number
    steps: UILayoutDebugStep[]
    roots: UILayoutDebugTreeNode[]
    totalIterations: number
    cacheChanges: UILayoutDebugCacheChangeEvent[]
}

/** A flat snapshot of every view's frame and intrinsic cache at a point in time. */
interface UILayoutDebugStateSnapshot {
    label: string
    takenAt: number                          // Date.now()
    views: Map<number, UILayoutDebugViewState>
    /** Global UITextMeasurement cache sizes at the instant this snapshot was taken. */
    textMeasurement: UILayoutDebugTextMeasurementSnapshot
}

interface UILayoutDebugViewState {
    viewIndex: number
    className: string
    elementID: string
    frame: UILayoutDebugFrame | null
    cache: UILayoutDebugCacheSnapshot | null
}

type UILayoutDebugDiffKind = "appeared" | "disappeared" | "frame" | "cache" | "both" | "unchanged"

interface UILayoutDebugViewDiff {
    kind: UILayoutDebugDiffKind
    viewIndex: number
    className: string
    elementID: string
    baselineFrame: UILayoutDebugFrame | null
    currentFrame: UILayoutDebugFrame | null
    baselineCache: UILayoutDebugCacheSnapshot | null
    currentCache: UILayoutDebugCacheSnapshot | null
}

/**
 * Fired when _getCachedIntrinsicSize returns a value that differs from the
 * last value we observed for that view+cacheKey combination.
 */
interface UILayoutDebugCacheChangeEvent {
    eventIndex: number
    stepIndex: number           // which step was active when the write occurred (-1 = between steps)
    iteration: number
    viewIndex: number
    className: string
    elementID: string
    cacheKey: string            // raw key, e.g. "h_0__w_500"
    newValue: { width: number; height: number }
    callerFunction: string      // first app-code frame at point of write
    cleanStack: string
}


// ─── Main class ──────────────────────────────────────────────────────────────

export class UILayoutDebugger {
    
    // ── Runtime guard ────────────────────────────────────────────────────────
    // The #if DEV preprocessor comment may not be present in every build.
    // This flag is the authoritative runtime gate. All hook methods check it
    // first and are no-ops unless _isEnabled is true.
    
    static _isEnabled: boolean = false
    static _breakpointsEnabled: boolean = false
    
    static get isEnabled(): boolean { return UILayoutDebugger._isEnabled }
    static get breakpointsEnabled(): boolean { return UILayoutDebugger._breakpointsEnabled }
    
    
    // ── Recording state ──────────────────────────────────────────────────────
    
    static _passIndex: number = 0
    static _currentTrace: UILayoutDebugTrace | null = null
    static _currentIteration: number = 0
    
    // Pending step being built as a view is being laid out
    static _pendingStep: UILayoutDebugStep | null = null
    
    // Subview frames captured during layoutSubviews() of the pending step's view
    static _pendingSubviewsBefore: Map<number, UILayoutDebugFrame | null> = new Map()
    
    // Per-view layout counts for the current pass (used for tree colouring)
    static _layoutCountsThisPass: Map<number, number> = new Map()
    
    // Live view object references keyed by _UIViewIndex, populated during the
    // pass and used to build the subtree forest in didFinishLayoutPass.
    static _liveViewRegistry: Map<number, any> = new Map()
    
    // First setNeedsLayout trigger per view per pass. Only the first enqueue
    // is recorded — subsequent redundant calls on the same view are ignored.
    static _triggerMap: Map<number, UILayoutDebugTrigger> = new Map()
    
    // Stack frames belonging to framework internals that should be stripped
    // from the top of a captured stack so the first visible frame is always
    // application code.
    static _noiseFramePrefixes: string[] = [
        "UILayoutDebugger",
        "UIView.setNeedsLayout",
        "setNeedsLayout",
        "UIView.didLayoutSubviews",
        "didLayoutSubviews",
        "UIView.layoutSubviews",
        "UIView.layoutIfNeeded",
        "layoutIfNeeded",
        "UIView.layoutViewsIfNeeded",
        "layoutViewsIfNeeded",
        "UIView._setCachedIntrinsicSize",
        "_setCachedIntrinsicSize",
    ]
    
    // All completed traces, newest first
    static _traces: UILayoutDebugTrace[] = []
    static readonly maxStoredTraces = 20
    
    
    // ── Replay state ─────────────────────────────────────────────────────────
    
    static _replayTraceIndex: number = 0     // which trace is shown in left/single pane
    static _replayStepIndex: number = -1     // -1 = before any step
    
    // ── Compare mode state ────────────────────────────────────────────────────
    
    static _compareMode: boolean = false
    static _frameFilter: "all" | "changed" | "unchanged" = "all"
    
    /**
     * When true, frame comparisons ignore origin (x/y) and only consider size
     * (width/height) — i.e. they diff bounds rather than frames.
     * A position-only move does not trigger a layout recompute of content, so
     * bounds mode surfaces only the changes that actually matter for sizing.
     */
    static _boundsBasedDiff: boolean = false
    static _compareTraceIndex: number = 1    // which trace is shown in right pane
    static _compareStepIndex: number = -1
    
    // Shared expand/collapse state for the tree in compare mode, keyed by
    // viewIndex. When both trees render from the same map, toggling one node
    // collapses/expands the same node in both panes simultaneously.
    static _sharedExpandState: Map<number, boolean> = new Map()
    
    // Expand state for the single-column pass inspector. Kept persistent so
    // the live inspector can sync from it.
    static _singleExpandState: Map<number, boolean> = new Map()
    
    // Expand state for the live inspector panel.
    static _liveExpandState: Map<number, boolean> = new Map()
    
    
    // ── Public API ───────────────────────────────────────────────────────────
    
    static enable() {
        UILayoutDebugger._isEnabled = true
        UILayoutDebugger._ensureOverlay()
        UILayoutDebugger._renderOverlay()
        console.log(
            "%c[UILayoutDebugger] ENABLED — recording layout traces and showing overlay.",
            "color: #4CAF50; font-weight: bold"
        )
    }
    
    static disable() {
        UILayoutDebugger._isEnabled = false
        UILayoutDebugger._breakpointsEnabled = false
        UILayoutDebugger._removeOverlay()
        console.log(
            "%c[UILayoutDebugger] DISABLED.",
            "color: #9E9E9E; font-weight: bold"
        )
    }
    
    /**
     * Enable the breakpoint sentinel. Once enabled, _shouldHitBreakpoint()
     * returns true before every layoutIfNeeded() call so the browser debugger
     * can pause on the sentinel line in UIView.ts.
     */
    static enableBreakpoints() {
        if (!UILayoutDebugger._isEnabled) {
            UILayoutDebugger.enable()
        }
        UILayoutDebugger._breakpointsEnabled = true
        console.log(
            "%c[UILayoutDebugger] Breakpoint mode ON. " +
            "Search for 'breakpointOnThisLine' in Sources to set your breakpoint.",
            "color: #FF9800; font-weight: bold"
        )
    }
    
    static disableBreakpoints() {
        UILayoutDebugger._breakpointsEnabled = false
        console.log(
            "%c[UILayoutDebugger] Breakpoint mode OFF.",
            "color: #9E9E9E"
        )
    }
    
    // ── Replay controls ──────────────────────────────────────────────────────
    
    static stepForward() {
        if (!UILayoutDebugger._isEnabled) { return }
        const trace = UILayoutDebugger._currentReplayTrace
        if (!trace) { return }
        const next = UILayoutDebugger._replayStepIndex + 1
        UILayoutDebugger.goToStep(Math.min(next, trace.steps.length - 1))
    }
    
    static stepBack() {
        if (!UILayoutDebugger._isEnabled) { return }
        UILayoutDebugger.goToStep(Math.max(UILayoutDebugger._replayStepIndex - 1, -1))
    }
    
    static goToStep(stepIndex: number) {
        if (!UILayoutDebugger._isEnabled) { return }
        UILayoutDebugger._replayStepIndex = stepIndex
        UILayoutDebugger._renderOverlay()
    }
    
    static goToCompareStep(stepIndex: number) {
        if (!UILayoutDebugger._isEnabled) { return }
        UILayoutDebugger._compareStepIndex = stepIndex
        UILayoutDebugger._renderOverlay()
    }
    
    static showTrace(traceIndex: number) {
        if (!UILayoutDebugger._isEnabled) { return }
        const clamped = Math.max(0, Math.min(traceIndex, UILayoutDebugger._traces.length - 1))
        UILayoutDebugger._replayTraceIndex = clamped
        UILayoutDebugger._replayStepIndex = -1
        UILayoutDebugger._singleExpandState = new Map()
        UILayoutDebugger._renderOverlay()
    }
    
    static showCompareTrace(traceIndex: number) {
        if (!UILayoutDebugger._isEnabled) { return }
        const clamped = Math.max(0, Math.min(traceIndex, UILayoutDebugger._traces.length - 1))
        UILayoutDebugger._compareTraceIndex = clamped
        UILayoutDebugger._compareStepIndex = -1
        UILayoutDebugger._renderOverlay()
    }
    
    static get _currentReplayTrace(): UILayoutDebugTrace | null {
        return UILayoutDebugger._traces[UILayoutDebugger._replayTraceIndex] ?? null
    }
    
    static get _currentCompareTrace(): UILayoutDebugTrace | null {
        return UILayoutDebugger._traces[UILayoutDebugger._compareTraceIndex] ?? null
    }
    
    
    // ── Hook: called from layoutViewsIfNeeded() ──────────────────────────────
    
    static willBeginLayoutPass(viewsToLayout: any[]) {
        if (!UILayoutDebugger._isEnabled) { return }
        
        UILayoutDebugger._currentTrace = {
            passIndex: UILayoutDebugger._passIndex++,
            steps: [],
            roots: [],
            cacheChanges: [],
            totalIterations: 0,
        }
        UILayoutDebugger._currentIteration = 0
        UILayoutDebugger._layoutCountsThisPass = new Map()
        UILayoutDebugger._liveViewRegistry = new Map()
        UILayoutDebugger._pendingStep = null
        UILayoutDebugger._pendingSubviewsBefore = new Map()
    }
    
    static willBeginIteration(iteration: number) {
        if (!UILayoutDebugger._isEnabled) { return }
        UILayoutDebugger._currentIteration = iteration
    }
    
    /**
     * Called from setNeedsLayout() each time a view is enqueued.
     * Only the *first* enqueue per view per pass is recorded — that is the
     * call that actually caused the view to enter the queue. Subsequent calls
     * on the same view within the same pass are redundant and ignored.
     */
    static viewDidCallSetNeedsLayout(view: any) {
        if (!UILayoutDebugger._isEnabled) { return }
        
        const viewIdx: number = view?._UIViewIndex ?? -1
        if (viewIdx < 0) { return }
        
        // Only record the first enqueue per view per pass.
        if (UILayoutDebugger._triggerMap.has(viewIdx)) { return }
        
        const rawStack = new Error().stack ?? ""
        const cleanStack = UILayoutDebugger._cleanStack(rawStack)
        const callerFunction = UILayoutDebugger._extractCallerFunctionName(cleanStack)
        
        UILayoutDebugger._triggerMap.set(viewIdx, { callerFunction, cleanStack })
    }
    
    /**
     * Called from _setCachedIntrinsicSize() after the value is written.
     * Every write is a change by definition, so no history comparison is needed.
     *
     * Call site in UIView.ts, at the end of _setCachedIntrinsicSize():
     *
     *   window.UILayoutDebugger?.didSetCachedIntrinsicSize(this, cacheKey, size)
     */
    static didSetCachedIntrinsicSize(view: any, cacheKey: string, value: any) {
        if (!UILayoutDebugger._isEnabled) { return }
        
        const trace = UILayoutDebugger._currentTrace
        if (!trace) { return }
        
        const viewIdx: number = view?._UIViewIndex ?? -1
        if (viewIdx < 0) { return }
        
        const rawStack = new Error().stack ?? ""
        const cleanStack = UILayoutDebugger._cleanStack(rawStack)
        const callerFunction = UILayoutDebugger._extractCallerFunctionName(cleanStack)
        
        const event: UILayoutDebugCacheChangeEvent = {
            eventIndex: trace.cacheChanges.length,
            stepIndex: UILayoutDebugger._pendingStep?.stepIndex ?? -1,
            iteration: UILayoutDebugger._currentIteration,
            viewIndex: viewIdx,
            className: view?.constructor?.name ?? "UnknownView",
            elementID: view?.elementID ?? String(viewIdx),
            cacheKey,
            newValue: { width: value?.width ?? 0, height: value?.height ?? 0 },
            callerFunction,
            cleanStack,
        }
        trace.cacheChanges.push(event)
    }
    static willLayoutView(view: any) {
        if (!UILayoutDebugger._isEnabled) { return }
        
        const stepIndex = UILayoutDebugger._currentTrace?.steps.length ?? 0
        const viewIdx: number = view?._UIViewIndex ?? -1
        
        // Keep a live reference so didFinishLayoutPass can reach .rootView.
        if (viewIdx >= 0) {
            UILayoutDebugger._liveViewRegistry.set(viewIdx, view)
        }
        
        UILayoutDebugger._pendingStep = {
            stepIndex,
            iteration: UILayoutDebugger._currentIteration,
            viewIndex: viewIdx,
            className: view?.constructor?.name ?? "UnknownView",
            elementID: view?.elementID ?? String(viewIdx),
            frameBefore: UILayoutDebugger._captureFrame(view),
            frameAfter: null,
            cacheBefore: UILayoutDebugger._captureCache(view),
            cacheAfter: null,
            subviewRecords: [],
            trigger: UILayoutDebugger._triggerMap.get(viewIdx) ?? null,
        }
        // Consume the trigger so it doesn't linger across future passes.
        UILayoutDebugger._triggerMap.delete(viewIdx)
        
        // Capture subview frames *before* layout. The post-layout capture
        // happens in didSetSubviewFrames() which is called from layoutSubviews().
        UILayoutDebugger._pendingSubviewsBefore = new Map()
        const subviews: any[] = view?.subviews ?? []
        for (let i = 0; i < subviews.length; i++) {
            const sv = subviews[i]
            const idx: number = sv?._UIViewIndex ?? -i
            UILayoutDebugger._pendingSubviewsBefore.set(idx, UILayoutDebugger._captureFrame(sv))
        }
    }
    
    /**
     * Called immediately after view.layoutIfNeeded(). Closes the pending step
     * with the post-layout frame.
     */
    static didLayoutView(view: any) {
        if (!UILayoutDebugger._isEnabled) { return }
        
        const step = UILayoutDebugger._pendingStep
        if (!step) { return }
        
        step.frameAfter = UILayoutDebugger._captureFrame(view)
        step.cacheAfter = UILayoutDebugger._captureCache(view)
        
        const viewIdx: number = view?._UIViewIndex ?? -1
        const prev = UILayoutDebugger._layoutCountsThisPass.get(viewIdx) ?? 0
        UILayoutDebugger._layoutCountsThisPass.set(viewIdx, prev + 1)
        
        UILayoutDebugger._currentTrace?.steps.push(step)
        UILayoutDebugger._pendingStep = null
    }
    
    static didFinishLayoutPass(iterationCount: number) {
        if (!UILayoutDebugger._isEnabled) { return }
        
        const trace = UILayoutDebugger._currentTrace
        if (!trace) { return }
        
        trace.totalIterations = iterationCount
        
        // Build a single full-tree snapshot by starting from the global root.
        // Any laid-out view has a .rootView property that walks to the top of
        // the hierarchy, giving full context around the affected views.
        const anyView = UILayoutDebugger._liveViewRegistry.values().next().value
        const rootView = anyView?.rootView
        if (rootView) {
            UILayoutDebugger._lastKnownRootView = rootView
            const visited = new Set<number>()
            const rootIdx: number = rootView._UIViewIndex ?? -1
            if (rootIdx >= 0) { visited.add(rootIdx) }
            trace.roots = [UILayoutDebugger._buildTreeSnapshot(rootView, 0, visited)]
        }
        
        // Prepend and evict old traces.
        UILayoutDebugger._traces.unshift(trace)
        if (UILayoutDebugger._traces.length > UILayoutDebugger.maxStoredTraces) {
            UILayoutDebugger._traces.length = UILayoutDebugger.maxStoredTraces
        }
        
        UILayoutDebugger._replayTraceIndex = 0
        UILayoutDebugger._replayStepIndex = -1
        UILayoutDebugger._currentTrace = null
        UILayoutDebugger._liveViewRegistry.clear()
        
        UILayoutDebugger._renderOverlay()
    }
    
    /** Discard all recorded traces and reset the replay state. */
    static clearTraces() {
        UILayoutDebugger._traces = []
        UILayoutDebugger._passIndex = 0
        UILayoutDebugger._replayTraceIndex = 0
        UILayoutDebugger._compareTraceIndex = 1
        UILayoutDebugger._replayStepIndex = -1
        UILayoutDebugger._compareStepIndex = -1
        UILayoutDebugger._renderOverlay()
    }
    
    // ── Baseline / diff API ──────────────────────────────────────────────────
    
    /** Capture the current view tree state as the baseline for future diffs. */
    static captureBaseline() {
        if (!UILayoutDebugger._isEnabled) { return }
        const snap = UILayoutDebugger._captureStateSnapshot("Baseline")
        if (!snap) {
            console.warn("[UILayoutDebugger] captureBaseline: no root view found yet — trigger a layout pass first.")
            return
        }
        UILayoutDebugger._baseline = snap
        UILayoutDebugger._diffSnapshot = null
        UILayoutDebugger._diffMode = false
        UILayoutDebugger._renderOverlay()
        console.log(
            `%c[UILayoutDebugger] Baseline captured — ${snap.views.size} views.`,
            "color: #88ddff; font-weight: bold"
        )
    }
    
    /** Capture the current state and diff it against the baseline. */
    static captureAndDiff() {
        if (!UILayoutDebugger._isEnabled) { return }
        if (!UILayoutDebugger._baseline) {
            console.warn("[UILayoutDebugger] captureAndDiff: no baseline set. Call captureBaseline() first.")
            return
        }
        const snap = UILayoutDebugger._captureStateSnapshot("Current")
        if (!snap) {
            console.warn("[UILayoutDebugger] captureAndDiff: could not find root view.")
            return
        }
        UILayoutDebugger._diffSnapshot = snap
        UILayoutDebugger._diffMode = true
        UILayoutDebugger._renderOverlay()
    }
    
    static clearDiff() {
        UILayoutDebugger._baseline = null
        UILayoutDebugger._diffSnapshot = null
        UILayoutDebugger._diffMode = false
        UILayoutDebugger._renderOverlay()
    }
    
    /**
     * ☢  Stale Layout Report
     *
     * The single authoritative way to discover missing cache invalidations.
     *
     * What this does, in order:
     *   1. Snapshots every view's frame and intrinsic cache right now (the
     *      "before" state — potentially stale/incorrect).
     *   2. Calls performForcedSubtreeLayout() on the root view, which nukes all
     *      caches and forces a complete cold remeasure of the entire tree.
     *   3. Snapshots again ("after" state — ground truth).
     *   4. Diffs the two snapshots.  Any view that changed between before and
     *      after had stale state that was never correctly invalidated.
     *   5. For each changed view, cross-references the cache writes from the
     *      forced pass so you can see exactly which call path recomputed the
     *      correct value — working backwards from that to find the missing
     *      invalidation site.
     *
     * The result is shown in the ☢ Stale panel to the right of the pass
     * inspector.  Views corrected by the forced pass are also tinted amber in
     * the pass inspector tree on the subsequent pass.
     *
     * Limitations:
     *   - Calls performForcedSubtreeLayout(), which is itself a nuclear option.
     *     The tree will be left in its corrected state — not the buggy state.
     *     Use this at the point where the bug is visible, not before.
     *   - The forced layout will generate a new trace (the remeasure pass).
     *     The ☢ panel cross-references its cache writes automatically.
     *   - Only intrinsic-size cache corrections are cross-referenced. Frame
     *     corrections are shown as diffs but do not yet have a write-stack.
     */
    static captureStaleLayoutReport() {
        if (!UILayoutDebugger._isEnabled) { return }
        const rootView = UILayoutDebugger._lastKnownRootView
        if (!rootView) {
            console.warn(
                "[UILayoutDebugger] captureStaleLayoutReport: no root view found yet — " +
                "trigger a layout pass first."
            )
            return
        }
        
        // Step 1 — snapshot before.
        // We pin rootView here and pass it directly to a targeted walk rather than
        // going through _lastKnownRootView, because performForcedSubtreeLayout
        // drives layoutViewsIfNeeded synchronously, which fires didFinishLayoutPass,
        // which may update _lastKnownRootView to a detached view that was temporarily
        // inserted into document.body for intrinsic-size measurement.  If that
        // happened the "after" snapshot would walk from a completely different root
        // than "before", causing spurious diffs for every view in the real tree.
        const before = UILayoutDebugger._captureStateSnapshotFromRoot(rootView, "Before (potentially stale)")
        
        // Step 2 — nuclear reset
        rootView.performForcedSubtreeLayout?.()
        
        // Step 3 — snapshot after (ground truth), using the same pinned root.
        const after = UILayoutDebugger._captureStateSnapshotFromRoot(rootView, "After (forced cold remeasure)")
        
        // Step 4 — diff
        const diffs = UILayoutDebugger._diffSnapshots(before, after)
            .filter(d => d.kind !== "unchanged")
        
        // Step 5 — collect cache writes from the forced pass (the trace that was
        // just recorded by performForcedSubtreeLayout), keyed by viewIndex.
        const forcedPassCacheChanges = new Map<number, UILayoutDebugCacheChangeEvent[]>()
        const forcedTrace = UILayoutDebugger._traces[0] ?? null  // newest = the forced pass
        const forcedPassIndex = forcedTrace?.passIndex ?? -1
        if (forcedTrace) {
            for (const ev of forcedTrace.cacheChanges) {
                let bucket = forcedPassCacheChanges.get(ev.viewIndex)
                if (!bucket) {
                    bucket = []
                    forcedPassCacheChanges.set(ev.viewIndex, bucket)
                }
                bucket.push(ev)
            }
        }
        
        UILayoutDebugger._staleReportResult = { before, after, diffs, forcedPassCacheChanges, passIndex: forcedPassIndex }
        UILayoutDebugger._staleReportMode = true
        UILayoutDebugger._renderOverlay()
        
        const correctedCount = diffs.length
        console.log(
            `%c[UILayoutDebugger] Stale layout report: ${correctedCount} view(s) had stale state corrected by forced layout.`,
            "color: #ffaa55; font-weight: bold"
        )
    }
    
    static clearStaleReport() {
        UILayoutDebugger._staleReportResult = null
        UILayoutDebugger._staleReportMode = false
        UILayoutDebugger._renderOverlay()
    }
    
    static toggleLiveInspector() {
        UILayoutDebugger._liveInspectorMode = !UILayoutDebugger._liveInspectorMode
        UILayoutDebugger._renderOverlay()
    }
    
    static _captureStateSnapshot(label: string): UILayoutDebugStateSnapshot | null {
        const rootView = UILayoutDebugger._lastKnownRootView
        if (!rootView) { return null }
        return UILayoutDebugger._captureStateSnapshotFromRoot(rootView, label)
    }
    
    /**
     * Like _captureStateSnapshot but walks from an explicit root rather than
     * _lastKnownRootView. Use this whenever the root must be pinned across a
     * call that may update _lastKnownRootView (e.g. captureStaleLayoutReport,
     * which drives a layout pass internally).
     */
    static _captureStateSnapshotFromRoot(rootView: any, label: string): UILayoutDebugStateSnapshot {
        const views = new Map<number, UILayoutDebugViewState>()
        UILayoutDebugger._walkViewTree(rootView, views, new Set())
        
        // Read UITextMeasurement global cache sizes. Both maps are private, but
        // accessible via the class reference on window if exposed, or via the
        // module-level import. We reach them defensively so the debugger never
        // throws if the import shape changes.
        const tm: any = (window as any).UITextMeasurement
        const textMeasurement: UILayoutDebugTextMeasurementSnapshot = {
            preparedCacheSize: tm?._preparedCache?.size ?? -1,
            styleCacheSize:    tm?.globalStyleCache?.size ?? -1,
        }
        
        return { label, takenAt: Date.now(), views, textMeasurement }
    }
    
    static _walkViewTree(
        view: any,
        out: Map<number, UILayoutDebugViewState>,
        visited: Set<number>,
    ) {
        const idx: number = view?._UIViewIndex ?? -1
        if (idx < 0 || visited.has(idx)) { return }
        visited.add(idx)
        
        out.set(idx, {
            viewIndex: idx,
            className: view?.constructor?.name ?? "UnknownView",
            elementID: view?.elementID ?? String(idx),
            frame: UILayoutDebugger._captureFrame(view),
            cache: UILayoutDebugger._captureCache(view),
        })
        
        const subviews: any[] = view?.subviews ?? []
        for (const sv of subviews) { UILayoutDebugger._walkViewTree(sv, out, visited) }
    }
    
    static _diffSnapshots(
        baseline: UILayoutDebugStateSnapshot,
        current: UILayoutDebugStateSnapshot,
    ): UILayoutDebugViewDiff[] {
        const diffs: UILayoutDebugViewDiff[] = []
        const allKeys = new Set([...baseline.views.keys(), ...current.views.keys()])
        
        for (const idx of allKeys) {
            const b = baseline.views.get(idx) ?? null
            const c = current.views.get(idx) ?? null
            
            if (!b) {
                diffs.push({ kind: "appeared", viewIndex: idx,
                    className: c!.className, elementID: c!.elementID,
                    baselineFrame: null, currentFrame: c!.frame,
                    baselineCache: null, currentCache: c!.cache })
                continue
            }
            if (!c) {
                diffs.push({ kind: "disappeared", viewIndex: idx,
                    className: b.className, elementID: b.elementID,
                    baselineFrame: b.frame, currentFrame: null,
                    baselineCache: b.cache, currentCache: null })
                continue
            }
            
            const frameChanged = UILayoutDebugger._framesEqual(b.frame, c.frame) === false
            const cacheChanged = UILayoutDebugger._cachesEqual(b.cache, c.cache) === false
            const kind: UILayoutDebugDiffKind =
                frameChanged && cacheChanged ? "both"
                                             : frameChanged ? "frame"
                                                            : cacheChanged ? "cache"
                                                                           : "unchanged"
            
            diffs.push({ kind, viewIndex: idx,
                className: c.className, elementID: c.elementID,
                baselineFrame: b.frame, currentFrame: c.frame,
                baselineCache: b.cache, currentCache: c.cache })
        }
        
        // Sort: appeared, disappeared, both, frame, cache, unchanged
        const order: Record<UILayoutDebugDiffKind, number> = {
            appeared: 0, disappeared: 1, both: 2, frame: 3, cache: 4, unchanged: 5,
        }
        diffs.sort((a, b) => order[a.kind] - order[b.kind])
        return diffs
    }
    
    static _framesEqual(a: UILayoutDebugFrame | null, b: UILayoutDebugFrame | null): boolean {
        if (!a && !b) { return true }
        if (!a || !b) { return false }
        if (UILayoutDebugger._boundsBasedDiff) {
            // Bounds mode: ignore origin, compare size only.
            return a.width === b.width && a.height === b.height
        }
        return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height
    }
    
    static _cachesEqual(a: UILayoutDebugCacheSnapshot | null, b: UILayoutDebugCacheSnapshot | null): boolean {
        if (!a && !b) { return true }
        if (!a || !b) { return false }
        if (a.entryCount !== b.entryCount) { return false }
        for (const key of Object.keys(a.entries)) {
            const ae = a.entries[key]
            const be = b.entries[key]
            if (!be || ae.width !== be.width || ae.height !== be.height) { return false }
        }
        if (a.hasFrameCache !== b.hasFrameCache) { return false }
        if (a.hasFrameCache && b.hasFrameCache) {
            const af = a.frameCache, bf = b.frameCache
            if (!af || !bf || af.top !== bf.top || af.left !== bf.left || af.width !== bf.width || af.height !== bf.height) { return false }
        }
        if (a.hasVirtualFrameCache !== b.hasVirtualFrameCache) { return false }
        if (a.hasVirtualFrameCache && b.hasVirtualFrameCache) {
            const av = a.virtualFrameCache, bv = b.virtualFrameCache
            if (!av || !bv || av.top !== bv.top || av.left !== bv.left || av.width !== bv.width || av.height !== bv.height) { return false }
        }
        return true
    }
    
    
    // ── Hook: called from layoutSubviews() ───────────────────────────────────
    
    /**
     * Called at the top of layoutSubviews(), before the subview frame loop.
     * Nothing to do here — before-frames were already captured in willLayoutView().
     */
    static willSetSubviewFrames(_view: any) {
        // Reserved for future use; before-frames captured in willLayoutView().
    }
    
    /**
     * Called at the bottom of layoutSubviews(), after the subview frame loop.
     * Merges the before/after subview frames into the pending step.
     */
    static didSetSubviewFrames(view: any) {
        if (!UILayoutDebugger._isEnabled) { return }
        
        const step = UILayoutDebugger._pendingStep
        if (!step) { return }
        
        const subviews: any[] = view?.subviews ?? []
        for (let i = 0; i < subviews.length; i++) {
            const sv = subviews[i]
            const idx: number = sv?._UIViewIndex ?? -i
            const record: UILayoutDebugSubviewRecord = {
                viewIndex: idx,
                className: sv?.constructor?.name ?? "UnknownView",
                elementID: sv?.elementID ?? String(idx),
                frameBefore: UILayoutDebugger._pendingSubviewsBefore.get(idx) ?? null,
                frameAfter: UILayoutDebugger._captureFrame(sv),
            }
            step.subviewRecords.push(record)
        }
    }
    
    
    // ── Breakpoint sentinel ──────────────────────────────────────────────────
    
    /**
     * Returns true when breakpoints are enabled, causing the sentinel block
     * in UIView.ts to execute. Put a browser debugger breakpoint on the
     * `const breakpointOnThisLine` assignment inside that block.
     */
    static _shouldHitBreakpoint(_view: any): boolean {
        return UILayoutDebugger._isEnabled && UILayoutDebugger._breakpointsEnabled
    }
    
    
    // ── Internal helpers ─────────────────────────────────────────────────────
    
    static _cleanStack(rawStack: string): string {
        const lines = rawStack.split("\n")
        let firstAppFrameIndex = 1 // skip the "Error" header on line 0
        
        for (let i = 1; i < lines.length; i++) {
            const trimmed = lines[i].trim()
            
            // V8 frame: "at ClassName.methodName (file:line:col)"
            // or:       "at methodName (file:line:col)"
            // or:       "at file:line:col"
            // Extract just the function/method name for noise matching.
            const atMatch = trimmed.match(/^at\s+([\w.<>$\s]+?)\s*(?:\(|$)/)
            const frameName = atMatch ? atMatch[1].trim() : trimmed
            
            // The method name is the part after the last dot (if any).
            const methodName = frameName.includes(".")
                               ? frameName.slice(frameName.lastIndexOf(".") + 1)
                               : frameName
            
            const isNoise = UILayoutDebugger._noiseFramePrefixes.some(prefix => {
                // Match against the full qualified name OR just the method name,
                // so "setNeedsLayout" catches UITextField.setNeedsLayout too.
                return frameName === prefix || methodName === prefix || frameName.endsWith("." + prefix)
            })
            
            if (!isNoise) {
                firstAppFrameIndex = i
                break
            }
        }
        return lines.slice(firstAppFrameIndex).join("\n")
    }
    
    static _extractCallerFunctionName(cleanStack: string): string {
        const firstLine = cleanStack.split("\n")[0]?.trim() ?? ""
        // V8: "at ClassName.methodName (file:line:col)"
        const atMatch = firstLine.match(/^at\s+([\w.<>$\s]+?)\s*(?:\(|$)/)
        if (atMatch) { return atMatch[1].trim() }
        return firstLine.substring(0, 80) || "(unknown)"
    }
    
    static _captureFrame(view: any): UILayoutDebugFrame | null {
        const f = view?._frame
        if (!f) { return null }
        return {
            top: f.top ?? f.y ?? 0,
            left: f.left ?? f.x ?? 0,
            width: f.width ?? 0,
            height: f.height ?? 0,
        }
    }
    
    static _captureCache(view: any): UILayoutDebugCacheSnapshot | null {
        if (!view) { return null }
        const sharedKey: string | undefined = view.sharedIntrinsicSizeCacheIdentifier
        const isShared = !!sharedKey
        let rawEntries: Record<string, any>
        if (isShared) {
            rawEntries = (view.constructor?._sharedIntrinsicSizeCaches ?? view.__proto__?.constructor?._sharedIntrinsicSizeCaches)
                ?.get(sharedKey) ?? {}
        }
        else {
            rawEntries = view._intrinsicSizesCache ?? {}
        }
        const entries: Record<string, { width: number; height: number }> = {}
        for (const key of Object.keys(rawEntries)) {
            const r = rawEntries[key]
            entries[key] = { width: r?.width ?? 0, height: r?.height ?? 0 }
        }
        
        // Frame caches — these are per-instance UIRectangle | undefined fields.
        const rawFrameCache = view._frameCache
        const rawVirtualFrameCache = view._frameCacheForVirtualLayouting
        const frameCache: UILayoutDebugFrame | null = rawFrameCache
                                                      ? { top: rawFrameCache.top ?? rawFrameCache.y ?? 0, left: rawFrameCache.left ?? rawFrameCache.x ?? 0, width: rawFrameCache.width ?? 0, height: rawFrameCache.height ?? 0 }
                                                      : null
        const virtualFrameCache: UILayoutDebugFrame | null = rawVirtualFrameCache
                                                             ? { top: rawVirtualFrameCache.top ?? rawVirtualFrameCache.y ?? 0, left: rawVirtualFrameCache.left ?? rawVirtualFrameCache.x ?? 0, width: rawVirtualFrameCache.width ?? 0, height: rawVirtualFrameCache.height ?? 0 }
                                                             : null
        
        return {
            entryCount: Object.keys(entries).length,
            entries,
            isShared,
            sharedKey,
            hasFrameCache: rawFrameCache !== undefined,
            frameCache,
            hasVirtualFrameCache: rawVirtualFrameCache !== undefined,
            virtualFrameCache,
        }
    }
    
    static _buildTreeSnapshot(
        view: any,
        depth: number,
        visited: Set<number> = new Set(),
    ): UILayoutDebugTreeNode {
        const idx: number = view?._UIViewIndex ?? -1
        const node: UILayoutDebugTreeNode = {
            viewIndex: idx,
            className: view?.constructor?.name ?? "UnknownView",
            elementID: view?.elementID ?? String(idx),
            depth,
            frame: UILayoutDebugger._captureFrame(view),
            layoutCount: UILayoutDebugger._layoutCountsThisPass.get(idx) ?? 0,
            cacheAfterPass: UILayoutDebugger._captureCache(view),
            children: [],
        }
        const subviews: any[] = view?.subviews ?? []
        for (let i = 0; i < subviews.length; i++) {
            const sv = subviews[i]
            const svIdx: number = sv?._UIViewIndex ?? -1
            if (svIdx < 0 || visited.has(svIdx)) { continue }
            visited.add(svIdx)
            node.children.push(UILayoutDebugger._buildTreeSnapshot(sv, depth + 1, visited))
        }
        return node
    }
    
    
    // ── Baseline / diff state ─────────────────────────────────────────────────
    
    static _baseline: UILayoutDebugStateSnapshot | null = null
    static _diffSnapshot: UILayoutDebugStateSnapshot | null = null
    static _diffMode: boolean = false
    static _liveInspectorMode: boolean = false
    
    // ── Stale layout report state ─────────────────────────────────────────────
    
    /** Result of the last captureStaleLayoutReport() run. */
    static _staleReportResult: {
        before: UILayoutDebugStateSnapshot
        after: UILayoutDebugStateSnapshot
        diffs: UILayoutDebugViewDiff[]
        /** viewIndex → cacheChanges from the forced-layout pass, for cross-referencing */
        forcedPassCacheChanges: Map<number, UILayoutDebugCacheChangeEvent[]>
        passIndex: number
    } | null = null
    
    /** Whether the stale report side-panel is open. */
    static _staleReportMode: boolean = false
    
    // Persists across passes so captureBaseline() works between passes.
    static _lastKnownRootView: any = null
    
    /**
     * Finds the first trace (chronologically) recorded after baselineTakenAt
     * that contains a step for the given viewIndex. Returns {traceIndex, stepIndex}
     * into _traces, or null if none found.
     */
    static _findCausingTrace(
        viewIndex: number,
        baselineTakenAt: number,
    ): { traceIndex: number; stepIndex: number; passIndex: number } | null {
        // _traces is newest-first, so iterate in reverse for chronological order
        for (let ti = UILayoutDebugger._traces.length - 1; ti >= 0; ti--) {
            const trace = UILayoutDebugger._traces[ti]
            // We don't store a timestamp on traces, but passIndex is monotonically
            // increasing. The baseline was taken at a wall-clock time; the closest
            // proxy is to find traces whose passIndex is greater than any pass that
            // completed before the baseline. Since we can't correlate exactly, we
            // just find the first trace (oldest) that touched the view and show it.
            const si = trace.steps.findIndex(s => s.viewIndex === viewIndex)
            if (si >= 0) {
                return { traceIndex: ti, stepIndex: si, passIndex: trace.passIndex }
            }
        }
        return null
    }
    
    // ── Overlay UI ───────────────────────────────────────────────────────────
    
    static _overlayRoot: HTMLElement | null = null
    static _overlayVisible: boolean = true
    static _helpMode: boolean = false
    
    static _ensureOverlay() {
        if (UILayoutDebugger._overlayRoot) { return }
        
        const root = document.createElement("div")
        root.id = "__UILayoutDebugger_overlay"
        root.style.cssText = [
            "position: fixed",
            "top: 8px",
            "right: 8px",
            "max-height: calc(100vh - 16px)",
            "background: rgba(15, 15, 20, 0.96)",
            "color: #e8e8e8",
            "font: 11px/1.4 'SF Mono', 'Menlo', 'Consolas', monospace",
            "border-radius: 8px",
            "border: 1px solid rgba(255,255,255,0.12)",
            "box-shadow: 0 8px 32px rgba(0,0,0,0.6)",
            "z-index: 2147483647",
            "display: flex",
            "flex-direction: column",
            "overflow: hidden",
            "user-select: none",
        ].join("; ")
        
        document.body.appendChild(root)
        UILayoutDebugger._overlayRoot = root
        UILayoutDebugger._makeDraggable(root)
    }
    
    static _removeOverlay() {
        UILayoutDebugger._overlayRoot?.remove()
        UILayoutDebugger._overlayRoot = null
    }
    
    static _renderOverlay() {
        const root = UILayoutDebugger._overlayRoot
        if (!root) { return }
        
        const cmp = UILayoutDebugger._compareMode
        const diff = UILayoutDebugger._diffMode && !!UILayoutDebugger._baseline && !!UILayoutDebugger._diffSnapshot
        const live = UILayoutDebugger._liveInspectorMode && !!UILayoutDebugger._lastKnownRootView
        const stale = UILayoutDebugger._staleReportMode && !!UILayoutDebugger._staleReportResult
        const passWidth = cmp ? 1140 : 570
        const extraWidth = (diff ? 320 : 0) + (live ? 320 : 0) + (stale ? 360 : 0)
        root.style.width = (passWidth + extraWidth) + "px"
        root.innerHTML = ""
        
        // ── Header ──────────────────────────────────────────────────────────
        // ── Header row 1: title + core controls ─────────────────────────────
        const headerRow1 = UILayoutDebugger._el("div", [
            "padding: 8px 10px 5px",
            "background: rgba(255,255,255,0.05)",
            "display: flex",
            "align-items: center",
            "gap: 6px",
            "cursor: move",
            "flex-shrink: 0",
        ])
        headerRow1.dataset.dragHandle = "1"
        
        const title = UILayoutDebugger._el("span", ["flex: 1", "font-weight: bold", "font-size: 11px", "color: #c8d8ff"])
        title.textContent = "⚙ UILayoutDebugger"
        
        const helpBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle(
            UILayoutDebugger._helpMode ? "#ffcc88" : "#9090a8"
        ))
        helpBtn.textContent = "ⓘ"
        helpBtn.title = "Show help"
        helpBtn.onclick = () => {
            UILayoutDebugger._helpMode = !UILayoutDebugger._helpMode
            UILayoutDebugger._renderOverlay()
        }
        
        const bpBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle(
            UILayoutDebugger._breakpointsEnabled ? "#ffaa33" : "#9090a8"
        ))
        bpBtn.textContent = UILayoutDebugger._breakpointsEnabled ? "⏸ BP ON" : "⏸ BP OFF"
        bpBtn.title = "Toggle breakpoint step-through"
        bpBtn.onclick = () => {
            UILayoutDebugger._breakpointsEnabled
            ? UILayoutDebugger.disableBreakpoints()
            : UILayoutDebugger.enableBreakpoints()
            UILayoutDebugger._renderOverlay()
        }
        
        const cmpBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle(cmp ? "#7bc8ff" : "#9090a8"))
        cmpBtn.textContent = cmp ? "⧉ Compare ON" : "⧉ Compare"
        cmpBtn.title = "Toggle side-by-side pass comparison"
        cmpBtn.onclick = () => {
            UILayoutDebugger._compareMode = !UILayoutDebugger._compareMode
            if (UILayoutDebugger._compareMode) {
                UILayoutDebugger._compareTraceIndex = Math.min(1, UILayoutDebugger._traces.length - 1)
                UILayoutDebugger._compareStepIndex = -1
                UILayoutDebugger._sharedExpandState = new Map()
            }
            UILayoutDebugger._renderOverlay()
        }
        
        const filterLabels: Record<string, string> = {
            all:       "⊘ All",
            changed:   "⊘ Changed",
            unchanged: "⊘ Unchanged",
        }
        const filterColors: Record<string, string> = {
            all:       "#9090a8",
            changed:   "#7bc8ff",
            unchanged: "#ffcc88",
        }
        const filterCycle: Record<string, "all" | "changed" | "unchanged"> = {
            all: "changed", changed: "unchanged", unchanged: "all",
        }
        const filterBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle(
            filterColors[UILayoutDebugger._frameFilter]
        ))
        filterBtn.textContent = filterLabels[UILayoutDebugger._frameFilter]
        filterBtn.title = "Cycle: show all steps → only changed frames → only unchanged frames"
        filterBtn.onclick = () => {
            UILayoutDebugger._frameFilter = filterCycle[UILayoutDebugger._frameFilter]
            UILayoutDebugger._replayStepIndex = -1
            UILayoutDebugger._compareStepIndex = -1
            UILayoutDebugger._renderOverlay()
        }
        
        const clearBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle("#9090a8"))
        clearBtn.textContent = "⌫ Clear"
        clearBtn.title = "Clear all recorded traces and restart recording"
        clearBtn.onclick = () => UILayoutDebugger.clearTraces()
        
        const toggleBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle("#9090a8"))
        toggleBtn.textContent = UILayoutDebugger._overlayVisible ? "▾" : "▸"
        toggleBtn.title = "Collapse / expand"
        toggleBtn.onclick = () => {
            UILayoutDebugger._overlayVisible = !UILayoutDebugger._overlayVisible
            UILayoutDebugger._renderOverlay()
        }
        
        const closeBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle("#dd5555"))
        closeBtn.textContent = "✕"
        closeBtn.title = "Disable UILayoutDebugger"
        closeBtn.onclick = () => UILayoutDebugger.disable()
        
        headerRow1.append(title, helpBtn, bpBtn, cmpBtn, filterBtn, clearBtn, toggleBtn, closeBtn)
        
        // ── Header row 2: baseline / diff and future feature buttons ─────────
        const headerRow2 = UILayoutDebugger._el("div", [
            "padding: 4px 10px 6px",
            "background: rgba(255,255,255,0.05)",
            "border-bottom: 1px solid rgba(255,255,255,0.10)",
            "display: flex",
            "align-items: center",
            "gap: 6px",
            "flex-shrink: 0",
            "flex-wrap: wrap",
        ])
        headerRow2.dataset.dragHandle = "1"
        
        const hasBaseline = !!UILayoutDebugger._baseline
        const baselineBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle(
            UILayoutDebugger._diffMode ? "#88ddff" : hasBaseline ? "#ffcc88" : "#9090a8"
        ))
        baselineBtn.textContent = UILayoutDebugger._diffMode
                                  ? "⊕ Diff ON"
                                  : hasBaseline ? "📍 Baseline set" : "📍 Baseline"
        baselineBtn.title = hasBaseline
                            ? "Baseline captured — click to recapture, or use ⊕ to diff against it"
                            : "Capture current view tree state as baseline"
        baselineBtn.onclick = () => {
            if (UILayoutDebugger._diffMode) {
                UILayoutDebugger.clearDiff()
            } else {
                UILayoutDebugger.captureBaseline()
            }
        }
        
        const diffBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle(
            hasBaseline ? "#88ff99" : "#9090a8"
        )) as HTMLButtonElement
        diffBtn.textContent = "⊕ Diff"
        diffBtn.title = "Capture current state and diff against baseline"
        diffBtn.disabled = !hasBaseline
        diffBtn.onclick = () => UILayoutDebugger.captureAndDiff()
        
        const liveBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle(
            live ? "#88ff99" : "#9090a8"
        ))
        liveBtn.textContent = live ? "👁 Live ON" : "👁 Live"
        liveBtn.title = "Show live view tree with current frames and cache state"
        liveBtn.onclick = () => UILayoutDebugger.toggleLiveInspector()
        
        const hasStaleResult = !!UILayoutDebugger._staleReportResult
        const staleBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle(
            stale ? "#ffaa55" : hasStaleResult ? "#a06030" : "#9090a8"
        ))
        staleBtn.textContent = stale ? "☢ Stale ON" : "☢ Stale"
        staleBtn.title = hasStaleResult
                         ? "Stale layout report available — click to toggle the panel, or re-run to refresh"
                         : "Run a forced full-tree remeasure and show which views had stale/missing invalidations"
        staleBtn.onclick = () => {
            if (stale) {
                // Panel already open — toggle it off
                UILayoutDebugger._staleReportMode = false
                UILayoutDebugger._renderOverlay()
            }
            else if (hasStaleResult) {
                // Result exists but panel is closed — reopen it
                UILayoutDebugger._staleReportMode = true
                UILayoutDebugger._renderOverlay()
            }
            else {
                UILayoutDebugger.captureStaleLayoutReport()
            }
        }
        
        // Long-press / right-click to re-run even when a result already exists
        staleBtn.oncontextmenu = (e) => {
            e.preventDefault()
            UILayoutDebugger.captureStaleLayoutReport()
        }
        
        const boundsToggleBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle(
            UILayoutDebugger._boundsBasedDiff ? "#c8d8ff" : "#9090a8"
        ))
        boundsToggleBtn.textContent = UILayoutDebugger._boundsBasedDiff ? "⬚ Bounds" : "⬚ Frame"
        boundsToggleBtn.title = UILayoutDebugger._boundsBasedDiff
                                ? "Diffing by bounds (size only — origin ignored). Click to switch to frame diffing (position + size)."
                                : "Diffing by frame (position + size). Click to switch to bounds diffing (size only — position changes are ignored)."
        boundsToggleBtn.onclick = () => {
            UILayoutDebugger._boundsBasedDiff = !UILayoutDebugger._boundsBasedDiff
            UILayoutDebugger._renderOverlay()
        }
        
        headerRow2.append(baselineBtn, diffBtn, liveBtn, staleBtn, boundsToggleBtn)
        
        // ── Wrap both rows in the header container ────────────────────────────
        const header = UILayoutDebugger._el("div", ["flex-shrink: 0"])
        header.append(headerRow1, headerRow2)
        root.appendChild(header)
        
        if (!UILayoutDebugger._overlayVisible) { return }
        
        // ── Help panel ───────────────────────────────────────────────────────
        if (UILayoutDebugger._helpMode) {
            root.appendChild(UILayoutDebugger._renderHelpPanel())
            return
        }
        
        // ── Baseline captured but no diff yet ────────────────────────────────
        if (UILayoutDebugger._baseline && !diff) {
            const msg = UILayoutDebugger._el("div", [
                "padding: 8px 12px",
                "color: #ffcc88",
                "font-size: 10px",
                "border-bottom: 1px solid rgba(255,255,255,0.08)",
                "flex-shrink: 0",
            ])
            const ts = new Date(UILayoutDebugger._baseline.takenAt)
            msg.textContent = `📍 Baseline set at ${ts.toLocaleTimeString()} — ${UILayoutDebugger._baseline.views.size} views. Hit ⊕ Diff to compare.`
            root.appendChild(msg)
        }
        
        if (UILayoutDebugger._traces.length === 0 && !diff) {
            const msg = UILayoutDebugger._el("div", ["padding: 10px 12px", "color: #9090a8", "font-size: 10px"])
            msg.textContent = "No layout pass recorded yet. Trigger a layout to begin."
            root.appendChild(msg)
            return
        }
        
        // ── Main body: pass inspector + optional diff panel ──────────────────
        const body = UILayoutDebugger._el("div", [
            "display: flex",
            "flex: 1",
            "overflow: hidden",
            "min-height: 0",
        ])
        root.appendChild(body)
        
        // ── Pass inspector (single or compare columns) ────────────────────────
        if (UILayoutDebugger._traces.length > 0) {
            const passSection = UILayoutDebugger._el("div", [
                "display: flex",
                "flex: 1",
                "overflow: hidden",
                "min-height: 0",
            ])
            
            if (cmp) {
                let leftTreeEl: HTMLElement | null = null
                let rightTreeEl: HTMLElement | null = null
                
                const leftCol = UILayoutDebugger._renderPassColumn(
                    UILayoutDebugger._replayTraceIndex,
                    UILayoutDebugger._replayStepIndex,
                    (si) => { UILayoutDebugger._replayStepIndex = si; UILayoutDebugger._renderOverlay() },
                    (ti) => { UILayoutDebugger._replayTraceIndex = ti; UILayoutDebugger._replayStepIndex = -1; UILayoutDebugger._renderOverlay() },
                    UILayoutDebugger._sharedExpandState,
                    (el) => { leftTreeEl = el },
                    () => rightTreeEl,
                )
                const colDivider = UILayoutDebugger._el("div", [
                    "width: 1px", "background: rgba(255,255,255,0.10)", "flex-shrink: 0",
                ])
                const rightCol = UILayoutDebugger._renderPassColumn(
                    UILayoutDebugger._compareTraceIndex,
                    UILayoutDebugger._compareStepIndex,
                    (si) => { UILayoutDebugger._compareStepIndex = si; UILayoutDebugger._renderOverlay() },
                    (ti) => { UILayoutDebugger._compareTraceIndex = ti; UILayoutDebugger._compareStepIndex = -1; UILayoutDebugger._renderOverlay() },
                    UILayoutDebugger._sharedExpandState,
                    (el) => { rightTreeEl = el },
                    () => leftTreeEl,
                )
                passSection.append(leftCol, colDivider, rightCol)
            }
            else {
                const col = UILayoutDebugger._renderPassColumn(
                    UILayoutDebugger._replayTraceIndex,
                    UILayoutDebugger._replayStepIndex,
                    (si) => { UILayoutDebugger._replayStepIndex = si; UILayoutDebugger._renderOverlay() },
                    (ti) => { UILayoutDebugger._replayTraceIndex = ti; UILayoutDebugger._replayStepIndex = -1; UILayoutDebugger._renderOverlay() },
                    UILayoutDebugger._singleExpandState,
                    () => {},
                    () => null,
                )
                col.style.flex = "1"
                passSection.appendChild(col)
            }
            
            body.appendChild(passSection)
        }
        
        // ── Diff panel ────────────────────────────────────────────────────────
        if (diff) {
            const divider = UILayoutDebugger._el("div", [
                "width: 1px", "background: rgba(255,255,255,0.10)", "flex-shrink: 0",
            ])
            const diffPanel = UILayoutDebugger._renderDiffPanel(
                UILayoutDebugger._baseline!,
                UILayoutDebugger._diffSnapshot!,
                (viewIndex) => {
                    for (let ti = 0; ti < UILayoutDebugger._traces.length; ti++) {
                        const trace = UILayoutDebugger._traces[ti]
                        const si = trace.steps.findIndex(s => s.viewIndex === viewIndex)
                        if (si >= 0) {
                            UILayoutDebugger._replayTraceIndex = ti
                            UILayoutDebugger._replayStepIndex = si
                            UILayoutDebugger._renderOverlay()
                            return
                        }
                    }
                },
                UILayoutDebugger._baseline!.takenAt,
            )
            diffPanel.style.width = "320px"
            diffPanel.style.flexShrink = "0"
            body.append(divider, diffPanel)
        }
        
        // ── Live inspector panel ──────────────────────────────────────────────
        if (live) {
            const divider = UILayoutDebugger._el("div", [
                "width: 1px", "background: rgba(255,255,255,0.10)", "flex-shrink: 0",
            ])
            const livePanel = UILayoutDebugger._renderLiveInspectorPanel()
            livePanel.style.width = "320px"
            livePanel.style.flexShrink = "0"
            body.append(divider, livePanel)
        }
        
        // ── Stale layout report panel ─────────────────────────────────────────
        if (stale) {
            const divider = UILayoutDebugger._el("div", [
                "width: 1px", "background: rgba(255,255,255,0.10)", "flex-shrink: 0",
            ])
            const stalePanel = UILayoutDebugger._renderStaleReportPanel(UILayoutDebugger._staleReportResult!)
            stalePanel.style.width = "360px"
            stalePanel.style.flexShrink = "0"
            body.append(divider, stalePanel)
        }
    }
    
    static _renderPassColumn(
        traceIndex: number,
        stepIndex: number,
        onStepChange: (si: number) => void,
        onTraceChange: (ti: number) => void,
        expandState: Map<number, boolean> | null,
        registerTree: (el: HTMLElement) => void,
        getPeerTree: () => HTMLElement | null,
    ): HTMLElement {
        const col = UILayoutDebugger._el("div", [
            "display: flex",
            "flex-direction: column",
            "flex: 1",
            "min-width: 0",
            "overflow: hidden",
        ])
        
        const trace = UILayoutDebugger._traces[traceIndex] ?? null
        
        // ── Trace picker ─────────────────────────────────────────────────────
        const pickerRow = UILayoutDebugger._el("div", [
            "padding: 5px 10px",
            "border-bottom: 1px solid rgba(255,255,255,0.08)",
            "display: flex",
            "align-items: center",
            "gap: 6px",
            "flex-shrink: 0",
            "font-size: 10px",
        ])
        const pickerLabel = UILayoutDebugger._el("span", ["color: #a0a0b8", "flex-shrink: 0"])
        pickerLabel.textContent = "Pass:"
        
        const sel = document.createElement("select")
        sel.style.cssText = [
            "flex: 1",
            "background: #1e1e2e",
            "color: #d8d8f0",
            "border: 1px solid #444",
            "border-radius: 3px",
            "font: inherit",
            "padding: 1px 4px",
        ].join("; ")
        
        for (let i = 0; i < UILayoutDebugger._traces.length; i++) {
            const t = UILayoutDebugger._traces[i]
            const opt = document.createElement("option")
            opt.value = String(i)
            opt.textContent = `#${t.passIndex}  (${t.steps.length} steps, ${t.totalIterations} iter)`
            if (i === traceIndex) { opt.selected = true }
            sel.appendChild(opt)
        }
        sel.onchange = () => onTraceChange(parseInt(sel.value, 10))
        pickerRow.append(pickerLabel, sel)
        col.appendChild(pickerRow)
        
        if (!trace) { return col }
        
        // Apply frame filter to produce the visible step list.
        const frameFilter = UILayoutDebugger._frameFilter
        const visibleSteps = frameFilter === "all"
                             ? trace.steps
                             : trace.steps.filter(s => {
                const f = s.frameBefore
                const g = s.frameAfter
                const changed = !f || !g
                    || f.left !== g.left || f.top !== g.top
                    || f.width !== g.width || f.height !== g.height
                return frameFilter === "changed" ? changed : !changed
            })
        
        const clampedStep = Math.max(-1, Math.min(stepIndex, visibleSteps.length - 1))
        const activeStep = visibleSteps[clampedStep] ?? null
        const activeViewIndex = activeStep?.viewIndex ?? -1
        
        // countMap still uses all steps for heat colouring (unfiltered).
        // stepMap stores the last step per viewIndex for frame/cache delta display.
        const countMap = new Map<number, number>()
        const stepMap = new Map<number, UILayoutDebugStep>()
        for (const step of trace.steps) {
            countMap.set(step.viewIndex, (countMap.get(step.viewIndex) ?? 0) + 1)
            stepMap.set(step.viewIndex, step)
        }
        
        // ── Step controls ─────────────────────────────────────────────────────
        const stepBar = UILayoutDebugger._el("div", [
            "padding: 5px 10px",
            "border-bottom: 1px solid rgba(255,255,255,0.08)",
            "display: flex",
            "align-items: center",
            "gap: 6px",
            "flex-shrink: 0",
        ])
        
        const backBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle("#59599b")) as HTMLButtonElement
        backBtn.textContent = "◀"
        backBtn.title = "Step back"
        backBtn.disabled = clampedStep <= -1
        backBtn.onclick = () => onStepChange(Math.max(clampedStep - 1, -1))
        
        const fwdBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle("#59599b")) as HTMLButtonElement
        fwdBtn.textContent = "▶"
        fwdBtn.title = "Step forward"
        fwdBtn.disabled = clampedStep >= visibleSteps.length - 1
        fwdBtn.onclick = () => onStepChange(Math.min(clampedStep + 1, visibleSteps.length - 1))
        
        const slider = document.createElement("input")
        slider.type = "range"
        slider.min = "-1"
        slider.max = String(visibleSteps.length - 1)
        slider.value = String(clampedStep)
        slider.style.cssText = "flex: 1; cursor: pointer; accent-color: #59599b;"
        slider.oninput = () => onStepChange(parseInt(slider.value, 10))
        
        const stepLabel = UILayoutDebugger._el("span", ["color: #b0b0c8", "font-size: 10px", "white-space: nowrap"])
        const totalLabel = frameFilter === "all"
                           ? String(visibleSteps.length)
                           : `${visibleSteps.length}/${trace.steps.length}`
        stepLabel.textContent = clampedStep < 0
                                ? `— / ${totalLabel}`
                                : `${clampedStep + 1} / ${totalLabel}`
        
        stepBar.append(backBtn, slider, fwdBtn, stepLabel)
        col.appendChild(stepBar)
        
        // ── Active step detail ────────────────────────────────────────────────
        if (activeStep) {
            col.appendChild(UILayoutDebugger._renderStepDetail(activeStep))
        }
        
        // ── View tree ─────────────────────────────────────────────────────────
        const treeContainer = UILayoutDebugger._el("div", [
            "overflow-y: scroll",
            "flex: 1",
            "padding: 4px 0",
            "min-height: 0",
            "position: relative",
        ])
        registerTree(treeContainer)
        
        treeContainer.addEventListener("scroll", () => {
            const peer = getPeerTree()
            if (peer && peer.scrollTop !== treeContainer.scrollTop) {
                peer.scrollTop = treeContainer.scrollTop
            }
        })
        
        if (trace.roots.length > 0) {
            let activeRow: HTMLElement | null = null
            for (const treeRoot of trace.roots) {
                const result = UILayoutDebugger._renderTreeNode(
                    treeRoot, treeContainer, countMap, activeViewIndex, expandState, stepMap
                )
                if (result) { activeRow = result }
            }
            // Scroll the active row into view after the DOM is fully built.
            // Use a 0ms timeout so the browser has laid out the container first.
            if (activeRow) {
                const rowRef = activeRow
                const containerRef = treeContainer
                setTimeout(() => {
                    const rowTop = rowRef.offsetTop
                    const rowBottom = rowTop + rowRef.offsetHeight
                    const visTop = containerRef.scrollTop
                    const visBottom = visTop + containerRef.clientHeight
                    if (rowTop < visTop || rowBottom > visBottom) {
                        containerRef.scrollTop = rowTop - containerRef.clientHeight / 2
                    }
                }, 0)
            }
        }
        else {
            const msg = UILayoutDebugger._el("div", ["padding: 8px 10px", "color: #6a6a80"])
            msg.textContent = "No steps recorded in this pass."
            treeContainer.appendChild(msg)
        }
        
        col.appendChild(treeContainer)
        
        // ── Cache change events ───────────────────────────────────────────────
        if (trace.cacheChanges.length > 0) {
            let cacheListExpanded = false
            
            const cacheHeader = UILayoutDebugger._el("div", [
                "padding: 5px 10px",
                "border-top: 1px solid rgba(255,255,255,0.08)",
                "display: flex",
                "align-items: center",
                "gap: 5px",
                "flex-shrink: 0",
                "cursor: pointer",
                "font-size: 10px",
            ])
            
            const cacheChevron = UILayoutDebugger._el("span", ["color: #7070a0", "font-size: 8px", "width: 10px"])
            cacheChevron.textContent = "▸"
            
            const cacheTitle = UILayoutDebugger._el("span", ["color: #a0a0b8"])
            cacheTitle.textContent = `Cache writes (${trace.cacheChanges.length})`
            
            cacheHeader.append(cacheChevron, cacheTitle)
            col.appendChild(cacheHeader)
            
            const cacheList = UILayoutDebugger._el("div", [
                "display: none",
                "overflow-y: auto",
                "max-height: 180px",
                "flex-shrink: 0",
                "font-size: 10px",
                "padding: 2px 0",
            ])
            
            for (const ev of trace.cacheChanges) {
                const evRow = UILayoutDebugger._el("div", [
                    "padding: 2px 10px 2px 14px",
                    "display: flex",
                    "flex-direction: column",
                    "gap: 1px",
                    "border-bottom: 1px solid rgba(255,255,255,0.04)",
                ])
                
                const topLine = UILayoutDebugger._el("div", ["display: flex", "gap: 5px", "align-items: baseline"])
                
                const evIdx = UILayoutDebugger._el("span", ["color: #5a5a70", "flex-shrink: 0"])
                evIdx.textContent = `#${ev.eventIndex}`
                
                const evClass = UILayoutDebugger._el("span", ["color: #ffcc88", "font-weight: bold"])
                evClass.textContent = ev.className
                
                const evEid = UILayoutDebugger._el("span", ["color: #6a6a80"])
                evEid.textContent = `#${ev.elementID}`
                
                const evKey = UILayoutDebugger._el("span", ["color: #9090a8"])
                const match = ev.cacheKey.match(/h_(\d+(?:\.\d+)?)__w_(\d+(?:\.\d+)?)/)
                evKey.textContent = match
                                    ? (match[1] !== "0" && match[2] !== "0"
                                       ? `h≤${match[1]} w≤${match[2]}`
                                       : match[2] !== "0" ? `w≤${match[2]}` : `h≤${match[1]}`)
                                    : ev.cacheKey
                
                const evVal = UILayoutDebugger._el("span", ["color: #88ddff", "margin-left: auto"])
                evVal.textContent = `${ev.newValue.width.toFixed(0)}×${ev.newValue.height.toFixed(0)}`
                
                topLine.append(evIdx, evClass, evEid, evKey, evVal)
                
                const callerLine = UILayoutDebugger._el("div", [
                    "display: flex", "gap: 5px", "align-items: baseline",
                ])
                const stepRef = UILayoutDebugger._el("span", ["color: #5a5a70", "flex-shrink: 0"])
                stepRef.textContent = ev.stepIndex >= 0 ? `step ${ev.stepIndex}` : "between steps"
                
                const callerFn = UILayoutDebugger._el("span", ["color: #7878a0", "cursor: pointer"])
                callerFn.textContent = ev.callerFunction + "()"
                callerFn.title = ev.cleanStack
                
                let stackExpanded = false
                const stackEl = UILayoutDebugger._el("div", [
                    "display: none",
                    "margin-top: 2px",
                    "padding: 3px 6px",
                    "background: rgba(255,255,255,0.04)",
                    "border-radius: 3px",
                    "color: #6060808",
                    "font-size: 9px",
                    "white-space: pre",
                    "overflow-x: auto",
                ])
                stackEl.textContent = ev.cleanStack
                callerFn.onclick = () => {
                    stackExpanded = !stackExpanded
                    stackEl.style.display = stackExpanded ? "block" : "none"
                }
                
                callerLine.append(stepRef, callerFn)
                evRow.append(topLine, callerLine, stackEl)
                cacheList.appendChild(evRow)
            }
            
            cacheHeader.onclick = () => {
                cacheListExpanded = !cacheListExpanded
                cacheList.style.display = cacheListExpanded ? "block" : "none"
                cacheChevron.textContent = cacheListExpanded ? "▾" : "▸"
            }
            
            col.appendChild(cacheList)
        }
        
        return col
    }
    
    static _renderStaleReportPanel(result: NonNullable<typeof UILayoutDebugger._staleReportResult>): HTMLElement {
        const panel = UILayoutDebugger._el("div", [
            "display: flex",
            "flex-direction: column",
            "flex: 1",
            "min-height: 0",
            "overflow: hidden",
        ])
        
        // ── Header bar ────────────────────────────────────────────────────────
        const bar = UILayoutDebugger._el("div", [
            "padding: 5px 10px",
            "border-bottom: 1px solid rgba(255,255,255,0.08)",
            "display: flex",
            "align-items: center",
            "gap: 6px",
            "flex-shrink: 0",
            "font-size: 10px",
        ])
        
        const barTitle = UILayoutDebugger._el("span", ["color: #ffaa55", "flex: 1", "font-weight: bold"])
        barTitle.textContent = "☢ Stale Layout Report"
        
        const rerunBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle("#ffaa55"))
        rerunBtn.textContent = "↺ Re-run"
        rerunBtn.title = "Re-run performForcedSubtreeLayout and refresh the report"
        rerunBtn.onclick = () => UILayoutDebugger.captureStaleLayoutReport()
        
        const closeBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle("#9090a8"))
        closeBtn.textContent = "✕"
        closeBtn.title = "Close stale report panel"
        closeBtn.onclick = () => {
            UILayoutDebugger._staleReportMode = false
            UILayoutDebugger._renderOverlay()
        }
        
        bar.append(barTitle, rerunBtn, closeBtn)
        panel.appendChild(bar)
        
        // ── Summary bar ───────────────────────────────────────────────────────
        const { diffs, forcedPassCacheChanges, passIndex } = result
        
        const counts = { frame: 0, cache: 0, both: 0, appeared: 0, disappeared: 0 }
        for (const d of diffs) {
            if (d.kind === "frame") { counts.frame++ }
            else if (d.kind === "cache") { counts.cache++ }
            else if (d.kind === "both") { counts.both++ }
            else if (d.kind === "appeared") { counts.appeared++ }
            else if (d.kind === "disappeared") { counts.disappeared++ }
        }
        const totalCorrected = diffs.length
        
        const summaryBar = UILayoutDebugger._el("div", [
            "padding: 5px 10px",
            "border-bottom: 1px solid rgba(255,255,255,0.08)",
            "display: flex",
            "gap: 8px",
            "align-items: center",
            "flex-shrink: 0",
            "font-size: 10px",
            "flex-wrap: wrap",
        ])
        
        if (totalCorrected === 0) {
            const clean = UILayoutDebugger._el("span", ["color: #88ff99", "font-weight: bold"])
            clean.textContent = "✓ No stale state detected — all views were already correct."
            summaryBar.appendChild(clean)
        }
        else {
            const total = UILayoutDebugger._el("span", ["color: #ffaa55", "font-weight: bold"])
            total.textContent = `${totalCorrected} stale view${totalCorrected !== 1 ? "s" : ""} corrected`
            summaryBar.appendChild(total)
            
            const summaryItems: [string, number, string][] = [
                ["frame+cache", counts.both,        "#ffaa55"],
                ["frame",       counts.frame,       "#7bc8ff"],
                ["cache",       counts.cache,       "#ffcc88"],
                ["appeared",    counts.appeared,    "#88ff99"],
                ["disappeared", counts.disappeared, "#ff8888"],
            ]
            for (const [label, count, color] of summaryItems) {
                if (count === 0) { continue }
                const chip = UILayoutDebugger._el("span", [`color: ${color}`])
                chip.textContent = `${count} ${label}`
                summaryBar.appendChild(chip)
            }
        }
        
        const passTag = UILayoutDebugger._el("span", ["color: #5a5a70", "margin-left: auto", "white-space: nowrap", "flex-shrink: 0"])
        passTag.textContent = passIndex >= 0 ? `forced pass #${passIndex}` : ""
        summaryBar.appendChild(passTag)
        panel.appendChild(summaryBar)
        
        // ── UITextMeasurement global cache summary ────────────────────────────
        const tmBefore = result.before.textMeasurement
        const tmAfter  = result.after.textMeasurement
        const tmPreparedCleared = tmBefore.preparedCacheSize > 0 && tmAfter.preparedCacheSize === 0
        const tmStyleCleared    = tmBefore.styleCacheSize > 0 && tmAfter.styleCacheSize === 0
        const tmKnown = tmBefore.preparedCacheSize >= 0
        
        if (tmKnown) {
            const tmBar = UILayoutDebugger._el("div", [
                "padding: 4px 10px",
                "border-bottom: 1px solid rgba(255,255,255,0.08)",
                "display: flex",
                "gap: 10px",
                "flex-shrink: 0",
                "font-size: 9px",
                "color: #7060a0",
                "flex-wrap: wrap",
            ])
            const tmLabel = UILayoutDebugger._el("span", ["color: #7060a0", "font-weight: bold", "flex-shrink: 0"])
            tmLabel.textContent = "UITextMeasurement (global):"
            tmBar.appendChild(tmLabel)
            
            const prepChip = UILayoutDebugger._el("span", [
                "color: " + (tmPreparedCleared ? "#ffaa55" : "#5a5a70"),
            ])
            prepChip.textContent = `preparedCache ${tmBefore.preparedCacheSize} → ${tmAfter.preparedCacheSize}` +
                (tmPreparedCleared ? " ✓ cleared" : "")
            tmBar.appendChild(prepChip)
            
            const styleChip = UILayoutDebugger._el("span", [
                "color: " + (tmStyleCleared ? "#ffaa55" : "#5a5a70"),
            ])
            styleChip.textContent = `styleCache ${tmBefore.styleCacheSize} → ${tmAfter.styleCacheSize}` +
                (tmStyleCleared ? " ✓ cleared" : "")
            tmBar.appendChild(styleChip)
            
            panel.appendChild(tmBar)
        }
        
        // ── Filter tabs ───────────────────────────────────────────────────────
        type StaleFilter = "all" | "frame" | "cache"
        let staleFilter: StaleFilter = totalCorrected > 0 ? "all" : "all"
        
        const tabBar = UILayoutDebugger._el("div", [
            "display: flex",
            "border-bottom: 1px solid rgba(255,255,255,0.08)",
            "flex-shrink: 0",
            "font-size: 10px",
        ])
        
        const list = UILayoutDebugger._el("div", [
            "overflow-y: auto",
            "flex: 1",
            "padding: 4px 0",
        ])
        
        const renderList = (filter: StaleFilter) => {
            list.innerHTML = ""
            
            if (diffs.length === 0) {
                const msg = UILayoutDebugger._el("div", ["padding: 10px 12px", "color: #88ff99", "font-size: 10px"])
                msg.textContent = "✓ Nothing was corrected — no missing invalidations detected."
                list.appendChild(msg)
                return
            }
            
            const visible = filter === "all"
                            ? diffs
                            : filter === "frame"
                              ? diffs.filter(d => d.kind === "frame" || d.kind === "both")
                              : diffs.filter(d => d.kind === "cache" || d.kind === "both")
            
            if (visible.length === 0) {
                const msg = UILayoutDebugger._el("div", ["padding: 8px 12px", "color: #5a5a70", "font-size: 10px"])
                msg.textContent = "No items."
                list.appendChild(msg)
                return
            }
            
            for (const d of visible) {
                const cacheWrites = forcedPassCacheChanges.get(d.viewIndex) ?? []
                
                const row = UILayoutDebugger._el("div", [
                    "padding: 5px 10px",
                    "border-bottom: 1px solid rgba(255,255,255,0.05)",
                    "font-size: 10px",
                ])
                
                // ── Top line: kind tag + class + elementID ────────────────────
                const topLine = UILayoutDebugger._el("div", ["display: flex", "gap: 6px", "align-items: baseline", "margin-bottom: 2px"])
                
                const kindColors: Record<UILayoutDebugDiffKind, string> = {
                    appeared: "#88ff99", disappeared: "#ff8888",
                    both: "#ffaa55", frame: "#7bc8ff", cache: "#ffcc88", unchanged: "#5a5a70",
                }
                const kindTag = UILayoutDebugger._el("span", [
                    `color: ${kindColors[d.kind]}`,
                    "flex-shrink: 0",
                    "font-size: 9px",
                    "font-weight: bold",
                    "min-width: 70px",
                ])
                kindTag.textContent = d.kind.toUpperCase()
                
                const cls = UILayoutDebugger._el("span", ["color: #ffcc88", "font-weight: bold"])
                cls.textContent = d.className
                
                const eid = UILayoutDebugger._el("span", ["color: #6a6a80"])
                eid.textContent = ` #${d.elementID}`
                
                // Jump to the forced pass in the pass inspector
                const jumpBtn = UILayoutDebugger._el("span", [
                    "color: #59599b",
                    "margin-left: auto",
                    "font-size: 9px",
                    "cursor: pointer",
                    "flex-shrink: 0",
                ])
                jumpBtn.textContent = `pass #${passIndex} ↗`
                jumpBtn.title = "Jump to this view in the forced-layout pass"
                jumpBtn.onclick = () => {
                    const trace = UILayoutDebugger._traces.find(t => t.passIndex === passIndex)
                    if (!trace) { return }
                    const ti = UILayoutDebugger._traces.indexOf(trace)
                    const si = trace.steps.findIndex(s => s.viewIndex === d.viewIndex)
                    if (si < 0) { return }
                    UILayoutDebugger._replayTraceIndex = ti
                    UILayoutDebugger._replayStepIndex = si
                    UILayoutDebugger._renderOverlay()
                }
                
                topLine.append(kindTag, cls, eid, jumpBtn)
                row.appendChild(topLine)
                
                // ── Frame correction ──────────────────────────────────────────
                if (d.kind === "frame" || d.kind === "both") {
                    const frameLine = UILayoutDebugger._el("div", ["padding-left: 76px", "color: #b0b0c8", "font-size: 9px", "margin-bottom: 1px"])
                    frameLine.textContent = "frame: " + UILayoutDebugger._formatFrameDiff(d.baselineFrame, d.currentFrame)
                    row.appendChild(frameLine)
                }
                
                // ── Cache correction + write cross-reference ──────────────────
                if (d.kind === "cache" || d.kind === "both") {
                    const cacheLine = UILayoutDebugger._el("div", ["padding-left: 76px", "color: #a0a090", "font-size: 9px", "margin-bottom: 1px"])
                    cacheLine.textContent = "cache: " + UILayoutDebugger._formatCacheDiff(d.baselineCache, d.currentCache)
                    row.appendChild(cacheLine)
                    
                    // Cross-reference: which call paths recomputed the correct value?
                    if (cacheWrites.length > 0) {
                        const xrefHeader = UILayoutDebugger._el("div", [
                            "padding-left: 76px",
                            "color: #7060a0",
                            "font-size: 9px",
                            "margin-top: 3px",
                            "margin-bottom: 1px",
                            "font-weight: bold",
                        ])
                        xrefHeader.textContent = `↳ recomputed by (${cacheWrites.length} write${cacheWrites.length !== 1 ? "s" : ""} in forced pass):`
                        row.appendChild(xrefHeader)
                        
                        for (const ev of cacheWrites) {
                            const writeRow = UILayoutDebugger._el("div", [
                                "padding-left: 84px",
                                "display: flex",
                                "gap: 5px",
                                "align-items: baseline",
                                "font-size: 9px",
                            ])
                            
                            const keyMatch = ev.cacheKey.match(/h_(\d+(?:\.\d+)?)__w_(\d+(?:\.\d+)?)/)
                            const keyLabel = keyMatch
                                             ? (keyMatch[1] !== "0" && keyMatch[2] !== "0"
                                                ? `h≤${keyMatch[1]} w≤${keyMatch[2]}`
                                                : keyMatch[2] !== "0" ? `w≤${keyMatch[2]}` : `h≤${keyMatch[1]}`)
                                             : ev.cacheKey
                            
                            const keySpan = UILayoutDebugger._el("span", ["color: #6060808", "flex-shrink: 0"])
                            keySpan.textContent = keyLabel
                            
                            const valSpan = UILayoutDebugger._el("span", ["color: #88ddff", "flex-shrink: 0"])
                            valSpan.textContent = `→ ${ev.newValue.width.toFixed(0)}×${ev.newValue.height.toFixed(0)}`
                            
                            const callerSpan = UILayoutDebugger._el("span", ["color: #7070a8", "cursor: pointer"])
                            callerSpan.textContent = ev.callerFunction + "()"
                            callerSpan.title = ev.cleanStack
                            
                            let stackOpen = false
                            const stackEl = UILayoutDebugger._el("div", [
                                "display: none",
                                "margin-top: 2px",
                                "padding: 3px 6px",
                                "background: rgba(255,255,255,0.04)",
                                "border-radius: 3px",
                                "color: #6060808",
                                "font-size: 9px",
                                "white-space: pre",
                                "overflow-x: auto",
                            ])
                            stackEl.textContent = ev.cleanStack
                            callerSpan.onclick = () => {
                                stackOpen = !stackOpen
                                stackEl.style.display = stackOpen ? "block" : "none"
                            }
                            
                            writeRow.append(keySpan, valSpan, callerSpan)
                            row.appendChild(writeRow)
                            row.appendChild(stackEl)
                        }
                    }
                }
                
                list.appendChild(row)
            }
        }
        
        const filterTabs: [string, StaleFilter, number, string][] = [
            ["All",   "all",   diffs.length,              "#ffaa55"],
            ["Frame", "frame", counts.frame + counts.both, "#7bc8ff"],
            ["Cache", "cache", counts.cache + counts.both, "#ffcc88"],
        ]
        
        const buildTabs = () => {
            tabBar.innerHTML = ""
            for (const [label, filter, count, color] of filterTabs) {
                if (count === 0 && filter !== "all") { continue }
                const tab = UILayoutDebugger._el("div", [
                    "padding: 4px 8px",
                    "cursor: pointer",
                    "border-bottom: 2px solid " + (staleFilter === filter ? color : "transparent"),
                    `color: ${staleFilter === filter ? color : "#6a6a80"}`,
                    "white-space: nowrap",
                    "font-size: 10px",
                ])
                tab.textContent = `${label} (${count})`
                tab.onclick = () => {
                    staleFilter = filter
                    buildTabs()
                    renderList(staleFilter)
                }
                tabBar.appendChild(tab)
            }
        }
        
        buildTabs()
        panel.appendChild(tabBar)
        panel.appendChild(list)
        renderList(staleFilter)
        
        return panel
    }
    
    
    static _renderHelpPanel(): HTMLElement {
        const panel = UILayoutDebugger._el("div", [
            "overflow-y: auto",
            "flex: 1",
            "padding: 14px 16px",
            "font-size: 11px",
            "line-height: 1.6",
            "color: #c0c0d8",
        ])
        
        const section = (heading: string, body: string) => {
            const h = UILayoutDebugger._el("div", [
                "font-weight: bold",
                "color: #c8d8ff",
                "margin-top: 14px",
                "margin-bottom: 4px",
                "font-size: 11px",
                "border-bottom: 1px solid rgba(255,255,255,0.08)",
                "padding-bottom: 3px",
            ])
            h.textContent = heading
            const b = UILayoutDebugger._el("div", ["color: #a0a0b8", "white-space: pre-wrap"])
            b.textContent = body
            panel.appendChild(h)
            panel.appendChild(b)
        }
        
        const kv = (key: string, value: string) => {
            const row = UILayoutDebugger._el("div", ["display: flex", "gap: 8px", "margin-bottom: 4px"])
            const k = UILayoutDebugger._el("span", [
                "color: #ffcc88",
                "font-weight: bold",
                "flex-shrink: 0",
                "min-width: 110px",
            ])
            k.textContent = key
            const v = UILayoutDebugger._el("span", ["color: #a0a0b8"])
            v.textContent = value
            row.append(k, v)
            panel.appendChild(row)
        }
        
        // ── Concepts ─────────────────────────────────────────────────────────
        
        section("Core concepts", "")
        
        kv("Pass",
            "One full run of layoutViewsIfNeeded(). The scheduler collects every " +
            "view that called setNeedsLayout() and works through them all. A single " +
            "user action typically triggers one pass.")
        
        kv("Iteration",
            "One loop of the while-loop inside a pass. Laying out a view can call " +
            "setNeedsLayout() on another view, adding it to the queue mid-pass. " +
            "The loop repeats until the queue is empty. Most passes have 1 iteration; " +
            "more than 1 signals that layout is triggering further layout.")
        
        kv("Step",
            "One view being laid out within a pass — one call to layoutIfNeeded(). " +
            "A pass with 8 steps means 8 views had their layout computed. Steps are " +
            "the atomic unit you step through in the scrubber.")
        
        kv("Trigger",
            "The call stack at the moment setNeedsLayout() was called on a view. " +
            "Tells you what caused the view to enter the layout queue.")
        
        kv("Heat colour",
            "Green = laid out once. Orange = laid out twice (possible unnecessary work). " +
            "Red = laid out 3+ times (likely a layout cycle or redundant invalidation).")
        
        // ── Pass inspector ────────────────────────────────────────────────────
        
        section("Pass inspector", "")
        
        kv("Pass picker",
            "Selects which recorded pass to inspect. The most recent pass is shown " +
            "first. Up to 20 passes are stored.")
        
        kv("◀ ▶ scrubber",
            "Steps through the views laid out in the selected pass one at a time. " +
            "The active view is highlighted in the tree and its frame diff, intrinsic " +
            "cache diff, trigger stack, and subview changes are shown above.")
        
        kv("Frame filter",
            "All: show every step. Changed: only steps where the frame actually moved " +
            "or resized. Unchanged: only no-ops. The counter shows n/total when filtered.")
        
        kv("Compare ⧉",
            "Splits the panel into two columns, each showing an independent pass. " +
            "The tree expands and collapses in sync between both columns.")
        
        kv("Cache writes",
            "Collapsible section at the bottom of each column. Every write to a " +
            "view's intrinsic size cache during that pass is listed, with the value " +
            "written and the caller that triggered the measurement.")
        
        // ── Baseline / diff ───────────────────────────────────────────────────
        
        section("Baseline & diff", "")
        
        kv("📍 Baseline",
            "Captures a flat snapshot of every view's frame and intrinsic cache right " +
            "now. Requires at least one layout pass to have run so the root view is " +
            "known. Click again to recapture.")
        
        kv("⊕ Diff",
            "Captures a second snapshot and shows what changed since the baseline. " +
            "Changes are sorted: appeared, disappeared, frame+cache, frame-only, " +
            "cache-only. Click any row to jump to the pass that caused that change.")
        
        kv("pass #N tag",
            "Shown on each diff row. Indicates the first recorded pass (by pass " +
            "number) in which that view was laid out after the baseline was taken.")
        
        kv("⬚ Frame / Bounds",
            "Toggles how frame comparisons are made across all diff panels. " +
            "Frame mode (default): a view is considered changed if its position or " +
            "size changed. Bounds mode: only size changes are counted — origin (x/y) " +
            "is ignored. Use bounds mode when you care only about content-affecting " +
            "size changes and want to suppress noise from views that merely moved.")
        
        // ── Stale layout report ───────────────────────────────────────────────
        
        section("Stale layout report  ☢", "")
        
        kv("☢ Stale",
            "The primary tool for finding missing cache invalidations. Click once to " +
            "snapshot the current tree state, then immediately call " +
            "performForcedSubtreeLayout() for a complete cold remeasure, then diff the " +
            "two snapshots. Any view that changed was holding stale/incorrect state — " +
            "its invalidation was missed somewhere.")
        
        kv("Corrected views",
            "Each row in the ☢ panel is a view the forced pass corrected. The kind " +
            "tag shows whether the frame, intrinsic cache, or both were stale.")
        
        kv("↳ recomputed by",
            "For cache corrections, the exact call path(s) that recomputed the correct " +
            "value during the forced pass are listed below each row, with expandable " +
            "stack traces. Work backwards from that call site to find where the " +
            "corresponding invalidation should have been triggered but wasn't.")
        
        kv("pass #N ↗",
            "Each row has a jump link to the forced-layout pass in the pass inspector " +
            "so you can step through the remeasure for that view in full detail.")
        
        kv("Re-run",
            "Right-click the ☢ Stale button (or use ↺ Re-run in the panel) to re-run " +
            "the report without closing and reopening. Useful after you've applied a fix " +
            "and want to verify the stale count drops to zero.")
        
        kv("When to use it",
            "Reproduce the bug, then immediately click ☢ Stale before triggering any " +
            "other layout. The tree must be in its incorrect state at the moment you " +
            "click. The forced layout will correct it, which is visible in the UI after " +
            "the report runs.")
        
        // ── Live inspector ────────────────────────────────────────────────────
        
        section("Live inspector  👁", "")
        
        kv("👁 Live",
            "Shows the current view tree as it exists right now — not a recorded " +
            "snapshot. Frames and cache entries reflect the live DOM state. " +
            "Use ↺ Refresh to re-read after triggering layout manually.")
        
        // ── Breakpoints ───────────────────────────────────────────────────────
        
        section("Breakpoint mode  ⏸", "")
        
        kv("⏸ BP",
            "When enabled, a sentinel line executes before every layoutIfNeeded() " +
            "call. Set a browser debugger breakpoint on that line to pause before " +
            "each step with the full live JS stack in scope.")
        
        kv("Finding the line",
            "In Chrome DevTools Sources, press Cmd+Opt+F (Mac) or Ctrl+Shift+F " +
            "(Windows) and search for: breakpointOnThisLine")
        
        // ── Console API ───────────────────────────────────────────────────────
        
        section("Console API", "All methods are on the global UILayoutDebugger object.")
        
        kv("UILayoutDebugger.enable()",              "Start or stop recording and show/hide the overlay.")
        kv("UILayoutDebugger.disable()",             "Stop recording and hide the overlay.")
        kv("UILayoutDebugger.enableBreakpoints()",   "Turn on breakpoint step-through mode.")
        kv("UILayoutDebugger.captureBaseline()",     "Snapshot current state as baseline.")
        kv("UILayoutDebugger.captureAndDiff()",      "Snapshot and diff against baseline.")
        kv("UILayoutDebugger.captureStaleLayoutReport()", "Snapshot → forced remeasure → diff. Primary cache-staleness diagnostic.")
        kv("UILayoutDebugger.clearStaleReport()",    "Clear the stale report result and close the panel.")
        kv("UILayoutDebugger.clearTraces()",         "Discard all recorded passes and reset the counter.")
        kv("UILayoutDebugger.goToStep(n)",           "Jump to step n (0-based) in the current pass.")
        kv("UILayoutDebugger.toggleLiveInspector()", "Show or hide the live view tree panel.")
        kv("UILayoutDebugger._boundsBasedDiff = true", "Switch all frame diffs to size-only (bounds) mode from the console.")
        
        return panel
    }
    
    static _renderLiveInspectorPanel(): HTMLElement {
        const panel = UILayoutDebugger._el("div", [
            "display: flex",
            "flex-direction: column",
            "flex: 1",
            "min-height: 0",
            "overflow: hidden",
        ])
        
        // ── Header bar ────────────────────────────────────────────────────────
        const bar = UILayoutDebugger._el("div", [
            "padding: 5px 10px",
            "border-bottom: 1px solid rgba(255,255,255,0.08)",
            "display: flex",
            "align-items: center",
            "gap: 6px",
            "flex-shrink: 0",
            "font-size: 10px",
        ])
        
        const barTitle = UILayoutDebugger._el("span", ["color: #a0a0b8", "flex: 1", "font-weight: bold"])
        barTitle.textContent = "👁 Live View Tree"
        
        const refreshBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle("#9090a8"))
        refreshBtn.textContent = "↺ Refresh"
        refreshBtn.title = "Re-capture current state"
        refreshBtn.onclick = () => UILayoutDebugger._renderOverlay()
        
        const syncBtn = UILayoutDebugger._el("button", UILayoutDebugger._btnStyle("#9090a8"))
        syncBtn.textContent = "⇄ Sync"
        syncBtn.title = "Sync collapse/expand state from pass inspector. Views not in the pass inspector are kept collapsed."
        syncBtn.onclick = () => {
            // Read the active pass expand state
            const source = UILayoutDebugger._compareMode
                           ? UILayoutDebugger._sharedExpandState
                           : UILayoutDebugger._singleExpandState
            
            // Build a set of all viewIndices that appear in any recorded trace step
            const tracedViews = new Set<number>()
            for (const trace of UILayoutDebugger._traces) {
                for (const step of trace.steps) { tracedViews.add(step.viewIndex) }
            }
            
            // Copy source state; any viewIndex not in source and not in traced
            // views defaults to collapsed
            const newState = new Map<number, boolean>()
            for (const [idx, expanded] of source) {
                newState.set(idx, expanded)
            }
            // For views present in the live tree but absent from pass inspector
            // state, collapse them unless they appear in a trace
            UILayoutDebugger._walkViewTree(
                UILayoutDebugger._lastKnownRootView,
                new Map(),  // discard — we only need the side effect of visiting indices
                new Set(),
            )
            // Actually walk to collect all live view indices
            const liveIndices = new Set<number>()
            const collectIndices = (view: any, visited: Set<number>) => {
                const idx: number = view?._UIViewIndex ?? -1
                if (idx < 0 || visited.has(idx)) { return }
                visited.add(idx)
                liveIndices.add(idx)
                for (const sv of view?.subviews ?? []) { collectIndices(sv, visited) }
            }
            collectIndices(UILayoutDebugger._lastKnownRootView, new Set())
            
            for (const idx of liveIndices) {
                if (!newState.has(idx)) {
                    // Not in pass expand state: expand only if it appears in a trace
                    newState.set(idx, tracedViews.has(idx))
                }
            }
            
            UILayoutDebugger._liveExpandState = newState
            UILayoutDebugger._renderOverlay()
        }
        
        bar.append(barTitle, refreshBtn, syncBtn)
        panel.appendChild(bar)
        
        const root = UILayoutDebugger._lastKnownRootView
        if (!root) {
            const msg = UILayoutDebugger._el("div", ["padding: 10px 12px", "color: #6a6a80", "font-size: 10px"])
            msg.textContent = "No root view found yet — trigger a layout pass first."
            panel.appendChild(msg)
            return panel
        }
        
        // ── Tree ──────────────────────────────────────────────────────────────
        const treeContainer = UILayoutDebugger._el("div", [
            "overflow-y: auto",
            "flex: 1",
            "padding: 4px 0",
            "position: relative",
        ])
        
        UILayoutDebugger._renderLiveNode(
            root, treeContainer, 0, new Set(), UILayoutDebugger._liveExpandState
        )
        panel.appendChild(treeContainer)
        return panel
    }
    
    static _renderLiveNode(
        view: any,
        container: HTMLElement,
        depth: number,
        visited: Set<number>,
        expandState: Map<number, boolean>,
    ) {
        const idx: number = view?._UIViewIndex ?? -1
        if (idx < 0 || visited.has(idx)) { return }
        visited.add(idx)
        
        const frame = UILayoutDebugger._captureFrame(view)
        const cache = UILayoutDebugger._captureCache(view)
        const className: string = view?.constructor?.name ?? "UnknownView"
        const elementID: string = view?.elementID ?? String(idx)
        const subviews: any[] = view?.subviews ?? []
        const hasChildren = subviews.length > 0
        
        // Default to expanded if not in state map yet
        if (!expandState.has(idx)) { expandState.set(idx, true) }
        let expanded = expandState.get(idx)!
        
        const row = UILayoutDebugger._el("div", [
            "display: flex",
            "align-items: baseline",
            "padding: 1px 10px 1px " + (10 + depth * 12) + "px",
            "cursor: " + (hasChildren ? "pointer" : "default"),
            "border-radius: 3px",
            "margin: 0 4px",
        ])
        
        const chevron = UILayoutDebugger._el("span", [
            "display: inline-block", "width: 10px", "flex-shrink: 0",
            "color: #7070a0", "font-size: 8px", "margin-right: 2px", "text-align: center",
        ])
        chevron.textContent = !hasChildren ? "" : expanded ? "▾" : "▸"
        
        const dot = UILayoutDebugger._el("span", [
            "display: inline-block", "width: 7px", "height: 7px",
            "border-radius: 50%", "margin-right: 5px", "flex-shrink: 0",
            "background: #4a4a5a",
        ])
        
        const classSpan = UILayoutDebugger._el("span", ["color: #9090a8"])
        classSpan.textContent = className
        
        const eidSpan = UILayoutDebugger._el("span", ["color: #6a6a80", "margin-left: 4px"])
        eidSpan.textContent = `#${elementID}`
        
        const frameSpan = UILayoutDebugger._el("span", ["color: #55556a", "margin-left: 4px", "font-size: 9px"])
        frameSpan.textContent = frame
                                ? `${frame.left.toFixed(0)},${frame.top.toFixed(0)}  ${frame.width.toFixed(0)}×${frame.height.toFixed(0)}`
                                : ""
        
        row.append(chevron, dot, classSpan, eidSpan, frameSpan)
        
        row.title = [
            `${className} #${elementID}`,
            frame
            ? `frame: ${frame.left.toFixed(1)},${frame.top.toFixed(1)}  ${frame.width.toFixed(1)}×${frame.height.toFixed(1)}`
            : "frame: (none)",
            "cache: " + UILayoutDebugger._formatCacheSnapshot(cache),
        ].join("\n")
        
        container.appendChild(row)
        
        if (!hasChildren) { return }
        
        const childContainer = UILayoutDebugger._el("div", [
            "display: " + (expanded ? "block" : "none"),
        ])
        container.appendChild(childContainer)
        
        for (const sv of subviews) {
            UILayoutDebugger._renderLiveNode(sv, childContainer, depth + 1, visited, expandState)
        }
        
        row.onclick = () => {
            expanded = !expanded
            expandState.set(idx, expanded)
            childContainer.style.display = expanded ? "block" : "none"
            chevron.textContent = expanded ? "▾" : "▸"
        }
    }
    
    static _renderDiffPanel(
        baseline: UILayoutDebugStateSnapshot,
        current: UILayoutDebugStateSnapshot,
        onNavigate: (viewIndex: number) => void,
        baselineTakenAt: number,
    ): HTMLElement {
        const panel = UILayoutDebugger._el("div", [
            "display: flex",
            "flex-direction: column",
            "flex: 1",
            "min-height: 0",
            "overflow: hidden",
        ])
        
        // ── Summary bar ───────────────────────────────────────────────────────
        const diffs = UILayoutDebugger._diffSnapshots(baseline, current)
        const counts = { appeared: 0, disappeared: 0, frame: 0, cache: 0, both: 0, unchanged: 0 }
        for (const d of diffs) { counts[d.kind]++ }
        const changed = counts.appeared + counts.disappeared + counts.frame + counts.cache + counts.both
        
        const summaryBar = UILayoutDebugger._el("div", [
            "padding: 5px 10px",
            "border-bottom: 1px solid rgba(255,255,255,0.08)",
            "display: flex",
            "gap: 8px",
            "align-items: center",
            "flex-shrink: 0",
            "font-size: 10px",
            "flex-wrap: wrap",
        ])
        
        const summaryItems: [string, number, string][] = [
            ["appeared",    counts.appeared,    "#88ff99"],
            ["disappeared", counts.disappeared, "#ff8888"],
            ["frame+cache", counts.both,        "#ffaa55"],
            ["frame",       counts.frame,       "#7bc8ff"],
            ["cache",       counts.cache,       "#ffcc88"],
            ["unchanged",   counts.unchanged,   "#5a5a70"],
        ]
        for (const [label, count, color] of summaryItems) {
            if (count === 0) { continue }
            const chip = UILayoutDebugger._el("span", [`color: ${color}`])
            chip.textContent = `${count} ${label}`
            summaryBar.appendChild(chip)
        }
        if (changed === 0) {
            const chip = UILayoutDebugger._el("span", ["color: #9090a8"])
            chip.textContent = "No changes"
            summaryBar.appendChild(chip)
        }
        
        const ts = UILayoutDebugger._el("span", ["color: #5a5a70", "margin-left: auto", "white-space: nowrap"])
        const elapsed = ((current.takenAt - baseline.takenAt) / 1000).toFixed(1)
        ts.textContent = `+${elapsed}s`
        summaryBar.appendChild(ts)
        
        panel.appendChild(summaryBar)
        
        // ── Filter tabs ───────────────────────────────────────────────────────
        let diffFilter: UILayoutDebugDiffKind | "all" = changed > 0 ? "frame" : "all"
        
        const tabBar = UILayoutDebugger._el("div", [
            "display: flex",
            "border-bottom: 1px solid rgba(255,255,255,0.08)",
            "flex-shrink: 0",
            "font-size: 10px",
        ])
        
        const list = UILayoutDebugger._el("div", [
            "overflow-y: auto",
            "flex: 1",
            "padding: 4px 0",
        ])
        
        const renderList = (filter: UILayoutDebugDiffKind | "all") => {
            list.innerHTML = ""
            const visible = filter === "all"
                            ? diffs
                            : diffs.filter(d => d.kind === filter || (filter === "frame" && d.kind === "both"))
            
            if (visible.length === 0) {
                const msg = UILayoutDebugger._el("div", ["padding: 8px 12px", "color: #5a5a70"])
                msg.textContent = "No items."
                list.appendChild(msg)
                return
            }
            
            for (const d of visible) {
                const kindColors: Record<UILayoutDebugDiffKind, string> = {
                    appeared: "#88ff99", disappeared: "#ff8888",
                    both: "#ffaa55", frame: "#7bc8ff", cache: "#ffcc88", unchanged: "#5a5a70",
                }
                
                // Find which pass first changed this view after the baseline
                const causingTrace = d.kind !== "disappeared"
                                     ? UILayoutDebugger._findCausingTrace(d.viewIndex, baselineTakenAt)
                                     : null
                const hasTrace = !!causingTrace
                
                const row = UILayoutDebugger._el("div", [
                    "padding: 3px 10px",
                    "border-bottom: 1px solid rgba(255,255,255,0.04)",
                    "font-size: 10px",
                    hasTrace ? "cursor: pointer" : "cursor: default",
                ])
                if (hasTrace) {
                    row.title = `Click to jump to pass #${causingTrace!.passIndex} in the pass inspector`
                    row.onmouseenter = () => { row.style.background = "rgba(255,255,255,0.06)" }
                    row.onmouseleave = () => { row.style.background = "" }
                    row.onclick = () => onNavigate(d.viewIndex)
                }
                
                const topLine = UILayoutDebugger._el("div", ["display: flex", "gap: 6px", "align-items: baseline"])
                
                const kindTag = UILayoutDebugger._el("span", [
                    `color: ${kindColors[d.kind]}`,
                    "flex-shrink: 0",
                    "font-size: 9px",
                    "font-weight: bold",
                    "min-width: 70px",
                ])
                kindTag.textContent = d.kind.toUpperCase()
                
                const cls = UILayoutDebugger._el("span", ["color: #ffcc88", "font-weight: bold"])
                cls.textContent = d.className
                
                const eid = UILayoutDebugger._el("span", ["color: #6a6a80"])
                eid.textContent = `#${d.elementID}`
                
                if (causingTrace) {
                    const passTag = UILayoutDebugger._el("span", [
                        "color: #59599b",
                        "margin-left: auto",
                        "font-size: 9px",
                        "flex-shrink: 0",
                    ])
                    passTag.textContent = `pass #${causingTrace.passIndex}`
                    topLine.append(kindTag, cls, eid, passTag)
                }
                else {
                    topLine.append(kindTag, cls, eid)
                }
                row.appendChild(topLine)
                
                if (d.kind !== "appeared" && d.kind !== "disappeared") {
                    if (d.kind === "frame" || d.kind === "both") {
                        const frameLine = UILayoutDebugger._el("div", ["padding-left: 76px", "color: #b0b0c8", "font-size: 9px"])
                        frameLine.textContent = "frame: " + UILayoutDebugger._formatFrameDiff(d.baselineFrame, d.currentFrame)
                        row.appendChild(frameLine)
                    }
                    if (d.kind === "cache" || d.kind === "both") {
                        const cacheLine = UILayoutDebugger._el("div", ["padding-left: 76px", "color: #a0a090", "font-size: 9px"])
                        cacheLine.textContent = "cache: " + UILayoutDebugger._formatCacheDiff(d.baselineCache, d.currentCache)
                        row.appendChild(cacheLine)
                    }
                }
                else {
                    const frameLine = UILayoutDebugger._el("div", ["padding-left: 76px", "color: #b0b0c8", "font-size: 9px"])
                    frameLine.textContent = "frame: " + UILayoutDebugger._formatFrame(
                        d.kind === "appeared" ? d.currentFrame : d.baselineFrame
                    )
                    row.appendChild(frameLine)
                }
                
                list.appendChild(row)
            }
        }
        
        const tabs: [string, UILayoutDebugDiffKind | "all", number, string][] = [
            ["All",         "all",         diffs.length,          "#9090a8"],
            ["Frame",       "frame",       counts.frame + counts.both, "#7bc8ff"],
            ["Cache",       "cache",       counts.cache + counts.both, "#ffcc88"],
            ["Appeared",    "appeared",    counts.appeared,       "#88ff99"],
            ["Disappeared", "disappeared", counts.disappeared,    "#ff8888"],
        ]
        
        const buildTabs = () => {
            tabBar.innerHTML = ""
            for (const [label, filter, count, color] of tabs) {
                if (count === 0 && filter !== "all") { continue }
                const tab = UILayoutDebugger._el("div", [
                    "padding: 4px 8px",
                    "cursor: pointer",
                    "border-bottom: 2px solid " + (diffFilter === filter ? color : "transparent"),
                    `color: ${diffFilter === filter ? color : "#6a6a80"}`,
                    "white-space: nowrap",
                    "font-size: 10px",
                ])
                tab.textContent = `${label} (${count})`
                tab.onclick = () => {
                    diffFilter = filter
                    buildTabs()
                    renderList(diffFilter)
                }
                tabBar.appendChild(tab)
            }
        }
        
        buildTabs()
        panel.appendChild(tabBar)
        panel.appendChild(list)
        renderList(diffFilter)
        
        return panel
    }
    
    static _renderStepDetail(activeStep: UILayoutDebugStep): HTMLElement {
        const detail = UILayoutDebugger._el("div", [
            "padding: 6px 10px",
            "border-bottom: 1px solid rgba(255,255,255,0.08)",
            "flex-shrink: 0",
            "font-size: 10px",
        ])
        
        const titleRow = UILayoutDebugger._el("div", ["margin-bottom: 3px"])
        
        const stepTag = UILayoutDebugger._el("span", [
            "background: #2a2a44",
            "border-radius: 3px",
            "padding: 0 4px",
            "margin-right: 5px",
            "color: #aac8ff",
            "font-weight: bold",
        ])
        stepTag.textContent = `step ${activeStep.stepIndex}`
        
        const iterTag = UILayoutDebugger._el("span", ["color: #9090a8", "margin-right: 6px"])
        iterTag.textContent = `iter ${activeStep.iteration + 1}`
        
        const className = UILayoutDebugger._el("span", ["color: #ffcc88", "font-weight: bold"])
        className.textContent = activeStep.className
        
        const eid = UILayoutDebugger._el("span", ["color: #9090a8", "margin-left: 4px"])
        eid.textContent = `#${activeStep.elementID}`
        
        titleRow.append(stepTag, iterTag, className, eid)
        detail.appendChild(titleRow)
        
        const frameRow = UILayoutDebugger._el("div", ["color: #c0c0d8", "margin-bottom: 2px"])
        frameRow.textContent = "frame: " + UILayoutDebugger._formatFrameDiff(activeStep.frameBefore, activeStep.frameAfter)
        detail.appendChild(frameRow)
        
        // ── Intrinsic cache diff ──────────────────────────────────────────────
        const cacheDiffStr = UILayoutDebugger._formatCacheDiff(activeStep.cacheBefore, activeStep.cacheAfter)
        const cacheRow = UILayoutDebugger._el("div", ["margin-bottom: 3px"])
        
        const cacheLabel = UILayoutDebugger._el("span", ["color: #8888a0", "margin-right: 4px"])
        cacheLabel.textContent = "cache:"
        
        const cacheChanged =
            (activeStep.cacheBefore?.entryCount ?? 0) !== (activeStep.cacheAfter?.entryCount ?? 0) ||
            cacheDiffStr.includes("~") || cacheDiffStr.includes("+") || cacheDiffStr.includes("-")
        
        const cacheSummary = UILayoutDebugger._el("span", [
            "color: " + (cacheChanged ? "#ffcc88" : "#7878a0"),
            "cursor: pointer",
            "font-weight: " + (cacheChanged ? "bold" : "normal"),
        ])
        const bCount = activeStep.cacheBefore?.entryCount ?? 0
        const aCount = activeStep.cacheAfter?.entryCount ?? 0
        cacheSummary.textContent = bCount === aCount
                                   ? `${aCount} entr${aCount === 1 ? "y" : "ies"}${cacheChanged ? " (changed)" : ""}`
                                   : `${bCount} → ${aCount} entries`
        
        let cacheExpanded = false
        const cacheDetail = UILayoutDebugger._el("div", [
            "display: none",
            "margin-top: 2px",
            "padding: 4px 6px",
            "background: rgba(255,255,255,0.04)",
            "border-radius: 3px",
            "color: #9090a8",
            "font-size: 9px",
            "line-height: 1.6",
            "white-space: pre",
        ])
        cacheDetail.textContent = cacheDiffStr
        
        cacheSummary.onclick = () => {
            cacheExpanded = !cacheExpanded
            cacheDetail.style.display = cacheExpanded ? "block" : "none"
        }
        
        cacheRow.append(cacheLabel, cacheSummary)
        detail.appendChild(cacheRow)
        detail.appendChild(cacheDetail)
        
        const trigger = activeStep.trigger
        const triggerRow = UILayoutDebugger._el("div", ["margin-top: 4px", "margin-bottom: 2px"])
        if (trigger) {
            const triggerLabel = UILayoutDebugger._el("span", ["color: #8888a0", "margin-right: 4px"])
            triggerLabel.textContent = "setNeedsLayout from"
            
            const triggerFn = UILayoutDebugger._el("span", ["color: #88ddff", "font-weight: bold", "cursor: pointer"])
            triggerFn.textContent = trigger.callerFunction + "()"
            triggerFn.title = trigger.cleanStack
            
            let stackExpanded = false
            const stackEl = UILayoutDebugger._el("div", [
                "display: none",
                "margin-top: 3px",
                "padding: 4px 6px",
                "background: rgba(255,255,255,0.04)",
                "border-radius: 3px",
                "color: #7878a0",
                "font-size: 9px",
                "line-height: 1.5",
                "white-space: pre",
                "overflow-x: auto",
            ])
            stackEl.textContent = trigger.cleanStack
            
            triggerFn.onclick = () => {
                stackExpanded = !stackExpanded
                stackEl.style.display = stackExpanded ? "block" : "none"
            }
            
            triggerRow.append(triggerLabel, triggerFn)
            detail.appendChild(triggerRow)
            detail.appendChild(stackEl)
        }
        else {
            const triggerLabel = UILayoutDebugger._el("span", ["color: #5a5a70"])
            triggerLabel.textContent = "setNeedsLayout trigger not captured"
            triggerRow.appendChild(triggerLabel)
            detail.appendChild(triggerRow)
        }
        
        if (activeStep.subviewRecords.length > 0) {
            const svHeader = UILayoutDebugger._el("div", ["color: #8888a0", "margin-top: 4px", "margin-bottom: 2px"])
            svHeader.textContent = `Subviews set (${activeStep.subviewRecords.length}):`
            detail.appendChild(svHeader)
            
            for (const sv of activeStep.subviewRecords) {
                const svRow = UILayoutDebugger._el("div", ["padding-left: 8px", "color: #a0a0b8"])
                const svClass = UILayoutDebugger._el("span", ["color: #d8aacc"])
                svClass.textContent = sv.className
                const svEid = UILayoutDebugger._el("span", ["color: #6a6a80"])
                svEid.textContent = ` #${sv.elementID}  `
                const svFrames = UILayoutDebugger._el("span", ["color: #9090a8"])
                svFrames.textContent = UILayoutDebugger._formatFrameDiff(sv.frameBefore, sv.frameAfter)
                svRow.append(svClass, svEid, svFrames)
                detail.appendChild(svRow)
            }
        }
        
        return detail
    }
    
    static _subtreeHasTouched(node: UILayoutDebugTreeNode, countMap: Map<number, number>): boolean {
        if ((countMap.get(node.viewIndex) ?? 0) > 0) { return true }
        for (const child of node.children) {
            if (UILayoutDebugger._subtreeHasTouched(child, countMap)) { return true }
        }
        return false
    }
    
    static _subtreeContains(node: UILayoutDebugTreeNode, viewIndex: number): boolean {
        if (node.viewIndex === viewIndex) { return true }
        for (const child of node.children) {
            if (UILayoutDebugger._subtreeContains(child, viewIndex)) { return true }
        }
        return false
    }
    
    static _renderTreeNode(
        node: UILayoutDebugTreeNode,
        container: HTMLElement,
        countMap: Map<number, number>,
        activeViewIndex: number,
        expandState: Map<number, boolean> | null,
        stepMap: Map<number, UILayoutDebugStep>,
    ): HTMLElement | null {
        const count = countMap.get(node.viewIndex) ?? 0
        const isActive = node.viewIndex === activeViewIndex && activeViewIndex >= 0
        const hasChildren = node.children.length > 0
        
        // Expand only if this node is on the path to the active view.
        // If there is no active view, fall back to "has touched descendants"
        // so the tree isn't entirely collapsed before any step is selected.
        const isAncestorOfActive = activeViewIndex >= 0
                                   ? UILayoutDebugger._subtreeContains(node, activeViewIndex)
                                   : node.children.some(c => UILayoutDebugger._subtreeHasTouched(c, countMap))
        const defaultExpanded = isAncestorOfActive || isActive
        
        let childrenExpanded: boolean
        if (expandState !== null) {
            if (!expandState.has(node.viewIndex)) {
                expandState.set(node.viewIndex, defaultExpanded)
            }
            childrenExpanded = expandState.get(node.viewIndex)!
        }
        else {
            childrenExpanded = defaultExpanded
        }
        
        // ── Row ──────────────────────────────────────────────────────────────
        const row = UILayoutDebugger._el("div", [
            "display: flex",
            "align-items: baseline",
            "padding: 1px 10px 1px " + (10 + node.depth * 12) + "px",
            "cursor: " + (hasChildren ? "pointer" : "default"),
            "border-radius: 3px",
            "margin: 0 4px",
            isActive
            ? "background: rgba(100,120,220,0.35); outline: 1px solid #59599b"
            : "background: transparent",
        ])
        
        // Expand/collapse chevron
        const chevron = UILayoutDebugger._el("span", [
            "display: inline-block",
            "width: 10px",
            "flex-shrink: 0",
            "color: #7070a0",
            "font-size: 8px",
            "margin-right: 2px",
            "text-align: center",
        ])
        chevron.textContent = !hasChildren ? "" : childrenExpanded ? "▾" : "▸"
        
        // Heat dot
        const dot = UILayoutDebugger._el("span", [
            "display: inline-block",
            "width: 7px",
            "height: 7px",
            "border-radius: 50%",
            "margin-right: 5px",
            "flex-shrink: 0",
            "background: " + UILayoutDebugger._heatColor(count),
        ])
        
        // Untouched nodes are muted; touched nodes are bright
        const untouchedColor = count === 0 ? "#9090a8" : "#ffcc88"
        const className = UILayoutDebugger._el("span", [
            "color: " + untouchedColor,
            "font-weight: " + (count > 0 ? "bold" : "normal"),
        ])
        className.textContent = node.className
        
        const eid = UILayoutDebugger._el("span", [
            "color: " + (count === 0 ? "#6a6a80" : "#a0a0b8"),
            "margin-left: 4px",
        ])
        eid.textContent = `#${node.elementID}`
        
        const frameStr = node.frame
                         ? `  ${node.frame.left.toFixed(0)},${node.frame.top.toFixed(0)}  ${node.frame.width.toFixed(0)}×${node.frame.height.toFixed(0)}`
                         : ""
        const frameSpan = UILayoutDebugger._el("span", [
            "color: " + (count === 0 ? "#55556a" : "#7878a0"),
            "margin-left: 4px",
        ])
        frameSpan.textContent = frameStr
        
        // For touched nodes, show what changed in this pass inline
        const step = stepMap.get(node.viewIndex)
        const frameChanged = step
                             ? !UILayoutDebugger._framesEqual(step.frameBefore, step.frameAfter)
                             : false
        const cacheChanged = step
                             ? !UILayoutDebugger._cachesEqual(step.cacheBefore, step.cacheAfter)
                             : false
        
        const deltaSpan = UILayoutDebugger._el("span", [
            "margin-left: 5px",
            "font-size: 9px",
            "flex-shrink: 0",
        ])
        if (frameChanged && cacheChanged) {
            deltaSpan.style.color = "#ffaa55"
            deltaSpan.textContent = "frame+cache"
        }
        else if (frameChanged) {
            deltaSpan.style.color = "#7bc8ff"
            deltaSpan.textContent = UILayoutDebugger._formatFrameDiff(step!.frameBefore, step!.frameAfter)
        }
        else if (cacheChanged) {
            deltaSpan.style.color = "#ffcc88"
            deltaSpan.textContent = "cache changed"
        }
        
        if (count > 0) {
            const countBadge = UILayoutDebugger._el("span", [
                "margin-left: 5px",
                "background: " + UILayoutDebugger._heatColor(count),
                "color: #000",
                "border-radius: 8px",
                "padding: 0 4px",
                "font-size: 9px",
                "font-weight: bold",
            ])
            countBadge.textContent = String(count) + "×"
            if (frameChanged || cacheChanged) {
                row.append(chevron, dot, className, eid, frameSpan, deltaSpan, countBadge)
            }
            else {
                row.append(chevron, dot, className, eid, frameSpan, countBadge)
            }
        }
        else {
            row.append(chevron, dot, className, eid, frameSpan)
        }
        
        // Tooltip on hover
        const cacheStr = UILayoutDebugger._formatCacheSnapshot(node.cacheAfterPass)
        const tooltipLines = [
            node.className + " #" + node.elementID,
            "viewIndex: " + node.viewIndex,
            node.frame
            ? `frame: ${node.frame.left.toFixed(1)}, ${node.frame.top.toFixed(1)}  ${node.frame.width.toFixed(1)}×${node.frame.height.toFixed(1)}`
            : "frame: (none)",
            "laid out: " + count + "×",
            "intrinsic cache (post-pass): " + cacheStr,
        ]
        if (step && frameChanged) {
            tooltipLines.push("frame Δ: " + UILayoutDebugger._formatFrameDiff(step.frameBefore, step.frameAfter))
        }
        if (step && cacheChanged) {
            tooltipLines.push("cache Δ: " + UILayoutDebugger._formatCacheDiff(step.cacheBefore, step.cacheAfter))
        }
        row.title = tooltipLines.join("\n")
        
        container.appendChild(row)
        
        // ── Children container ───────────────────────────────────────────────
        if (!hasChildren) { return isActive ? row : null }
        
        const childContainer = UILayoutDebugger._el("div", [
            "display: " + (childrenExpanded ? "block" : "none"),
        ])
        container.appendChild(childContainer)
        
        let activeRow: HTMLElement | null = isActive ? row : null
        
        for (const child of node.children) {
            const result = UILayoutDebugger._renderTreeNode(
                child, childContainer, countMap, activeViewIndex, expandState, stepMap
            )
            if (result) { activeRow = result }
        }
        
        // Toggle expand/collapse on row click.
        row.onclick = () => {
            childrenExpanded = !childrenExpanded
            if (expandState !== null) {
                expandState.set(node.viewIndex, childrenExpanded)
            }
            childContainer.style.display = childrenExpanded ? "block" : "none"
            chevron.textContent = childrenExpanded ? "▾" : "▸"
        }
        
        return activeRow
    }
    
    
    // ── Formatting helpers ───────────────────────────────────────────────────
    
    static _formatFrame(f: UILayoutDebugFrame | null): string {
        if (!f) { return "(none)" }
        return `${f.left.toFixed(0)},${f.top.toFixed(0)}  ${f.width.toFixed(0)}×${f.height.toFixed(0)}`
    }
    
    static _formatFrameDiff(
        before: UILayoutDebugFrame | null,
        after: UILayoutDebugFrame | null
    ): string {
        if (!before && !after) { return "(no frame data)" }
        const bounds = UILayoutDebugger._boundsBasedDiff
        const fmt = (f: UILayoutDebugFrame | null) => {
            if (!f) { return "(none)" }
            return bounds
                   ? `${f.width.toFixed(0)}×${f.height.toFixed(0)}`
                   : UILayoutDebugger._formatFrame(f)
        }
        if (!before) { return `→ ${fmt(after)}` }
        if (!after)  { return `${fmt(before)} → (none)` }
        const changed = bounds
                        ? (before.width !== after.width || before.height !== after.height)
                        : (before.left !== after.left || before.top !== after.top ||
                before.width !== after.width || before.height !== after.height)
        if (!changed) {
            return `= ${fmt(after)}`
        }
        return `${fmt(before)}  →  ${fmt(after)}`
    }
    
    static _formatCacheSnapshot(c: UILayoutDebugCacheSnapshot | null): string {
        if (!c) { return "(none)" }
        const lines: string[] = []
        if (c.entryCount === 0) {
            lines.push("intrinsic: empty")
        }
        else {
            const intrinsicLines = Object.entries(c.entries).map(([key, val]) => {
                const match = key.match(/h_(\d+(?:\.\d+)?)__w_(\d+(?:\.\d+)?)/)
                const label = match
                              ? (match[1] !== "0" && match[2] !== "0"
                                 ? `h≤${match[1]} w≤${match[2]}`
                                 : match[2] !== "0" ? `w≤${match[2]}` : `h≤${match[1]}`)
                              : key
                return `  ${label}: ${val.width.toFixed(0)}×${val.height.toFixed(0)}`
            })
            const prefix = c.isShared ? `shared(${c.sharedKey}) ` : ""
            lines.push(`${prefix}${c.entryCount} entr${c.entryCount === 1 ? "y" : "ies"}`)
            lines.push(...intrinsicLines)
        }
        lines.push(c.hasFrameCache
                   ? `frameCache: ${UILayoutDebugger._formatFrame(c.frameCache)}`
                   : "frameCache: (empty)")
        lines.push(c.hasVirtualFrameCache
                   ? `virtualFrameCache: ${UILayoutDebugger._formatFrame(c.virtualFrameCache)}`
                   : "virtualFrameCache: (empty)")
        return lines.join("\n")
    }
    
    static _formatCacheDiff(
        before: UILayoutDebugCacheSnapshot | null,
        after: UILayoutDebugCacheSnapshot | null
    ): string {
        if (!before && !after) { return "(no cache data)" }
        const bCount = before?.entryCount ?? 0
        const aCount = after?.entryCount ?? 0
        if (bCount === 0 && aCount === 0 && !before?.hasFrameCache && !after?.hasFrameCache && !before?.hasVirtualFrameCache && !after?.hasVirtualFrameCache) { return "empty → empty" }
        
        const lines: string[] = []
        const allKeys = new Set([
            ...Object.keys(before?.entries ?? {}),
            ...Object.keys(after?.entries ?? {}),
        ])
        for (const key of allKeys) {
            const b = before?.entries[key]
            const a = after?.entries[key]
            const match = key.match(/h_(\d+(?:\.\d+)?)__w_(\d+(?:\.\d+)?)/)
            const label = match
                          ? (match[1] !== "0" && match[2] !== "0"
                             ? `h≤${match[1]} w≤${match[2]}`
                             : match[2] !== "0" ? `w≤${match[2]}` : `h≤${match[1]}`)
                          : key
            if (!b) {
                lines.push(`  + ${label}: ${a!.width.toFixed(0)}×${a!.height.toFixed(0)}`)
            }
            else if (!a) {
                lines.push(`  - ${label}: ${b.width.toFixed(0)}×${b.height.toFixed(0)}`)
            }
            else if (b.width !== a.width || b.height !== a.height) {
                lines.push(`  ~ ${label}: ${b.width.toFixed(0)}×${b.height.toFixed(0)} → ${a.width.toFixed(0)}×${a.height.toFixed(0)}`)
            }
            else {
                lines.push(`  = ${label}: ${a.width.toFixed(0)}×${a.height.toFixed(0)}`)
            }
        }
        
        // Frame cache diff
        const bHasF = before?.hasFrameCache ?? false
        const aHasF = after?.hasFrameCache ?? false
        if (bHasF || aHasF) {
            if (bHasF && !aHasF) {
                lines.push(`  - frameCache: ${UILayoutDebugger._formatFrame(before!.frameCache)}`)
            }
            else if (!bHasF && aHasF) {
                lines.push(`  + frameCache: ${UILayoutDebugger._formatFrame(after!.frameCache)}`)
            }
            else {
                const bf = before!.frameCache, af = after!.frameCache
                const changed = !bf || !af || bf.top !== af.top || bf.left !== af.left || bf.width !== af.width || bf.height !== af.height
                lines.push(changed
                           ? `  ~ frameCache: ${UILayoutDebugger._formatFrame(bf)} → ${UILayoutDebugger._formatFrame(af)}`
                           : `  = frameCache: ${UILayoutDebugger._formatFrame(af)}`)
            }
        }
        else {
            lines.push("  = frameCache: (empty)")
        }
        
        // Virtual frame cache diff
        const bHasV = before?.hasVirtualFrameCache ?? false
        const aHasV = after?.hasVirtualFrameCache ?? false
        if (bHasV || aHasV) {
            if (bHasV && !aHasV) {
                lines.push(`  - virtualFrameCache: ${UILayoutDebugger._formatFrame(before!.virtualFrameCache)}`)
            }
            else if (!bHasV && aHasV) {
                lines.push(`  + virtualFrameCache: ${UILayoutDebugger._formatFrame(after!.virtualFrameCache)}`)
            }
            else {
                const bv = before!.virtualFrameCache, av = after!.virtualFrameCache
                const changed = !bv || !av || bv.top !== av.top || bv.left !== av.left || bv.width !== av.width || bv.height !== av.height
                lines.push(changed
                           ? `  ~ virtualFrameCache: ${UILayoutDebugger._formatFrame(bv)} → ${UILayoutDebugger._formatFrame(av)}`
                           : `  = virtualFrameCache: ${UILayoutDebugger._formatFrame(av)}`)
            }
        }
        
        const header = bCount === aCount
                       ? `${aCount} entr${aCount === 1 ? "y" : "ies"}`
                       : `${bCount} → ${aCount} entries`
        return lines.length ? `${header}\n${lines.join("\n")}` : header
    }
    
    static _heatColor(count: number): string {
        if (count === 0) { return "#4a4a5a" }
        if (count === 1) { return "#3a8" }
        if (count === 2) { return "#e80" }
        return "#d33"
    }
    
    static _el(tag: string, styles: string[]): HTMLElement {
        const el = document.createElement(tag)
        el.style.cssText = styles.join("; ")
        return el
    }
    
    static _btnStyle(color: string): string[] {
        return [
            `color: ${color}`,
            "background: rgba(255,255,255,0.06)",
            "border: 1px solid rgba(255,255,255,0.1)",
            "border-radius: 4px",
            "padding: 1px 6px",
            "font: inherit",
            "cursor: pointer",
            "flex-shrink: 0",
        ]
    }
    
    
    // ── Drag-to-move ─────────────────────────────────────────────────────────
    
    static _makeDraggable(panel: HTMLElement) {
        let dragging = false
        let startX = 0, startY = 0, origRight = 8, origTop = 8
        
        panel.addEventListener("mousedown", (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest("[data-drag-handle]")) { return }
            dragging = true
            startX = e.clientX
            startY = e.clientY
            origRight = parseInt(panel.style.right, 10) || 8
            origTop = parseInt(panel.style.top, 10) || 8
            e.preventDefault()
        })
        
        document.addEventListener("mousemove", (e: MouseEvent) => {
            if (!dragging) { return }
            const dx = e.clientX - startX
            const dy = e.clientY - startY
            panel.style.right = (origRight - dx) + "px"
            panel.style.top = (origTop + dy) + "px"
        })
        
        document.addEventListener("mouseup", () => { dragging = false })
    }
    
}


// ── Window registration & global helpers ─────────────────────────────────────

window.UILayoutDebugger = UILayoutDebugger

declare global {
    interface Window {
        UILayoutDebugger?: typeof UILayoutDebugger
    }
}

/// #endif
