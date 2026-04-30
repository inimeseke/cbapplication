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
    static _compareTraceIndex: number = 1    // which trace is shown in right pane
    static _compareStepIndex: number = -1
    
    // Shared expand/collapse state for the tree in compare mode, keyed by
    // viewIndex. When both trees render from the same map, toggling one node
    // collapses/expands the same node in both panes simultaneously.
    static _sharedExpandState: Map<number, boolean> = new Map()
    
    
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
        UILayoutDebugger._triggerMap = new Map()
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
    
    static _captureStateSnapshot(label: string): UILayoutDebugStateSnapshot | null {
        const rootView = UILayoutDebugger._lastKnownRootView
        if (!rootView) { return null }
        
        const views = new Map<number, UILayoutDebugViewState>()
        UILayoutDebugger._walkViewTree(rootView, views, new Set())
        
        return { label, takenAt: Date.now(), views }
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
            const isNoise = UILayoutDebugger._noiseFramePrefixes.some(prefix =>
                trimmed.includes(prefix)
            )
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
        const match = firstLine.match(/at\s+([\w.<>$]+)\s+\(/)
        if (match) { return match[1] }
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
        return {
            entryCount: Object.keys(entries).length,
            entries,
            isShared,
            sharedKey,
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
    
    // Persists across passes so captureBaseline() works between passes.
    static _lastKnownRootView: any = null
    
    // ── Overlay UI ───────────────────────────────────────────────────────────
    
    static _overlayRoot: HTMLElement | null = null
    static _overlayVisible: boolean = true
    
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
        root.style.width = cmp ? "1140px" : "570px"
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
        
        headerRow1.append(title, bpBtn, cmpBtn, filterBtn, clearBtn, toggleBtn, closeBtn)
        
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
        
        headerRow2.append(baselineBtn, diffBtn)
        
        // ── Wrap both rows in the header container ────────────────────────────
        const header = UILayoutDebugger._el("div", ["flex-shrink: 0"])
        header.append(headerRow1, headerRow2)
        root.appendChild(header)
        
        if (!UILayoutDebugger._overlayVisible) { return }
        
        // ── Diff mode ────────────────────────────────────────────────────────
        if (UILayoutDebugger._diffMode && UILayoutDebugger._baseline && UILayoutDebugger._diffSnapshot) {
            root.appendChild(UILayoutDebugger._renderDiffPanel(
                UILayoutDebugger._baseline,
                UILayoutDebugger._diffSnapshot,
            ))
            return
        }
        
        // ── Baseline captured but no diff yet ────────────────────────────────
        if (UILayoutDebugger._baseline && !UILayoutDebugger._diffMode) {
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
        
        if (UILayoutDebugger._traces.length === 0) {
            const msg = UILayoutDebugger._el("div", ["padding: 10px 12px", "color: #9090a8", "font-size: 10px"])
            msg.textContent = "No layout pass recorded yet. Trigger a layout to begin."
            root.appendChild(msg)
            return
        }
        
        if (cmp) {
            // ── Two-column compare layout ────────────────────────────────────
            const cols = UILayoutDebugger._el("div", [
                "display: flex",
                "flex: 1",
                "overflow: hidden",
                "min-height: 0",
            ])
            
            const divider = UILayoutDebugger._el("div", [
                "width: 1px",
                "background: rgba(255,255,255,0.10)",
                "flex-shrink: 0",
            ])
            
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
            
            const rightCol = UILayoutDebugger._renderPassColumn(
                UILayoutDebugger._compareTraceIndex,
                UILayoutDebugger._compareStepIndex,
                (si) => { UILayoutDebugger._compareStepIndex = si; UILayoutDebugger._renderOverlay() },
                (ti) => { UILayoutDebugger._compareTraceIndex = ti; UILayoutDebugger._compareStepIndex = -1; UILayoutDebugger._renderOverlay() },
                UILayoutDebugger._sharedExpandState,
                (el) => { rightTreeEl = el },
                () => leftTreeEl,
            )
            
            cols.append(leftCol, divider, rightCol)
            root.appendChild(cols)
        }
        else {
            // ── Single pass layout ───────────────────────────────────────────
            const col = UILayoutDebugger._renderPassColumn(
                UILayoutDebugger._replayTraceIndex,
                UILayoutDebugger._replayStepIndex,
                (si) => { UILayoutDebugger._replayStepIndex = si; UILayoutDebugger._renderOverlay() },
                (ti) => { UILayoutDebugger._replayTraceIndex = ti; UILayoutDebugger._replayStepIndex = -1; UILayoutDebugger._renderOverlay() },
                null,
                () => {},
                () => null,
            )
            col.style.flex = "1"
            root.appendChild(col)
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
        const countMap = new Map<number, number>()
        for (const step of trace.steps) {
            countMap.set(step.viewIndex, (countMap.get(step.viewIndex) ?? 0) + 1)
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
                    treeRoot, treeContainer, countMap, activeViewIndex, expandState
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
    
    static _renderDiffPanel(
        baseline: UILayoutDebugStateSnapshot,
        current: UILayoutDebugStateSnapshot,
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
                const row = UILayoutDebugger._el("div", [
                    "padding: 3px 10px",
                    "border-bottom: 1px solid rgba(255,255,255,0.04)",
                    "font-size: 10px",
                ])
                
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
                
                topLine.append(kindTag, cls, eid)
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
            row.append(chevron, dot, className, eid, frameSpan, countBadge)
        }
        else {
            row.append(chevron, dot, className, eid, frameSpan)
        }
        
        // Tooltip on hover
        const cacheStr = UILayoutDebugger._formatCacheSnapshot(node.cacheAfterPass)
        row.title = [
            node.className + " #" + node.elementID,
            "viewIndex: " + node.viewIndex,
            node.frame
            ? `frame: ${node.frame.left.toFixed(1)}, ${node.frame.top.toFixed(1)}  ${node.frame.width.toFixed(1)}×${node.frame.height.toFixed(1)}`
            : "frame: (none)",
            "laid out: " + count + "×",
            "intrinsic cache (post-pass): " + cacheStr,
        ].join("\n")
        
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
                child, childContainer, countMap, activeViewIndex, expandState
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
        if (!before) { return `→ ${UILayoutDebugger._formatFrame(after)}` }
        if (!after) { return `${UILayoutDebugger._formatFrame(before)} → (none)` }
        const changed =
            before.left !== after.left || before.top !== after.top ||
            before.width !== after.width || before.height !== after.height
        if (!changed) {
            return `= ${UILayoutDebugger._formatFrame(after)}`
        }
        return `${UILayoutDebugger._formatFrame(before)}  →  ${UILayoutDebugger._formatFrame(after)}`
    }
    
    static _formatCacheSnapshot(c: UILayoutDebugCacheSnapshot | null): string {
        if (!c) { return "(none)" }
        if (c.entryCount === 0) { return "empty" }
        const lines = Object.entries(c.entries).map(([key, val]) => {
            // key format: h_0__w_500 → "w=500: 320×48"
            const match = key.match(/h_(\d+(?:\.\d+)?)__w_(\d+(?:\.\d+)?)/)
            const label = match
                          ? (match[1] !== "0" && match[2] !== "0"
                             ? `h≤${match[1]} w≤${match[2]}`
                             : match[2] !== "0" ? `w≤${match[2]}` : `h≤${match[1]}`)
                          : key
            return `  ${label}: ${val.width.toFixed(0)}×${val.height.toFixed(0)}`
        })
        const prefix = c.isShared ? `shared(${c.sharedKey}) ` : ""
        return `${prefix}${c.entryCount} entr${c.entryCount === 1 ? "y" : "ies"}\n${lines.join("\n")}`
    }
    
    static _formatCacheDiff(
        before: UILayoutDebugCacheSnapshot | null,
        after: UILayoutDebugCacheSnapshot | null
    ): string {
        if (!before && !after) { return "(no cache data)" }
        const bCount = before?.entryCount ?? 0
        const aCount = after?.entryCount ?? 0
        if (bCount === 0 && aCount === 0) { return "empty → empty" }
        
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
