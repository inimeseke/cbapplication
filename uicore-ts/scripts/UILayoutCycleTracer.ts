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
 *   - The call stack at the point of the re-queue (setNeedsLayout call)
 *   - How many times the view has been laid out in this pass
 *
 * Integration:
 *   Call UILayoutCycleTracer.willBeginLayoutPass() at the start of
 *   layoutViewsIfNeeded(), UILayoutCycleTracer.didLayoutView(view) after each
 *   view is laid out, and UILayoutCycleTracer.viewDidCallSetNeedsLayout(view)
 *   from setNeedsLayout() while a pass is active.
 */
export class UILayoutCycleTracer {
    
    static _isEnabled: boolean = false
    static _isPassActive: boolean = false
    static _layoutCountsThisPass: Map<any, number> = new Map()
    static _setNeedsLayoutCallsThisPass: Map<any, { count: number; stacks: string[] }> = new Map()
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
    
    static enable() {
        // Maximise the V8 stack trace depth so long chains are fully visible.
        // The default is 10 which truncates most interesting call stacks.
        ;(Error as any).stackTraceLimit = 100
        UILayoutCycleTracer._isEnabled = true
        console.log(
            "%c[UILayoutCycleTracer] Layout cycle tracing ENABLED (Error.stackTraceLimit = 100)",
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
        UILayoutCycleTracer._setNeedsLayoutCallsThisPass = new Map()
        UILayoutCycleTracer._currentIteration = 0
        UILayoutCycleTracer._totalReportsThisPass = 0
    }
    
    /**
     * Called after each iteration increment in the layoutViewsIfNeeded() while loop.
     */
    static willBeginIteration(iteration: number) {
        if (!UILayoutCycleTracer._isEnabled) { return }
        UILayoutCycleTracer._currentIteration = iteration
        if (iteration > 0) {
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
        
        const existing = UILayoutCycleTracer._setNeedsLayoutCallsThisPass.get(view)
        if (existing) {
            existing.count++
            existing.stacks.push(cleanStack)
        }
        else {
            UILayoutCycleTracer._setNeedsLayoutCallsThisPass.set(view, { count: 1, stacks: [cleanStack] })
        }
        
        UILayoutCycleTracer._reportCycle(view, layoutCount, cleanStack)
    }
    
    /**
     * Called at the end of a layout pass.
     */
    static didFinishLayoutPass(iterationCount: number) {
        if (!UILayoutCycleTracer._isEnabled) { return }
        UILayoutCycleTracer._isPassActive = false
        
        if (iterationCount > 1) {
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
            parts.push(UILayoutCycleTracer._viewIdentifier(current))
            current = current.superview
            depth++
        }
        return parts.join(" → ")
    }
    
    static _reportCycle(view: any, layoutCountThisPass: number, cleanStack: string) {
        const identifier = UILayoutCycleTracer._viewIdentifier(view)
        const chain = UILayoutCycleTracer._superviewChain(view)
        
        console.groupCollapsed(
            `%c[UILayoutCycleTracer] ⚠️ Layout cycle: ${identifier} re-queued after being laid out ${layoutCountThisPass}x in iteration ${UILayoutCycleTracer._currentIteration + 1}`,
            "color: #F44336; font-weight: bold"
        )
        console.log("%cView:", "font-weight: bold", view)
        console.log("%cSuperview chain:", "font-weight: bold", chain)
        console.log("%cLayout count this pass:", "font-weight: bold", layoutCountThisPass)
        console.log("%cIteration:", "font-weight: bold", UILayoutCycleTracer._currentIteration + 1)
        console.log("%cCall stack (noise frames stripped):", "font-weight: bold")
        cleanStack.split("\n").forEach(frame => console.log("  " + frame.trim()))
        console.groupEnd()
    }
    
}

window.UILayoutCycleTracer = UILayoutCycleTracer

declare global {
    interface Window {
        UILayoutCycleTracer?: typeof UILayoutCycleTracer
    }
}

/// #endif
