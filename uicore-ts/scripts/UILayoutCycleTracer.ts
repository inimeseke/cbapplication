/// #if DEV

/**
 * UILayoutCycleTracer
 *
 * A development-only utility that detects and reports layout cycles in the
 * UIView layout system.
 *
 * A layout cycle occurs when layouting a view causes another setNeedsLayout()
 * call on the same view (or an ancestor) within the same layout pass, causing
 * the loop in layoutViewsIfNeeded() to iterate multiple times.
 *
 * Usage:
 *   UILayoutCycleTracer.enable()    — start tracing
 *   UILayoutCycleTracer.disable()   — stop tracing
 *   UILayoutCycleTracer.isEnabled   — check current state
 *
 * When a cycle is detected, a detailed report is printed to the console
 * including:
 *   - Which view was re-queued
 *   - Its full superview chain
 *   - A state snapshot (isVirtualLayouting, frame size, bounds size, class name)
 *   - The full history of all previous cycle events for the same view this pass,
 *     so the entire oscillation pattern is visible in one place
 *   - The call stack at the point of the re-queue (setNeedsLayout call)
 *   - How many times the view has been laid out in this pass
 *
 * Integration:
 *   Call UILayoutCycleTracer.willBeginLayoutPass() at the start of
 *   layoutViewsIfNeeded(), UILayoutCycleTracer.didLayoutView(view) after each
 *   view is laid out, and UILayoutCycleTracer.viewDidCallSetNeedsLayout(view)
 *   from setNeedsLayout() while a pass is active.
 */

interface UILayoutCycleViewSnapshot {
    isVirtualLayouting: boolean
    frameWidth: number
    frameHeight: number
    boundsWidth: number
    boundsHeight: number
    className: string
    elementID: string
}

interface UILayoutCycleEvent {
    // Which occurrence this is for this view within the current pass (1-based)
    occurrenceIndex: number
    iteration: number
    layoutCountAtTime: number
    callerFunction: string
    snapshot: UILayoutCycleViewSnapshot
    cleanStack: string
}

export class UILayoutCycleTracer {
    
    static _isEnabled: boolean = false
    static _isPassActive: boolean = false
    static _layoutCountsThisPass: Map<any, number> = new Map()
    // Full event history per view, accumulated across the entire pass
    static _eventsThisPass: Map<any, UILayoutCycleEvent[]> = new Map()
    static _currentIteration: number = 0
    static _totalReportsThisPass: number = 0
    
    // How many times a view must be re-queued before reporting.
    // 1 means: report the first time a view is re-queued after being laid out.
    static reportThreshold: number = 1
    
    // Maximum number of cycle reports per layout pass to avoid console flooding.
    static maxReportsPerPass: number = 10
    
    // Prefixes of stack frames that belong to the tracer or framework internals
    // and should be stripped from the top of the captured stack so that the
    // first visible frame is always application code.
    static _noiseFramePrefixes: string[] = [
        "UILayoutCycleTracer",
        "UIView.setNeedsLayout",
        "setNeedsLayout",
        "UIView.didLayoutSubviews",
        "didLayoutSubviews",
        "UIView.layoutSubviews",
        "UIView.layoutIfNeeded",
        "layoutIfNeeded",
        "UIView.layoutViewsIfNeeded",
        "layoutViewsIfNeeded",
    ]
    
    static get isEnabled(): boolean {
        return UILayoutCycleTracer._isEnabled
    }
    
    
    static enable(reportThreshold: number = 1) {
        // Maximise the V8 stack trace depth so long chains are fully visible.
        // The default is 10 which truncates most interesting call stacks.
        ;(Error as any).stackTraceLimit = 100
        UILayoutCycleTracer.reportThreshold = reportThreshold
        UILayoutCycleTracer._isEnabled = true
        console.log(
            `%c[UILayoutCycleTracer] Layout cycle tracing ENABLED (threshold=${reportThreshold}, Error.stackTraceLimit=100)`,
            "color: #4CAF50; font-weight: bold"
        )
    }
    
    static disable() {
        ;(Error as any).stackTraceLimit = 10
        UILayoutCycleTracer._isEnabled = false
        console.log(
            "%c[UILayoutCycleTracer] Layout cycle tracing DISABLED",
            "color: #9E9E9E; font-weight: bold"
        )
    }
    
    /**
     * Called at the very start of each layoutViewsIfNeeded() invocation.
     */
    static willBeginLayoutPass() {
        if (!UILayoutCycleTracer._isEnabled) { return }
        UILayoutCycleTracer._isPassActive = true
        UILayoutCycleTracer._layoutCountsThisPass = new Map()
        UILayoutCycleTracer._eventsThisPass = new Map()
        UILayoutCycleTracer._currentIteration = 0
        UILayoutCycleTracer._totalReportsThisPass = 0
    }
    
    /**
     * Called after each iteration increment in the layoutViewsIfNeeded() while loop.
     */
    static willBeginIteration(iteration: number) {
        if (!UILayoutCycleTracer._isEnabled) { return }
        UILayoutCycleTracer._currentIteration = iteration
        if (iteration > 0 && UILayoutCycleTracer._totalReportsThisPass > 0) {
            console.warn(
                `%c[UILayoutCycleTracer] Layout pass iteration ${iteration + 1} — views were re-queued during the previous iteration`,
                "color: #FF9800; font-weight: bold"
            )
        }
    }
    
    /**
     * Called after a view's layoutIfNeeded() completes.
     */
    static didLayoutView(view: any) {
        if (!UILayoutCycleTracer._isEnabled || !UILayoutCycleTracer._isPassActive) { return }
        const previous = UILayoutCycleTracer._layoutCountsThisPass.get(view) ?? 0
        UILayoutCycleTracer._layoutCountsThisPass.set(view, previous + 1)
    }
    
    /**
     * Called from setNeedsLayout() when a view enters the queue.
     * If a layout pass is currently active, this is a potential cycle.
     */
    static viewDidCallSetNeedsLayout(view: any) {
        if (!UILayoutCycleTracer._isEnabled || !UILayoutCycleTracer._isPassActive) { return }
        
        // Only report if this view has already been laid out at least once this pass.
        const layoutCount = UILayoutCycleTracer._layoutCountsThisPass.get(view) ?? 0
        if (layoutCount < UILayoutCycleTracer.reportThreshold) { return }
        
        if (UILayoutCycleTracer._totalReportsThisPass >= UILayoutCycleTracer.maxReportsPerPass) {
            if (UILayoutCycleTracer._totalReportsThisPass === UILayoutCycleTracer.maxReportsPerPass) {
                console.warn(
                    `%c[UILayoutCycleTracer] Maximum reports per pass (${UILayoutCycleTracer.maxReportsPerPass}) reached. Further reports suppressed.`,
                    "color: #F44336"
                )
                UILayoutCycleTracer._totalReportsThisPass++
            }
            return
        }
        
        UILayoutCycleTracer._totalReportsThisPass++
        
        const rawStack = new Error().stack ?? "(stack unavailable)"
        const cleanStack = UILayoutCycleTracer._cleanStack(rawStack)
        const snapshot = UILayoutCycleTracer._snapshotView(view)
        const callerFunction = UILayoutCycleTracer._extractCallerFunctionName(cleanStack)
        
        // Accumulate this event into the per-view history
        const existingHistory = UILayoutCycleTracer._eventsThisPass.get(view) ?? []
        const newEvent: UILayoutCycleEvent = {
            occurrenceIndex: existingHistory.length + 1,
            iteration: UILayoutCycleTracer._currentIteration,
            layoutCountAtTime: layoutCount,
            callerFunction,
            snapshot,
            cleanStack,
        }
        existingHistory.push(newEvent)
        UILayoutCycleTracer._eventsThisPass.set(view, existingHistory)
        
        UILayoutCycleTracer._reportCycle(view, existingHistory)
    }
    
    /**
     * Called at the end of a layout pass.
     */
    static didFinishLayoutPass(iterationCount: number) {
        if (!UILayoutCycleTracer._isEnabled) { return }
        UILayoutCycleTracer._isPassActive = false
        
        if (iterationCount > 1 && UILayoutCycleTracer._totalReportsThisPass > 0) {
            console.warn(
                `%c[UILayoutCycleTracer] Layout pass completed in ${iterationCount} iteration(s). ` +
                `${UILayoutCycleTracer._totalReportsThisPass} cycle event(s) recorded.`,
                "color: #FF9800"
            )
        }
    }
    
    /**
     * Strips the "Error" header line and any leading framework/tracer noise
     * frames from a raw Error.stack string, so the first frame shown is always
     * the application code that triggered the re-queue.
     */
    static _cleanStack(rawStack: string): string {
        const lines = rawStack.split("\n")
        
        // Find the first line that is NOT the "Error" header and NOT a noise frame.
        let firstAppFrameIndex = 1 // skip "Error" on line 0
        for (let i = 1; i < lines.length; i++) {
            const trimmed = lines[i].trim()
            const isNoise = UILayoutCycleTracer._noiseFramePrefixes.some(prefix =>
                trimmed.includes(prefix)
            )
            if (!isNoise) {
                firstAppFrameIndex = i
                break
            }
        }
        
        return lines.slice(firstAppFrameIndex).join("\n")
    }
    
    /**
     * Extracts the name of the first application function from a cleaned stack string.
     * Returns something like "UIButton.layoutSubviews" or "CellView.layoutSubviews".
     */
    static _extractCallerFunctionName(cleanStack: string): string {
        const firstLine = cleanStack.split("\n")[0]?.trim() ?? ""
        // V8 format: "  at ClassName.methodName (file:line:col)"
        // or:        "  at functionName (file:line:col)"
        const match = firstLine.match(/at\s+([\w.<>$]+)\s+\(/)
        if (match) {
            return match[1]
        }
        // Fallback: return whatever is on the first line, truncated
        return firstLine.substring(0, 80) || "(unknown)"
    }
    
    /**
     * Captures a diagnostic snapshot of a view's current layout state.
     * Safe to call at any point — gracefully handles nil/missing properties.
     */
    static _snapshotView(view: any): UILayoutCycleViewSnapshot {
        const frame = view?.frame
        const bounds = view?.bounds
        return {
            isVirtualLayouting: view?.isVirtualLayouting ?? false,
            frameWidth: frame?.width ?? -1,
            frameHeight: frame?.height ?? -1,
            boundsWidth: bounds?.width ?? -1,
            boundsHeight: bounds?.height ?? -1,
            className: view?.constructor?.name ?? "UnknownView",
            elementID: view?.elementID ?? view?._UIViewIndex ?? "?",
        }
    }
    
    static _formatSnapshotInline(snapshot: UILayoutCycleViewSnapshot): string {
        const virtualTag = snapshot.isVirtualLayouting ? "🔮 VIRTUAL" : "📐 real"
        return (
            `${virtualTag}  ` +
            `frame ${snapshot.frameWidth.toFixed(1)}×${snapshot.frameHeight.toFixed(1)}  ` +
            `bounds ${snapshot.boundsWidth.toFixed(1)}×${snapshot.boundsHeight.toFixed(1)}`
        )
    }
    
    static _viewIdentifier(view: any): string {
        const className = view?.constructor?.name ?? "UnknownView"
        const elementID = view?.elementID ?? view?._UIViewIndex ?? "?"
        return `${className}#${elementID}`
    }
    
    static _superviewChain(view: any): string {
        const parts: string[] = []
        let current = view
        let depth = 0
        while (current && depth < 20) {
            const snapshot = UILayoutCycleTracer._snapshotView(current)
            const virtualTag = snapshot.isVirtualLayouting ? "[VIRTUAL]" : "[real]"
            parts.push(
                `${UILayoutCycleTracer._viewIdentifier(current)} ${virtualTag} ` +
                `frame=${snapshot.frameWidth.toFixed(0)}×${snapshot.frameHeight.toFixed(0)} ` +
                `bounds=${snapshot.boundsWidth.toFixed(0)}×${snapshot.boundsHeight.toFixed(0)}`
            )
            current = current.superview
            depth++
        }
        return parts.join("\n  → ")
    }
    
    /**
     * Prints a single event row inside the history section.
     * Past events are collapsed sub-groups (stack accessible but not noisy).
     * The current event is expanded so it's immediately visible.
     */
    static _printHistoryEvent(event: UILayoutCycleEvent, isCurrent: boolean) {
        const label = isCurrent ? "🆕 NOW" : `#${event.occurrenceIndex}`
        const iterationLabel = `iter ${event.iteration + 1}`
        const snapshotInline = UILayoutCycleTracer._formatSnapshotInline(event.snapshot)
        const title = `  ${label}  ${event.callerFunction}()  [${iterationLabel}]  ${snapshotInline}`
        const titleStyle = isCurrent
                           ? "color: #F44336; font-weight: bold"
                           : "color: #888; font-weight: normal"
        
        if (isCurrent) {
            console.group(`%c${title}`, titleStyle)
        }
        else {
            console.groupCollapsed(`%c${title}`, titleStyle)
        }
        
        console.log(`%c  layoutCount at time: ${event.layoutCountAtTime}`, "color: #aaa")
        console.log("%c  Stack:", "font-weight: bold")
        event.cleanStack.split("\n").forEach(frame => console.log("    " + frame.trim()))
        console.groupEnd()
    }
    
    static _reportCycle(view: any, history: UILayoutCycleEvent[]) {
        const currentEvent = history[history.length - 1]
        const identifier = UILayoutCycleTracer._viewIdentifier(view)
        const chain = UILayoutCycleTracer._superviewChain(view)
        const virtualLabel = currentEvent.snapshot.isVirtualLayouting ? "VIRTUAL" : "real"
        
        console.groupCollapsed(
            `%c[UILayoutCycleTracer] ⚠️ Cycle #${history.length}: ${identifier}  ` +
            `from ${currentEvent.callerFunction}()  ` +
            `[${virtualLabel}, ${currentEvent.snapshot.frameWidth.toFixed(0)}×${currentEvent.snapshot.frameHeight.toFixed(0)}]  ` +
            `laid out ${currentEvent.layoutCountAtTime}x  iter ${currentEvent.iteration + 1}`,
            "color: #F44336; font-weight: bold"
        )
        
        // ── History ────────────────────────────────────────────────────────────
        // Always expanded — this is the primary diagnostic value.
        console.group(
            `%c📜 Full history for this view this pass  (${history.length} event${history.length === 1 ? "" : "s"})`,
            "font-weight: bold; color: #FF9800"
        )
        for (let i = 0; i < history.length; i++) {
            UILayoutCycleTracer._printHistoryEvent(history[i], i === history.length - 1)
        }
        console.groupEnd()
        
        // ── Superview chain ────────────────────────────────────────────────────
        console.groupCollapsed(
            "%c🔗 Superview chain (innermost → root)",
            "font-weight: bold; color: #9C27B0"
        )
        console.log("  " + chain)
        console.groupEnd()
        
        // ── Raw view ───────────────────────────────────────────────────────────
        console.log("%c🖼 Raw view object:", "font-weight: bold", view)
        
        console.groupEnd()
    }
    
    /**
     * Manually prints a full diagnostic report for any view on demand.
     * Call from the browser console: layoutReport(someView)
     *
     * Shows:
     *   - Current state snapshot (isVirtualLayouting, frame, bounds)
     *   - Superview chain with state at each level
     *   - Full cycle history for this view from the most recent pass, if any
     *   - The raw view object for live inspection
     */
    static printViewReport(view: any) {
        if (!view) {
            console.warn("[UILayoutCycleTracer] printViewReport: no view provided")
            return
        }
        
        const identifier = UILayoutCycleTracer._viewIdentifier(view)
        const snapshot = UILayoutCycleTracer._snapshotView(view)
        const chain = UILayoutCycleTracer._superviewChain(view)
        const history = UILayoutCycleTracer._eventsThisPass.get(view)
        
        console.group(
            `%c[UILayoutCycleTracer] 🔍 Manual report: ${identifier}`,
            "color: #2196F3; font-weight: bold"
        )
        
        // ── Current state ──────────────────────────────────────────────────────
        console.group("%c📸 Current state", "font-weight: bold; color: #2196F3")
        console.log(UILayoutCycleTracer._formatSnapshotInline(snapshot))
        console.groupEnd()
        
        // ── Cycle history ──────────────────────────────────────────────────────
        if (history && history.length > 0) {
            console.group(
                `%c📜 Cycle history from last pass  (${history.length} event${history.length === 1 ? "" : "s"})`,
                "font-weight: bold; color: #FF9800"
            )
            for (let i = 0; i < history.length; i++) {
                UILayoutCycleTracer._printHistoryEvent(history[i], i === history.length - 1)
            }
            console.groupEnd()
        }
        else {
            console.log("%c📜 No cycle history recorded for this view in the last pass", "color: #4CAF50")
        }
        
        // ── Superview chain ────────────────────────────────────────────────────
        console.groupCollapsed(
            "%c🔗 Superview chain (innermost → root)",
            "font-weight: bold; color: #9C27B0"
        )
        console.log("  " + chain)
        console.groupEnd()
        
        // ── Raw view ───────────────────────────────────────────────────────────
        console.log("%c🖼 Raw view object:", "font-weight: bold", view)
        
        console.groupEnd()
    }
    
}

window.UILayoutCycleTracer = UILayoutCycleTracer

/**
 * Global convenience function available in the browser console.
 * Usage: layoutReport(someView)
 */
window.layoutReport = (view: any) => UILayoutCycleTracer.printViewReport(view)

declare global {
    interface Window {
        UILayoutCycleTracer?: typeof UILayoutCycleTracer
        layoutReport: (view: any) => void
    }
}

/// #endif
