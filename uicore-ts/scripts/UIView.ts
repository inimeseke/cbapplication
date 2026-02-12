import { IS_FIREFOX, IS_SAFARI } from "./ClientCheckers"
import toPx from "./SizeConverter"
import { UIColor } from "./UIColor"
import { UICore } from "./UICore"
import "./UICoreExtensions"
import type { UIDialogView } from "./UIDialogView"
import { UILocalizedTextObject } from "./UIInterfaces"
import {
    FIRST,
    FIRST_OR_NIL,
    IF,
    IS,
    IS_DEFINED,
    IS_NIL,
    IS_NOT,
    IS_NOT_LIKE_NULL,
    nil,
    NO,
    RETURNER, UIInitializerObject,
    UIObject,
    YES
} from "./UIObject"
import { UIPoint } from "./UIPoint"
import { UIRectangle } from "./UIRectangle"
import { UIViewController } from "./UIViewController"


declare module AutoLayout {
    
    
    class Constraint {
        
        [key: string]: any
        
    }
    
    
    class View {
        
        [key: string]: any
        
    }
    
    
    class VisualFormat {
        
        static parse(arg0: any, arg1: any): any;
        
        [key: string]: any
        
    }
    
    
    const enum Attribute {
        
        LEFT = 0,
        RIGHT = 1,
        BOTTOM = 2,
        TOP = 3,
        CENTERX = 4,
        CENTERY = 5,
        WIDTH = 6,
        HEIGHT = 7,
        ZINDEX = 8,
        VARIABLE = 9,
        NOTANATTRIBUTE = 10
        
    }
    
    
    const enum Relation {
        
        EQU = 0,
        LEQ = 1,
        GEQ = 2
        
    }
    
    
}

// @ts-ignore
if (!window.AutoLayout) {
    
    // @ts-ignore
    window.AutoLayout = nil
    
}


declare global {
    
    interface HTMLElement {
        
        UIViewObject?: UIView;
        
    }
    
}


export interface LooseObject {
    [key: string]: any
}


export interface ControlEventTargetsObject {
    
    [key: string]: Function[];
    
}


export interface UIViewBroadcastEvent {
    
    name: string;
    parameters?: {
        [key: string]: string | string[];
    }
    
}


type Mutable<T> = {
    -readonly [P in keyof T]: T[P]
};

export type UIViewAddControlEventTargetObject<T extends { controlEvent: Record<string, any> }> = Mutable<{
    
    [K in keyof T["controlEvent"]]: ((
    sender: UIView,
    event: Event
) => void) & Partial<UIViewAddControlEventTargetObject<T>>

}>


interface Constraint {
    constant: number;
    multiplier: number;
    view1: any;
    attr2: any;
    priority: number;
    attr1: any;
    view2: any;
    relation: any
}


export interface IUILoadingView extends UIView {
    theme: "light" | "dark";
    // Add any other specific methods you need to call from UIView
}


/**
 * A template literal tag to enable CSS highlighting in IDEs.
 * Example: css` .myClass { color: red; } `
 */
export function css(strings: TemplateStringsArray, ...values: any[]): string {
    // Simply combine the strings and values to return a valid CSS string
    return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "")
}


export function UIComponentView(target: Function, context: ClassDecoratorContext) {
    console.log("Recording annotation UIComponentView on " + target.name)
    UIObject.recordAnnotation(UIComponentView, target)
}


export class UIView extends UIObject {
    
    
    _nativeSelectionEnabled: boolean = YES
    _shouldLayout?: boolean
    _UITableViewRowIndex?: number
    _UITableViewReusabilityIdentifier: any
    _UIViewIntrinsicTemporaryWidth?: string
    _UIViewIntrinsicTemporaryHeight?: string
    _enabled: boolean = YES
    _frame?: UIRectangle & { zIndex?: number }
    _frameCache?: UIRectangle
    _backgroundColor: UIColor = UIColor.transparentColor
    
    _viewHTMLElement!: HTMLElement & LooseObject
    
    // Dynamic innerHTML
    _innerHTMLKey?: string
    _defaultInnerHTML?: string
    _parameters?: { [x: string]: (string | UILocalizedTextObject) }
    
    _localizedTextObject?: UILocalizedTextObject
    
    _controlEventTargets: ControlEventTargetsObject = {} //{ "PointerDown": Function[]; "PointerMove": Function[];
                                                         // "PointerLeave": Function[]; "PointerEnter": Function[];
                                                         // "PointerUpInside": Function[]; "PointerUp": Function[];
                                                         // "PointerHover": Function[]; };
    _frameTransform: string
    viewController?: UIViewController
    _updateLayoutFunction?: Function
    // @ts-ignore
    _constraints: any[] //AutoLayout.Constraint[];
    superview?: UIView
    subviews: UIView[] = []
    _styleClasses: any[]
    _isHidden: boolean = NO
    
    pausesPointerEvents: boolean = NO
    stopsPointerEventPropagation: boolean = YES
    pointerDraggingPoint: UIPoint = new UIPoint(0, 0)
    _previousClientPoint: UIPoint = new UIPoint(0, 0)
    _isPointerInside?: boolean
    _isPointerValid?: boolean
    _isPointerValidForMovement?: boolean
    _isPointerDown = NO
    _initialPointerPosition?: UIPoint
    _hasPointerDragged?: boolean
    _pointerDragThreshold = 2
    
    ignoresTouches: boolean = NO
    ignoresMouse: boolean = NO
    
    core: UICore = UICore.main
    
    static _UIViewIndex: number = -1
    _UIViewIndex: number
    
    static _viewsToLayout: UIView[] = []
    
    forceIntrinsicSizeZero: boolean = NO
    _touchEventTime?: number
    
    static _pageScale = 1
    _scale: number = 1
    isInternalScaling: boolean = YES
    static resizeObserver = new ResizeObserver((entries, observer) => {
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]
            // @ts-ignore
            const view: UIView = entry.target.UIView
            view?.didResize?.(entry)
        }
    })
    
    private _isMovable = NO
    makeNotMovable?: () => void
    
    private _isResizable = NO
    makeNotResizable?: () => void
    resizingHandles: UIView[] = []
    
    public static LoadingViewClass: new () => IUILoadingView
    private _loadingView?: IUILoadingView
    
    public set loading(isLoading: boolean) {
        this.userInteractionEnabled = !isLoading
        if (isLoading) {
            if (!IS(this._loadingView)) {
                if (UIView.LoadingViewClass) {
                    this._loadingView = new UIView.LoadingViewClass()
                }
                else {
                    console.warn("UILoadingView class not registered yet.")
                    return
                }
            }
            
            // Add to superview if not already added
            if (this._loadingView.superview != this) {
                this.addSubview(this._loadingView)
                // Ensure it sits above other content
                this._loadingView.style.zIndex = "1000"
            }
            
            // Force an immediate layout update to position the overlay
            // this._loadingView.setFrame(this.bounds)
            
        }
        else {
            this._loadingView?.removeFromSuperview()
        }
    }
    
    public get loading(): boolean {
        return IS(this._loadingView) && IS(this._loadingView.superview)
    }
    
    
    private _isMoving: boolean = NO
    _isCBEditorTemporaryResizable = NO
    _isCBEditorTemporaryMovable = NO
    static _onWindowTouchMove: (event: TouchEvent) => void = nil
    static _onWindowMouseMove: (event: MouseEvent) => void = nil
    static _onWindowMouseup: (event: MouseEvent) => void = nil
    private _resizeObserverEntry?: ResizeObserverEntry
    protected _intrinsicSizesCache: Record<string, UIRectangle> = {}
    
    private static _virtualLayoutingDepth = 0
    
    static get isVirtualLayouting(): boolean {
        return this._virtualLayoutingDepth > 0
    }
    
    get isVirtualLayouting(): boolean {
        return UIView._virtualLayoutingDepth > 0
    }
    
    startVirtualLayout() {
        UIView._virtualLayoutingDepth = UIView._virtualLayoutingDepth + 1
    }
    
    finishVirtualLayout() {
        if (UIView._virtualLayoutingDepth === 0) {
            throw new Error("Unbalanced finishVirtualLayout()")
        }
        UIView._virtualLayoutingDepth = UIView._virtualLayoutingDepth - 1
    }
    
    _frameForVirtualLayouting?: UIRectangle
    _frameCacheForVirtualLayouting?: UIRectangle
    
    // Change this to no if the view contains pure HTML content that does not
    // use frame logic that can influence the intrinsic size
    usesVirtualLayoutingForIntrinsicSizing = YES
    
    _contentInsets = { top: 0, left: 0, bottom: 0, right: 0 }
    
    
    constructor(
        elementID: string = ("UIView" + UIView.nextIndex),
        viewHTMLElement: HTMLElement & LooseObject | null = null,
        elementType: string | null = null,
        preInitConfiguratorObject?: any
    ) {
        
        super()
        
        this.configureWithObject(preInitConfiguratorObject)
        
        // Instance variables
        
        UIView._UIViewIndex = UIView.nextIndex
        this._UIViewIndex = UIView._UIViewIndex
        
        this._styleClasses = []
        
        this._initViewHTMLElement(elementID, viewHTMLElement, elementType)
        
        this._constraints = []
        
        this._frameTransform = ""
        
        this._initViewCSSSelectorsIfNeeded()
        
        this._loadUIEvents()
        this.setNeedsLayout()
        
    }
    
    static get nextIndex() {
        return UIView._UIViewIndex + 1
    }
    
    
    // static get pageHeight() {
    //     const body = document.body
    //     const html = document.documentElement
    //     return Math.max(
    //         body.scrollHeight,
    //         body.offsetHeight,
    //         html.clientHeight,
    //         html.scrollHeight,
    //         html.offsetHeight
    //     )
    // }
    //
    // static get pageWidth() {
    //     const body = document.body
    //     const html = document.documentElement
    //     return Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth)
    // }
    
    //#region Static Properties - Page Dimensions Cache
    
    private static _cachedPageWidth: number | undefined
    private static _cachedPageHeight: number | undefined
    private static _pageDimensionsCacheValid = false
    private static _resizeObserverInitialized = false
    
    //#endregion
    
    //#region Static Methods - Page Dimensions
    
    /**
     * Initialize resize observer to invalidate cache when page dimensions change.
     * This is called lazily on first access.
     */
    private static _initializePageDimensionsCacheIfNeeded() {
        if (this._resizeObserverInitialized) {
            return
        }
        
        this._resizeObserverInitialized = true
        
        // Invalidate cache on window resize
        window.addEventListener("resize", () => {
            this._pageDimensionsCacheValid = false
        }, { passive: true })
        
        // Observe document.body for mutations that might affect dimensions
        const bodyObserver = new ResizeObserver(() => {
            this._pageDimensionsCacheValid = false
        })
        
        // Start observing once body is available
        if (document.body) {
            bodyObserver.observe(document.body)
        }
        else {
            // Wait for DOMContentLoaded if body isn't ready yet
            document.addEventListener("DOMContentLoaded", () => {
                bodyObserver.observe(document.body)
            }, { once: true })
        }
        
        // Also invalidate on DOM mutations that might add/remove content
        const mutationObserver = new MutationObserver(() => {
            this._pageDimensionsCacheValid = false
        })
        
        const observeMutations = () => {
            mutationObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["style", "class"]
            })
        }
        
        if (document.body) {
            observeMutations()
        }
        else {
            document.addEventListener("DOMContentLoaded", observeMutations, { once: true })
        }
    }
    
    /**
     * Compute and cache page dimensions.
     * Only triggers reflow when cache is invalid.
     */
    private static _updatePageDimensionsCacheIfNeeded() {
        if (this._pageDimensionsCacheValid &&
            this._cachedPageWidth !== undefined &&
            this._cachedPageHeight !== undefined) {
            return
        }
        
        const body = document.body
        const html = document.documentElement
        
        // Compute both at once to minimize reflows
        this._cachedPageWidth = Math.max(
            body.scrollWidth,
            body.offsetWidth,
            html.clientWidth,
            html.scrollWidth,
            html.offsetWidth
        )
        
        this._cachedPageHeight = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight
        )
        
        this._pageDimensionsCacheValid = true
    }
    
    static get pageWidth() {
        this._initializePageDimensionsCacheIfNeeded()
        this._updatePageDimensionsCacheIfNeeded()
        return this._cachedPageWidth!
    }
    
    static get pageHeight() {
        this._initializePageDimensionsCacheIfNeeded()
        this._updatePageDimensionsCacheIfNeeded()
        return this._cachedPageHeight!
    }
    
    /**
     * Manually invalidate the page dimensions cache.
     * Useful if you know dimensions changed and want to force a recalculation.
     */
    static invalidatePageDimensionsCache() {
        this._pageDimensionsCacheValid = false
    }
    
    //#endregion
    
    
    centerInContainer() {
        this.style.left = "50%"
        this.style.top = "50%"
        this.style.transform = "translateX(-50%) translateY(-50%)"
    }
    
    
    centerXInContainer() {
        this.style.left = "50%"
        this.style.transform = "translateX(-50%)"
    }
    
    
    centerYInContainer() {
        this.style.top = "50%"
        this.style.transform = "translateY(-50%)"
    }
    
    
    _initViewHTMLElement(
        elementID: string,
        viewHTMLElement: (HTMLElement & LooseObject) | null,
        elementType?: string | null
    ) {
        
        if (!IS(elementType)) {
            elementType = "div"
        }
        
        if (!IS(viewHTMLElement)) {
            
            this._viewHTMLElement = this.createElement(elementID, elementType)
            
            this.style.position = "absolute"
            this.style.margin = "0"
            
        }
        else {
            
            this._viewHTMLElement = viewHTMLElement
            
        }
        
        if (IS(elementID)) {
            this.viewHTMLElement.id = elementID
        }
        
        this.viewHTMLElement.obeyAutolayout = YES
        this.viewHTMLElement.UIViewObject = this
        this.addStyleClass(this.styleClassName)
        
    }
    
    
    set nativeSelectionEnabled(selectable: boolean) {
        this._nativeSelectionEnabled = selectable
        if (!selectable) {
            this.style.cssText = this.style.cssText +
                " -webkit-touch-callout: none; -webkit-user-select: none; " +
                "-khtml-user-select: none; -moz-user-select: none; " +
                "-ms-user-select: none; user-select: none;"
        }
        else {
            this.style.cssText = this.style.cssText +
                " -webkit-touch-callout: text; -webkit-user-select: text; " +
                "-khtml-user-select: text; -moz-user-select: text; " +
                "-ms-user-select: text; user-select: text;"
        }
    }
    
    get nativeSelectionEnabled() {
        return this._nativeSelectionEnabled
    }
    
    get styleClassName() {
        return "UICore_UIView_" + this.class.name
    }
    
    protected _initViewCSSSelectorsIfNeeded() {
        if (!this.class._areViewCSSSelectorsInitialized) {
            this.initViewStyleSelectors()
            this.class._areViewCSSSelectorsInitialized = YES
        }
    }
    
    
    initViewStyleSelectors() {
        
        // Override this in a subclass
        
    }
    
    initStyleSelector(selector: string, style: string) {
        const styleRules = UIView.getStyleRules(selector)
        if (!styleRules) {
            UIView.createStyleSelector(selector, style)
        }
    }
    
    createElement(elementID: string, elementType: string) {
        let result = document.getElementById(elementID)
        if (!result) {
            result = document.createElement(elementType)
        }
        return result
    }
    
    
    public get viewHTMLElement() {
        return this._viewHTMLElement
    }
    
    
    public get elementID() {
        return this.viewHTMLElement.id
    }
    
    setInnerHTML(key: string, defaultString: string, parameters?: { [x: string]: string | UILocalizedTextObject }) {
        
        this._innerHTMLKey = key
        this._defaultInnerHTML = defaultString
        this._parameters = parameters
        
        const languageName = UICore.languageService.currentLanguageKey
        const result = UICore.languageService.stringForKey(key, languageName, defaultString, parameters)
        
        this.innerHTML = result ?? ""
        
    }
    
    
    protected _setInnerHTMLFromKeyIfPossible() {
        if (this._innerHTMLKey && this._defaultInnerHTML) {
            this.setInnerHTML(this._innerHTMLKey, this._defaultInnerHTML, this._parameters)
        }
    }
    
    protected _setInnerHTMLFromLocalizedTextObjectIfPossible() {
        if (IS(this._localizedTextObject)) {
            this.innerHTML = UICore.languageService.stringForCurrentLanguage(this._localizedTextObject)
        }
    }
    
    
    get localizedTextObject() {
        return this._localizedTextObject
    }
    
    
    set localizedTextObject(localizedTextObject: UILocalizedTextObject | undefined) {
        this._localizedTextObject = localizedTextObject
        this._setInnerHTMLFromLocalizedTextObjectIfPossible()
    }
    
    
    get innerHTML() {
        return this.viewHTMLElement.innerHTML
    }
    
    set innerHTML(innerHTML) {
        if (this.innerHTML != innerHTML) {
            this.viewHTMLElement.innerHTML = FIRST(innerHTML, "")
        }
    }
    
    
    set hoverText(hoverText: string | undefined | null) {
        if (IS_NOT_LIKE_NULL(hoverText)) {
            this.viewHTMLElement.setAttribute("title", hoverText)
        }
        else {
            this.viewHTMLElement.removeAttribute("title")
        }
    }
    
    get hoverText() {
        return this.viewHTMLElement.getAttribute("title")
    }
    
    
    get scrollSize() {
        return new UIRectangle(0, 0, this.viewHTMLElement.scrollHeight, this.viewHTMLElement.scrollWidth)
    }
    
    
    get dialogView(): UIDialogView | undefined {
        if (!IS(this.superview)) {
            return
        }
        if (!((this as any)["_isAUIDialogView"])) {
            return this.superview.dialogView
        }
        return this as any as UIDialogView
    }
    
    get rootView(): UIView {
        if (IS(this.superview)) {
            return this.superview.rootView
        }
        return this
    }
    
    public set enabled(enabled: boolean) {
        this._enabled = enabled
        this.updateContentForCurrentEnabledState()
    }
    
    
    public get enabled(): boolean {
        return this._enabled
    }
    
    updateContentForCurrentEnabledState() {
        this.hidden = !this.enabled
        this.userInteractionEnabled = this.enabled
    }
    
    
    public get tabIndex(): number {
        return Number(this.viewHTMLElement.getAttribute("tabindex"))
    }
    
    
    public set tabIndex(index: number) {
        this.viewHTMLElement.setAttribute("tabindex", "" + index)
    }
    
    
    get propertyDescriptors(): { object: UIObject; name: string }[] {
        
        let result: any[] = []
        
        function isPlainObject(value: any): value is object {
            return value instanceof Object && Object.getPrototypeOf(value) === Object.prototype
        }
        
        function isAnArray(value: any): value is any[] {
            return value instanceof Array && Object.getPrototypeOf(value) === Array.prototype
        }
        
        this.withAllSuperviews.forEach(view => {
            
            const descriptorFromObject = function (
                this: UIView,
                object?: object,
                pathRootObject: object = object!,
                existingPathComponents: string[] = [],
                lookInArrays = YES,
                depthLeft = 5
            ): {
                subObjects: { object: object; key: string }[];
                descriptor: { name: string; object: object } | undefined
            } {
                
                let resultDescriptor: { name: string; object: object } | undefined
                const subObjects: { object: object, key: string }[] = []
                const subArrays: { array: any[], key: string }[] = []
                
                FIRST_OR_NIL(object).forEach((value, key, stopLooping) => {
                    
                    if (this == value) {
                        
                        existingPathComponents.push(key)
                        
                        resultDescriptor = { object: pathRootObject!, name: existingPathComponents.join(".") }
                        stopLooping()
                        return
                        
                    }
                    
                    
                    if (
                        isPlainObject(value) &&
                        !_UIViewPropertyKeys.contains(key) &&
                        !_UIViewControllerPropertyKeys.contains(key)
                    ) {
                        subObjects.push({ object: value, key: key })
                    }
                    if (
                        lookInArrays &&
                        isAnArray(value) &&
                        !_UIViewPropertyKeys.contains(key) &&
                        !_UIViewControllerPropertyKeys.contains(key)
                    ) {
                        subArrays.push({ array: value, key: key })
                    }
                    
                })
                
                if (!resultDescriptor && lookInArrays) {
                    
                    subArrays.copy().forEach(value => {
                        
                        if (value.key.startsWith("_")) {
                            
                            subArrays.removeElement(value)
                            subArrays.push(value)
                            
                        }
                        
                    })
                    
                    subArrays.find(arrayObject =>
                        arrayObject.array.find((value, index) => {
                            if (this == value) {
                                existingPathComponents.push(arrayObject.key + "." + index)
                                resultDescriptor = { object: pathRootObject!, name: existingPathComponents.join(".") }
                                return YES
                            }
                            return NO
                        })
                    )
                    
                }
                
                // if (!resultDescriptor && depthLeft) {
                //
                //     // @ts-ignore
                //     resultDescriptor = subObjects.find(object => descriptorFromObject(
                //         object,
                //         pathRootObject,
                //         existingPathComponents,
                //         NO,
                //         depthLeft - 1
                //     ))
                //
                // }
                
                if (resultDescriptor?.object?.constructor?.name == "Object") {
                    
                    var asd = 1
                    
                }
                
                const result = {
                    descriptor: resultDescriptor,
                    subObjects: subObjects
                }
                
                return result
                
            }.bind(this)
            
            const viewControllerResult = descriptorFromObject(view.viewController)
            
            if (viewControllerResult?.descriptor) {
                
                result.push(viewControllerResult.descriptor)
                
            }
            
            const viewResult = descriptorFromObject(view)
            
            if (viewResult?.descriptor) {
                
                result.push(viewResult.descriptor)
                
            }
            else if (this.superview && this.superview == view) {
                
                result.push({ object: view, key: "subviews." + view.subviews.indexOf(this) })
                
            }
            
            
            // view.forEach((value, key, stopLooping) => {
            //
            //     if (this == value) {
            //
            //         result.push({ object: view, name: key })
            //
            //         stopLooping()
            //
            //     }
            //
            // })
            
            
        })
        
        return result
        
    }
    
    get styleClasses() {
        return this._styleClasses
    }
    
    set styleClasses(styleClasses) {
        this._styleClasses = styleClasses
    }
    
    hasStyleClass(styleClass: string) {
        
        // This is for performance reasons
        if (!IS(styleClass)) {
            return NO
        }
        
        const index = this.styleClasses.indexOf(styleClass)
        if (index > -1) {
            return YES
        }
        return NO
        
    }
    
    
    addStyleClass(styleClass: string) {
        
        if (!IS(styleClass)) {
            return
        }
        
        if (!this.hasStyleClass(styleClass)) {
            this._styleClasses.push(styleClass)
        }
        
    }
    
    
    removeStyleClass(styleClass: string) {
        
        // This is for performance reasons
        if (!IS(styleClass)) {
            return
        }
        
        const index = this.styleClasses.indexOf(styleClass)
        if (index > -1) {
            this.styleClasses.splice(index, 1)
        }
        
    }
    
    
    static findViewWithElementID(elementID: string): UIView | undefined {
        const viewHTMLElement = document.getElementById(elementID)
        if (IS_NOT(viewHTMLElement)) {
            return
        }
        // @ts-ignore
        return viewHTMLElement.UIView
    }
    
    
    static injectCSS(cssText: string, id?: string) {
        // Prevent duplicate injection if an ID is supplied
        if (id && document.getElementById(id)) {
            return
        }
        
        const style = document.createElement("style")
        if (id) {
            style.id = id
        }
        
        style.textContent = cssText
        document.head.appendChild(style)
    }
    
    static createStyleSelector(selector: string, style: string) {
        this.injectCSS(selector + " { " + style + " }")
    }
    
    static getStyleRules(selector: string) {
        
        // https://stackoverflow.com/questions/324486/how-do-you-read-css-rule-values-with-javascript
        //Inside closure so that the inner functions don't need regeneration on every call.
        const getCssClasses = (function () {
            function normalize(str: string) {
                if (!str) {
                    return ""
                }
                str = String(str).replace(/\s*([>~+])\s*/g, " $1 ")  //Normalize symbol spacing.
                return str.replace(/(\s+)/g, " ").trim()           //Normalize whitespace
            }
            
            function split(str: string, on: string) {               //Split, Trim, and remove empty elements
                return str.split(on).map(x => x.trim()).filter(x => x)
            }
            
            function containsAny(selText: string | any[], ors: any[]) {
                return selText ? ors.some(x => selText.indexOf(x) >= 0) : false
            }
            
            return function (selector: string) {
                const logicalORs = split(normalize(selector), ",")
                const sheets = Array.from(window.document.styleSheets)
                const ruleArrays = sheets.map((x) => Array.from(x.rules || x.cssRules || []))
                const allRules = ruleArrays.reduce((all, x) => all.concat(x), [])
                // @ts-ignore
                return allRules.filter((x) => containsAny(normalize(x.selectorText), logicalORs))
            }
        })()
        
        return getCssClasses(selector)
        
        // selector = selector.toLowerCase()
        // let styleRules
        // for (let i = 0; i < document.styleSheets.length; i++) {
        //     const styleSheet = document.styleSheets[i] as any
        //
        //     try {
        //
        //         styleRules = styleSheet.cssRules ? styleSheet.cssRules : styleSheet.rules
        //
        //     } catch (error) {
        //
        //         console.log(error)
        //
        //     }
        //
        // }
        //
        // return styleRules
        
    }
    
    get style() {
        return this.viewHTMLElement.style
    }
    
    
    get computedStyle() {
        return getComputedStyle(this.viewHTMLElement)
    }
    
    public get hidden(): boolean {
        return this._isHidden
    }
    
    public set hidden(v: boolean) {
        
        this._isHidden = v
        
        if (this._isHidden) {
            this.style.visibility = "hidden"
        }
        else {
            this.style.visibility = "visible"
        }
        
        
    }
    
    
    static set pageScale(scale: number) {
        
        UIView._pageScale = scale
        
        const zoom = scale
        const width = 100 / zoom
        const viewHTMLElement = UICore.main.rootViewController.view.viewHTMLElement
        viewHTMLElement.style.transformOrigin = "left top"
        viewHTMLElement.style.transform = "scale(" + zoom + ")"
        viewHTMLElement.style.width = width + "%"
        
    }
    
    static get pageScale() {
        return UIView._pageScale
    }
    
    
    set scale(scale: number) {
        
        this._scale = scale
        
        const zoom = scale
        // const width = 100 / zoom
        // const height = 100 / zoom
        const viewHTMLElement = this.viewHTMLElement
        viewHTMLElement.style.transformOrigin = "left top"
        viewHTMLElement.style.transform = viewHTMLElement.style.transform.replace(
            (viewHTMLElement.style.transform.match(
                new RegExp("scale\\(.*\\)", "g")
            )?.firstElement ?? ""),
            ""
        ) + "scale(" + zoom + ")"
        // viewHTMLElement.style.width = width + "%"
        // viewHTMLElement.style.height = height + "%"
        
        if (this.isInternalScaling) {
            
            this.setFrame(this.frame, this.frame.zIndex, YES)
            
        }
        
    }
    
    get scale() {
        
        return this._scale
        
    }
    
    // Use this method to calculate the frame for the view itself
    // This can be used when adding subviews to existing views like buttons
    calculateAndSetViewFrame() {
    
    }
    
    
    public get frame() {
        let result: UIRectangle & { zIndex?: number }
        if (!this.isVirtualLayouting) {
            result = this._frame?.copy() as any
        }
        else {
            result = this._frameForVirtualLayouting?.copy() as any
        }
        if (!result) {
            result = new UIRectangle(
                this._resizeObserverEntry?.contentRect.left ?? this.viewHTMLElement.offsetLeft,
                this._resizeObserverEntry?.contentRect.top ?? this.viewHTMLElement.offsetTop,
                this._resizeObserverEntry?.contentRect.height ?? this.viewHTMLElement.offsetHeight,
                this._resizeObserverEntry?.contentRect.width ?? this.viewHTMLElement.offsetWidth
            ) as any
            result.zIndex = 0
        }
        return result
    }
    
    public set frame(rectangle: UIRectangle & { zIndex?: number }) {
        if (IS(rectangle)) {
            this.setFrame(rectangle, rectangle.zIndex)
        }
    }
    
    // If YES, then the view is not counted in intrinsic content size calculation.
    // This should be used for things like background views that just take the shape of the parent view.
    hasWeakFrame = NO
    
    // Set view as having a weak frame and set the frame.
    public set weakFrame(rectangle: UIRectangle & { zIndex?: number }) {
        this.hasWeakFrame = YES
        this.frame = rectangle
    }
    
    // Set view as having a strong frame and set the frame.
    public set strongFrame(rectangle: UIRectangle & { zIndex?: number }) {
        this.hasWeakFrame = NO
        this.frame = rectangle
    }
    
    
    setFrame(rectangle: UIRectangle & { zIndex?: number }, zIndex = 0, performUncheckedLayout = NO) {
        
        const frame: (UIRectangle & { zIndex?: number }) = this._frame || new UIRectangle(nil, nil, nil, nil) as any
        
        rectangle.materialize()
        
        if (zIndex != undefined) {
            rectangle.zIndex = zIndex
        }
        if (!this.isVirtualLayouting) {
            this._frame = rectangle
        }
        else {
            this._frameForVirtualLayouting = rectangle
        }
        
        if (frame && frame != nil && frame.isEqualTo(
            rectangle) && frame.zIndex == rectangle.zIndex && !performUncheckedLayout) {
            return
        }
        
        if (this.isInternalScaling) {
            rectangle.scale(1 / this.scale)
        }
        
        if (!this.isVirtualLayouting) {
            UIView._setAbsoluteSizeAndPosition(
                this.viewHTMLElement,
                rectangle.topLeft.x,
                rectangle.topLeft.y,
                rectangle.width,
                rectangle.height,
                rectangle.zIndex,
                this.frameTransform
            )
        }
        
        if (frame.height != rectangle.height || frame.width != rectangle.width || performUncheckedLayout) {
            this.setNeedsLayout()
            this.boundsDidChange(this.bounds)
        }
        
    }
    
    get bounds() {
        
        let _frame: (UIRectangle & { zIndex?: number }) | undefined
        if (!this.isVirtualLayouting) {
            _frame = this._frame
        }
        else {
            _frame = this._frameForVirtualLayouting
        }
        
        let result: UIRectangle
        if (IS_NOT(_frame)) {
            let cachedFrame: UIRectangle | undefined
            if (!this.isVirtualLayouting) {
                cachedFrame = this._frameCache
            }
            else {
                cachedFrame = this._frameCacheForVirtualLayouting
            }
            result = cachedFrame ?? new UIRectangle(
                0,
                0,
                this._resizeObserverEntry?.contentRect.height ?? this.viewHTMLElement.offsetHeight,
                this._resizeObserverEntry?.contentRect.width ?? this.viewHTMLElement.offsetWidth
            )
            if (!this.isVirtualLayouting && this.isMemberOfViewTree && this.viewHTMLElement.isConnected) {
                this._frameCache = result
            }
            else if (this.isMemberOfViewTree && this.viewHTMLElement.isConnected) {
                this._frameCacheForVirtualLayouting = result
            }
            
        }
        else {
            let frame: (UIRectangle & { zIndex?: number })
            if (!this.isVirtualLayouting) {
                frame = this.frame
            }
            else {
                frame = this._frameForVirtualLayouting ?? this.frame
            }
            result = frame.copy()
            result.x = 0
            result.y = 0
        }
        
        result.minHeight = 0
        result.minWidth = 0
        
        return result
    }
    
    
    set bounds(rectangle: UIRectangle) {
        const frame = this.frame
        const newFrame = new UIRectangle(frame.topLeft.x, frame.topLeft.y, rectangle.height, rectangle.width)
        // @ts-ignore
        newFrame.zIndex = frame.zIndex
        this.frame = newFrame
    }
    
    boundsDidChange(bounds: UIRectangle) {
    
    
    }
    
    didResize(entry: ResizeObserverEntry) {
        
        this._resizeObserverEntry = entry
        this._frameCache = undefined
        this._frameCacheForVirtualLayouting = undefined
        this.setNeedsLayout()
        
        this.boundsDidChange(new UIRectangle(0, 0, entry.contentRect.height, entry.contentRect.width))
        
    }
    
    get frameTransform(): string {
        return this._frameTransform
    }
    
    set frameTransform(value: string) {
        
        this._frameTransform = value
        
        this.setFrame(this.frame, this.frame.zIndex, YES)
        
    }
    
    setPosition(
        left: number | string = nil,
        right: number | string = nil,
        bottom: number | string = nil,
        top: number | string = nil,
        height: number | string = nil,
        width: number | string = nil
    ) {
        
        const previousBounds = this.bounds
        
        this.setStyleProperty("left", left)
        this.setStyleProperty("right", right)
        this.setStyleProperty("bottom", bottom)
        this.setStyleProperty("top", top)
        this.setStyleProperty("height", height)
        this.setStyleProperty("width", width)
        
        const bounds = this.bounds
        if (bounds.height != previousBounds.height || bounds.width != previousBounds.width) {
            this.setNeedsLayout()
            this.boundsDidChange(bounds)
        }
        
    }
    
    setSizes(height?: number | string, width?: number | string) {
        
        const previousBounds = this.bounds
        
        this.setStyleProperty("height", height)
        this.setStyleProperty("width", width)
        
        const bounds = this.bounds
        if (bounds.height != previousBounds.height || bounds.width != previousBounds.width) {
            this.setNeedsLayout()
            this.boundsDidChange(bounds)
        }
        
    }
    
    setMinSizes(height?: number | string, width?: number | string) {
        
        const previousBounds = this.bounds
        
        this.setStyleProperty("minHeight", height)
        this.setStyleProperty("minWidth", width)
        
        const bounds = this.bounds
        if (bounds.height != previousBounds.height || bounds.width != previousBounds.width) {
            this.setNeedsLayout()
            this.boundsDidChange(bounds)
        }
        
    }
    
    setMaxSizes(height?: number | string, width?: number | string) {
        
        const previousBounds = this.bounds
        
        this.setStyleProperty("maxHeight", height)
        this.setStyleProperty("maxWidth", width)
        
        const bounds = this.bounds
        if (bounds.height != previousBounds.height || bounds.width != previousBounds.width) {
            this.setNeedsLayout()
            this.boundsDidChange(bounds)
        }
        
    }
    
    setMargin(margin?: number | string) {
        
        const previousBounds = this.bounds
        
        this.setStyleProperty("margin", margin)
        
        const bounds = this.bounds
        if (bounds.height != previousBounds.height || bounds.width != previousBounds.width) {
            this.setNeedsLayout()
            this.boundsDidChange(bounds)
        }
        
    }
    
    setMargins(left?: number | string, right?: number | string, bottom?: number | string, top?: number | string) {
        
        const previousBounds = this.bounds
        
        this.setStyleProperty("marginLeft", left)
        this.setStyleProperty("marginRight", right)
        this.setStyleProperty("marginBottom", bottom)
        this.setStyleProperty("marginTop", top)
        
        const bounds = this.bounds
        if (bounds.height != previousBounds.height || bounds.width != previousBounds.width) {
            this.setNeedsLayout()
            this.boundsDidChange(bounds)
        }
        
    }
    
    
    setPadding(padding?: number | string) {
        
        const previousBounds = this.bounds
        
        this.setStyleProperty("padding", padding)
        
        const bounds = this.bounds
        if (bounds.height != previousBounds.height || bounds.width != previousBounds.width) {
            this.setNeedsLayout()
            this.boundsDidChange(bounds)
        }
        
    }
    
    
    setPaddings(left?: number | string, right?: number | string, bottom?: number | string, top?: number | string) {
        
        const previousBounds = this.bounds
        
        this.setStyleProperty("paddingLeft", left)
        this.setStyleProperty("paddingRight", right)
        this.setStyleProperty("paddingBottom", bottom)
        this.setStyleProperty("paddingTop", top)
        
        const bounds = this.bounds
        if (bounds.height != previousBounds.height || bounds.width != previousBounds.width) {
            this.setNeedsLayout()
            this.boundsDidChange(bounds)
        }
        
    }
    
    
    setBorder(
        radius: number | string = nil,
        width: number | string = 1,
        color: UIColor = UIColor.blackColor,
        style: string = "solid"
    ) {
        
        this.setStyleProperty("borderStyle", style)
        
        this.setStyleProperty("borderRadius", radius)
        
        this.setStyleProperty("borderColor", color.stringValue)
        
        this.setStyleProperty("borderWidth", width)
        
    }
    
    setStyleProperty(propertyName: string, value?: number | string) {
        
        try {
            
            if (IS_NIL(value)) {
                return
            }
            if (IS_DEFINED(value) && (value as Number).isANumber) {
                value = "" + (value as number).integerValue + "px"
            }
            
            // @ts-ignore
            this.style[propertyName] = value
            
        }
        catch (exception) {
            
            console.log(exception)
            
        }
        
    }
    
    
    get userInteractionEnabled() {
        return (this.style.pointerEvents != "none")
    }
    
    set userInteractionEnabled(userInteractionEnabled) {
        if (userInteractionEnabled) {
            this.style.pointerEvents = ""
        }
        else {
            this.style.pointerEvents = "none"
        }
    }
    
    
    get backgroundColor() {
        return this._backgroundColor
    }
    
    set backgroundColor(backgroundColor: UIColor) {
        this._backgroundColor = backgroundColor
        this.style.backgroundColor = backgroundColor.stringValue
    }
    
    
    get alpha() {
        return 1 * (this.style.opacity as any)
    }
    
    
    set alpha(alpha) {
        this.style.opacity = "" + alpha
    }
    
    
    static animateViewOrViewsWithDurationDelayAndFunction(
        viewOrViews: UIView | HTMLElement | UIView[] | HTMLElement[],
        duration: number,
        delay: number,
        timingStyle = "cubic-bezier(0.25,0.1,0.25,1)",
        transformFunction: Function,
        transitioncompletionFunction: Function
    ) {
        
        function callTransitioncompletionFunction() {
            (transitioncompletionFunction || nil)();
            (viewOrViews as UIView[] | HTMLElement[]).forEach(view => {
                if (view instanceof UIView) {
                    view.animationDidFinish()
                }
            })
        }
        
        if (IS_FIREFOX) {
            
            // Firefox does not fire the transition completion event properly
            new UIObject().performFunctionWithDelay(delay + duration, callTransitioncompletionFunction)
            
        }
        
        
        if (!(viewOrViews instanceof Array)) {
            viewOrViews = [viewOrViews] as any
        }
        
        const transitionStyles: any[] = []
        const transitionDurations: any[] = []
        const transitionDelays: any[] = []
        const transitionTimings: any[] = []
        
        function isUIView(view: any): view is UIView {
            return IS(view.viewHTMLElement)
        }
        
        for (var i = 0; i < (viewOrViews as any).length; i++) {
            
            let view = (viewOrViews as UIView[] | HTMLElement[])[i]
            
            if (isUIView(view)) {
                view = view.viewHTMLElement
            }
            
            // @ts-ignore
            view.addEventListener("transitionend", transitionDidFinish, true)
            
            transitionStyles.push(view.style.transition)
            transitionDurations.push(view.style.transitionDuration)
            transitionDelays.push(view.style.transitionDelay)
            transitionTimings.push(view.style.transitionTimingFunction)
            
            view.style.transition = "all"
            view.style.transitionDuration = "" + duration + "s"
            view.style.transitionDelay = "" + delay + "s"
            view.style.transitionTimingFunction = timingStyle
            
        }
        
        transformFunction()
        
        const transitionObject = {
            "finishImmediately": finishTransitionImmediately,
            "didFinish": transitionDidFinishManually,
            "views": viewOrViews,
            "registrationTime": Date.now()
        }
        
        function finishTransitionImmediately() {
            for (var i = 0; i < (viewOrViews as any).length; i++) {
                let view = (viewOrViews as UIView[] | HTMLElement[])[i]
                if (isUIView(view)) {
                    view = view.viewHTMLElement
                }
                view.style.transition = "all"
                view.style.transitionDuration = "" + duration + "s"
                view.style.transitionDelay = "" + delay + "s"
                view.style.transition = transitionStyles[i]
                view.style.transitionDuration = transitionDurations[i]
                view.style.transitionDelay = transitionDelays[i]
                view.style.transitionTimingFunction = transitionTimings[i]
            }
        }
        
        function transitionDidFinish(this: HTMLElement, event: { srcElement: HTMLElement | UIView }) {
            let view = event.srcElement
            if (!view) {
                return
            }
            if (isUIView(view)) {
                view = view.viewHTMLElement
            }
            view.style.transition = transitionStyles[i]
            view.style.transitionDuration = transitionDurations[i]
            view.style.transitionDelay = transitionDelays[i]
            view.style.transitionTimingFunction = transitionTimings[i]
            
            callTransitioncompletionFunction()
            
            // @ts-ignore
            view.removeEventListener("transitionend", transitionDidFinish, true)
            
        }
        
        function transitionDidFinishManually() {
            for (let i = 0; i < (viewOrViews as any).length; i++) {
                
                let view = (viewOrViews as UIView[] | HTMLElement[])[i]
                
                if (isUIView(view)) {
                    view = view.viewHTMLElement
                }
                
                view.style.transition = transitionStyles[i]
                view.style.transitionDuration = transitionDurations[i]
                view.style.transitionDelay = transitionDelays[i]
                view.style.transitionTimingFunction = transitionTimings[i]
                
                // @ts-ignore
                view.removeEventListener("transitionend", transitionDidFinish, true)
                
            }
            
            
        }
        
        return transitionObject
        
    }
    
    animationDidFinish() {
    
    
    }
    
    
    static _transformAttribute = (("transform" in document.documentElement.style) ? "transform" : undefined) ||
        (("-webkit-transform" in document.documentElement.style) ? "-webkit-transform" : "undefined") ||
        (("-moz-transform" in document.documentElement.style) ? "-moz-transform" : "undefined") ||
        (("-ms-transform" in document.documentElement.style) ? "-ms-transform" : "undefined") ||
        (("-o-transform" in document.documentElement.style) ? "-o-transform" : "undefined")
    
    
    static _setAbsoluteSizeAndPosition(
        element: HTMLElement & LooseObject,
        left: number,
        top: number,
        width: string | number,
        height: string | number,
        zIndex = 0,
        frameTransform = ""
    ) {
        
        if (!IS(element) || !element.obeyAutolayout && !element.getAttribute("obeyAutolayout")) {
            return
        }
        
        if (IS(height)) {
            height = height.integerValue + "px"
        }
        
        if (IS(width)) {
            width = width.integerValue + "px"
        }
        
        //let str = element.style.cssText
        
        frameTransform =
            "translate3d(" + (left).integerValue + "px, " +
            (top).integerValue + "px, 0px)" + frameTransform
        
        const style = element.style
        
        if (element.UIView) {
            
            frameTransform = frameTransform + (style.transform.match(
                new RegExp("scale\\(.*\\)", "g")
            )?.firstElement ?? "")
            
            //str = str + UIView._transformAttribute + ": " + frameTransform + ";"
            
        }
        
        if (IS_NIL(height)) {
            
            //str = str + " height: unset;"
            height = "unset"
            
        }
        // else {
        //     str = str + " height:" + height + ";"
        // }
        
        if (IS_NIL(width)) {
            
            //str = str + " width: unset;"
            width = "unset"
            
        }
        // else {
        //     str = str + " width:" + width + ";"
        // }
        
        let zIndexString = "" + zIndex
        
        if (IS_NIL(zIndex)) {
            
            //str = str + " z-index: unset;"
            zIndexString = "unset"
            
        }
        // else {
        //     str = str + " z-index:" + zIndex + ";"
        // }
        
        style.transform = frameTransform
        style.height = height
        style.width = width
        style.zIndex = zIndexString
        
        //element.style.cssText = element.style.cssText + str
        
    }
    
    
    static performAutoLayout(
        parentElement: HTMLElement & LooseObject,
        visualFormatArray: string | any[] | null,
        constraintsArray: string | any[]
    ) {
        
        const view = new AutoLayout.View()
        
        if (IS(visualFormatArray) && IS(visualFormatArray.length)) {
            view.addConstraints(AutoLayout.VisualFormat.parse(visualFormatArray, { extended: true }))
        }
        
        if (IS(constraintsArray) && IS(constraintsArray.length)) {
            view.addConstraints(constraintsArray)
        }
        
        const elements: Record<string, HTMLElement> = {}
        for (var key in view.subViews) {
            
            if (!view.subViews.hasOwnProperty(key)) {
                continue
            }
            
            var element = nil
            
            try {
                
                element = parentElement.querySelector("#" + key)
                
            }
            catch (error) {
                
                //console.log("Error occurred " + error);
                
            }
            
            if (!(element && !element.obeyAutolayout && !element.getAttribute("obeyAutolayout")) && element) {
                element.className += element.className ? " abs" : "abs"
                elements[key] = element
            }
            
        }
        
        let parentUIView = nil
        
        if (parentElement.UIView) {
            parentUIView = parentElement.UIView
        }
        
        const updateLayout = function () {
            view.setSize(
                parentElement ? parentElement.clientWidth : window.innerWidth,
                parentElement ? parentElement.clientHeight : window.innerHeight
            )
            for (key in view.subViews) {
                
                if (!view.subViews.hasOwnProperty(key)) {
                    continue
                }
                
                const subView = view.subViews[key]
                
                if (elements[key]) {
                    
                    UIView._setAbsoluteSizeAndPosition(
                        elements[key],
                        subView.left,
                        subView.top,
                        subView.width,
                        subView.height,
                        // @ts-ignore
                        elements[key].UIView.frame.zIndex,
                        // @ts-ignore
                        elements[key].UIView.frameTransform
                    )
                }
            }
            
            parentUIView.didLayoutSubviews()
            
        }
        
        updateLayout()
        return updateLayout
        
    }
    
    
    static runFunctionBeforeNextFrame(step: () => void) {
        
        if (IS_SAFARI) {
            
            // This creates a microtask
            Promise.resolve().then(step)
            
        }
        else {
            
            window.requestAnimationFrame(step)
            
        }
        
    }
    
    
    static scheduleLayoutViewsIfNeeded() {
        
        UIView.runFunctionBeforeNextFrame(UIView.layoutViewsIfNeeded)
        
    }
    
    
    static layoutViewsIfNeeded() {
        const maxIterations = 10
        let iteration = 0
        const layoutCounts = new Map<UIView, number>() // Track how many times each view has been laid out
        
        while (UIView._viewsToLayout.length > 0 && iteration < maxIterations) {
            const viewsToProcess = UIView._viewsToLayout
            UIView._viewsToLayout = []
            
            const viewDepthMap = new Map<UIView, number>()
            
            for (let i = 0; i < viewsToProcess.length; i++) {
                const view = viewsToProcess[i]
                const layoutCount = layoutCounts.get(view) || 0
                
                // Skip if this view has been laid out too many times (cycle detection)
                if (layoutCount >= 5) {
                    console.warn("View layout cycle detected:", view)
                    continue
                }
                
                if (!viewDepthMap.has(view)) {
                    viewDepthMap.set(view, view.withAllSuperviews.length)
                }
            }
            
            const sortedViews = Array.from(viewDepthMap.keys()).sort((a, b) => {
                return viewDepthMap.get(a)! - viewDepthMap.get(b)!
            })
            
            for (let i = 0; i < sortedViews.length; i++) {
                const view = sortedViews[i]
                view.layoutIfNeeded()
                layoutCounts.set(view, (layoutCounts.get(view) || 0) + 1)
            }
            
            iteration++
        }
        
        // console.log(iteration + " iterations to finish layout")
        
    }
    
    
    setNeedsLayout() {
        
        if (this._shouldLayout && UIView._viewsToLayout.contains(this)) {
            return
        }
        
        this._shouldLayout = YES
        
        // Register view for layout before next frame
        UIView._viewsToLayout.push(this)
        
        this.clearIntrinsicSizeCache()
        
        if (UIView._viewsToLayout.length == 1) {
            UIView.scheduleLayoutViewsIfNeeded()
        }
        
    }
    
    
    get needsLayout() {
        
        return this._shouldLayout
        
    }
    
    
    layoutIfNeeded() {
        
        if (!this._shouldLayout) {
            return
        }
        
        if (!this.isVirtualLayouting) {
            this._shouldLayout = NO
        }
        
        try {
            
            this.layoutSubviews()
            
        }
        catch (exception) {
            
            console.log(exception)
            
        }
        
    }
    
    layoutSubviews() {
        
        this.willLayoutSubviews()
        
        if (!this.isVirtualLayouting) {
            this._shouldLayout = NO
        }
        
        // Autolayout
        if (this.constraints.length) {
            this._updateLayoutFunction = UIView.performAutoLayout(this.viewHTMLElement, null, this.constraints)
        }
        this._updateLayoutFunction?.()
        
        this.viewController?.layoutViewSubviews()
        
        this.applyClassesAndStyles()
        
        for (let i = 0; i < this.subviews.length; i++) {
            
            const subview = this.subviews[i]
            subview.calculateAndSetViewFrame()
            
        }
        
        // if (this._loadingView && this._loadingView.superview == this) {
        //     this._loadingView.setFrame(this.bounds)
        // }
        
        this.didLayoutSubviews()
        
    }
    
    applyClassesAndStyles() {
        for (let i = 0; i < this.styleClasses.length; i++) {
            const styleClass = this.styleClasses[i]
            if (styleClass && !this.viewHTMLElement.classList.contains(styleClass)) {
                this.viewHTMLElement.classList.add(styleClass)
            }
        }
    }
    
    willLayoutSubviews() {
        
        this.viewController?.viewWillLayoutSubviews()
        
    }
    
    didLayoutSubviews() {
        
        this.viewController?.viewDidLayoutSubviews()
        
    }
    
    get constraints() {
        return this._constraints
    }
    
    
    set constraints(constraints) {
        this._constraints = constraints
    }
    
    addConstraint(constraint: any) {
        this.constraints.push(constraint)
    }
    
    addConstraintsWithVisualFormat(visualFormatArray: string[]) {
        this.constraints = this.constraints.concat(AutoLayout.VisualFormat.parse(
            visualFormatArray,
            { extended: true }
        ))
    }
    
    static constraintWithView(
        view: { isKindOfClass: (arg0: typeof UIView) => any; viewHTMLElement: any; id: any },
        attribute: any,
        relation: any,
        toView: { isKindOfClass: any; viewHTMLElement: any; id: any },
        toAttribute: any,
        multiplier: number,
        constant: number,
        priority: number
    ): Constraint {
        
        let UIViewObject = nil
        let viewID = null
        if (view) {
            if (view.isKindOfClass && view.isKindOfClass(UIView)) {
                UIViewObject = view
                view = view.viewHTMLElement
            }
            viewID = view.id
        }
        
        let toUIViewObject = nil
        let toViewID = null
        if (toView) {
            if (toView.isKindOfClass && view.isKindOfClass(UIView)) {
                toUIViewObject = toView
                toView = toView.viewHTMLElement
            }
            toViewID = toView.id
        }
        
        const constraint = {
            
            view1: viewID,
            attr1: attribute,
            relation: relation,
            view2: toViewID,
            attr2: toAttribute,
            multiplier: multiplier,
            constant: constant,
            priority: priority
            
        }
        
        return constraint
        
    }
    
    
    static constraintAttribute = {
        
        "left": AutoLayout.Attribute.LEFT,
        "right": AutoLayout.Attribute.RIGHT,
        "bottom": AutoLayout.Attribute.BOTTOM,
        "top": AutoLayout.Attribute.TOP,
        "centerX": AutoLayout.Attribute.CENTERX,
        "centerY": AutoLayout.Attribute.CENTERY,
        "height": AutoLayout.Attribute.HEIGHT,
        "width": AutoLayout.Attribute.WIDTH,
        "zIndex": AutoLayout.Attribute.ZINDEX,
        // Not sure what these are for
        "constant": AutoLayout.Attribute.NOTANATTRIBUTE,
        "variable": AutoLayout.Attribute.VARIABLE
        
    } as const
    
    
    static constraintRelation = {
        
        "equal": AutoLayout.Relation.EQU,
        "lessThanOrEqual": AutoLayout.Relation.LEQ,
        "greaterThanOrEqual": AutoLayout.Relation.GEQ
        
    } as const
    
    
    subviewWithID(viewID: string): UIView | undefined {
        let resultHTMLElement: Element & { UIView: UIView } | null
        
        try {
            resultHTMLElement = this.viewHTMLElement.querySelector("#" + viewID)
        }
        catch (error) {
            console.log(error)
        }
        
        // @ts-ignore
        if (resultHTMLElement && resultHTMLElement.UIView) {
            return resultHTMLElement.UIView
        }
        return
    }
    
    rectangleContainingSubviews() {
        const center = this.bounds.center
        let result = new UIRectangle(center.x, center.y, 0, 0)
        for (let i = 0; i < this.subviews.length; i++) {
            const subview = this.subviews[i]
            let frame = subview.frame
            const rectangleContainingSubviews = subview.rectangleContainingSubviews()
            frame = frame.concatenateWithRectangle(rectangleContainingSubviews)
            result = result.concatenateWithRectangle(frame)
        }
        return result
    }
    
    hasSubview(view: UIView) {
        
        // This is for performance reasons
        if (!IS(view)) {
            return NO
        }
        
        for (let i = 0; i < this.subviews.length; i++) {
            const subview = this.subviews[i]
            if (subview == view) {
                return YES
            }
        }
        return NO
    }
    
    get viewBelowThisView() {
        const result: UIView = (this.viewHTMLElement.previousElementSibling as any || {}).UIView
        return result
    }
    
    get viewAboveThisView() {
        const result: UIView = (this.viewHTMLElement.nextElementSibling as any || {}).UIView
        return result
    }
    
    
    addSubview(view: UIView, aboveView?: UIView) {
        
        if (!this.hasSubview(view) && IS(view)) {
            
            view.willMoveToSuperview(this)
            
            if (IS(aboveView)) {
                this.viewHTMLElement.insertBefore(view.viewHTMLElement, aboveView.viewHTMLElement.nextSibling)
                this.subviews.insertElementAtIndex(this.subviews.indexOf(aboveView), view)
            }
            else {
                this.viewHTMLElement.appendChild(view.viewHTMLElement)
                this.subviews.push(view)
            }
            
            view.core = this.core
            view.didMoveToSuperview(this)
            
            if (this.superview && this.isMemberOfViewTree) {
                
                view.broadcastEventInSubtree({
                    name: UIView.broadcastEventName.AddedToViewTree,
                    parameters: undefined
                })
                
            }
            
            this.setNeedsLayout()
            
        }
        
    }
    
    
    addSubviews(views: UIView[]) {
        views.forEach(view => this.addSubview(view))
    }
    
    addedAsSubviewToView(view: UIView | undefined, aboveView?: UIView) {
        view?.addSubview(this, aboveView)
        return this
    }
    
    
    moveToBottomOfSuperview() {
        
        if (IS(this.superview)) {
            
            const bottomView = this.superview.subviews.firstElement
            
            if (bottomView == this) {
                return
            }
            
            this.superview.subviews.removeElement(this)
            this.superview.subviews.insertElementAtIndex(0, this)
            this.superview.viewHTMLElement.insertBefore(this.viewHTMLElement, bottomView.viewHTMLElement)
            
        }
        
    }
    
    
    moveToTopOfSuperview() {
        
        if (IS(this.superview)) {
            
            const topView = this.superview.subviews.lastElement
            
            if (topView == this) {
                return
            }
            
            this.superview.subviews.removeElement(this)
            this.superview.subviews.push(this)
            this.superview.viewHTMLElement.appendChild(this.viewHTMLElement)
            
        }
        
    }
    
    
    cancelNeedsLayout() {
        this._shouldLayout = NO
    }
    
    removeFromSuperview() {
        if (IS(this.superview)) {
            this.forEachViewInSubtree(view => {
                view.blur()
                view.cancelNeedsLayout()
            })
            this.cancelNeedsLayout()
            const index = this.superview.subviews.indexOf(this)
            if (index > -1) {
                this.superview.subviews.splice(index, 1)
                this.superview.viewHTMLElement.removeChild(this.viewHTMLElement)
                this.superview = undefined
                this.broadcastEventInSubtree({
                    name: UIView.broadcastEventName.RemovedFromViewTree,
                    parameters: undefined
                })
                
            }
        }
    }
    
    willAppear() {
    
    
    }
    
    willMoveToSuperview(superview: UIView) {
        this._setInnerHTMLFromKeyIfPossible()
        this._setInnerHTMLFromLocalizedTextObjectIfPossible()
    }
    
    didMoveToSuperview(superview: UIView) {
        this.superview = superview
    }
    
    wasAddedToViewTree() {
        
        UIView.resizeObserver.observe(this.viewHTMLElement)
        
    }
    
    
    wasRemovedFromViewTree() {
        
        UIView.resizeObserver.unobserve(this.viewHTMLElement)
        
    }
    
    
    get isMemberOfViewTree() {
        let element: HTMLElement & LooseObject | null = this.viewHTMLElement
        for (let i = 0; element; i = i) {
            if (element.parentElement && element.parentElement == document.body) {
                return YES
            }
            element = element.parentElement
        }
        return NO
    }
    
    
    get withAllSuperviews() {
        const result = []
        let view: UIView | undefined = this
        for (let i = 0; IS(view); i = i) {
            result.push(view)
            view = view.superview
        }
        return result
    }
    
    get elementWithAllSuperviewElements(): HTMLElement[] {
        const result = []
        let view: (HTMLElement & { UIView?: UIView }) | undefined | null = this.viewHTMLElement
        for (let i = 0; IS(view); i = i) {
            if (!view) {
                return result
            }
            result.push(view)
            view = view.parentElement
        }
        return result
    }
    
    
    setNeedsLayoutOnAllSuperviews() {
        this.withAllSuperviews.reverse().everyElement.setNeedsLayout()
    }
    
    
    setNeedsLayoutUpToRootView() {
        this.setNeedsLayoutOnAllSuperviews()
        this.setNeedsLayout()
    }
    
    
    focus() {
        this.viewHTMLElement.focus()
    }
    
    
    blur() {
        this.viewHTMLElement.blur()
    }
    
    get isMovable(): boolean {
        return this._isMovable
    }
    
    set isMovable(isMovable: boolean) {
        if (isMovable) {
            this.makeMovable()
        }
        else {
            this.makeNotMovable?.()
        }
    }
    
    
    makeMovable(
        optionalParameters: {
            shouldMoveWithMouseEvent?: (
                sender: UIView,
                event: MouseEvent
            ) => boolean; viewDidMoveToPosition?: (view: UIView, isMovementCompleted: boolean) => void
        } = {}
    ) {
        
        if (this.isMovable) {
            return
        }
        
        //const overlayElement = optionalParameters.overlayElement ?? this.viewHTMLElement
        const shouldMoveWithMouseEvent = optionalParameters.shouldMoveWithMouseEvent ?? ((
            sender,
            event
        ) => IS(event.altKey))
        
        let viewValuesBeforeModifications: any[] = []
        let startPoint: UIPoint
        let views: UIView[]
        
        const movementFunction = (sender: UIView, event: Event) => {
            
            if (event instanceof MouseEvent && shouldMoveWithMouseEvent(sender, event)) {
                
                if (!this._isMoving) {
                    
                    startPoint = this.frame.min
                    
                    sender.pointerDraggingPoint = new UIPoint(0, 0)
                    //const neighbouringViews = sender.superview.subviews
                    views = sender.withAllSuperviews //.concat(neighbouringViews)
                    // sender.moveToTopOfSuperview()
                    
                    sender.forEachViewInSubtree(view => {
                        
                        // Cancel pointer
                        view.sendControlEventForKey(UIView.controlEvent.PointerCancel, event)
                        
                    })
                    
                    viewValuesBeforeModifications = views.everyElement.configureWithObject({
                        style: { cursor: "move" },
                        nativeSelectionEnabled: NO,
                        pausesPointerEvents: YES,
                        shouldCallPointerUpInside: async () => NO
                    }) as any[]
                    
                    this._isMoving = YES
                    
                }
                
                sender.frame = sender.frame
                    .rectangleWithX(startPoint.x + sender.pointerDraggingPoint.x)
                    .rectangleWithY(startPoint.y + sender.pointerDraggingPoint.y)
                
                optionalParameters.viewDidMoveToPosition?.(this, NO)
                
            }
            else if (this._isMoving) {
                
                movementStopFunction(sender, event)
                
            }
            
        }
        
        const movementStopFunction = (sender: UIView, event: Event) => {
            
            if (IS_NIL(event) || !this._isMoving) {
                return
            }
            
            views?.forEach(
                (view, index) => {
                    
                    view.configureWithObject(viewValuesBeforeModifications[index])
                    //view.shouldCallPointerUpInside = () => UIView.shouldCallPointerUpInsideOnView(view)
                    
                }
            )
            
            optionalParameters.viewDidMoveToPosition?.(this, YES)
            
            this._isMoving = NO
            
        }
        
        const cleanupFunction = () => {
            
            if (!this.isMovable) {
                return
            }
            
            this.removeTargetForControlEvent(UIView.controlEvent.PointerDrag, movementFunction)
            this.removeTargetForControlEvents(
                [UIView.controlEvent.PointerUp, UIView.controlEvent.PointerCancel],
                movementStopFunction
            )
            
            this._isMovable = NO
            
            this.makeNotMovable = undefined
            
        }
        
        this.controlEventTargetAccumulator.PointerDrag = movementFunction
        this.controlEventTargetAccumulator.PointerUp.PointerCancel = movementStopFunction
        
        //UIObject.configureWithObject(overlayElement, { remove: EXTEND(() => cleanupFunction()) })
        
        this._isMovable = YES
        
        this.makeNotMovable = cleanupFunction
        
    }
    
    get isResizable(): boolean {
        return this._isResizable
    }
    
    
    set isResizable(isResizable: boolean) {
        if (isResizable) {
            this.makeResizable()
        }
        else {
            this.makeNotResizable?.()
        }
    }
    
    
    makeResizable(
        optionalParameters: {
            overlayElement?: HTMLElement;
            borderWidth?: number;
            borderColor?: UIColor;
            cornerSize?: string;
            maxCornerSize?: string;
            viewDidChangeToSize?: (
                view: UIView,
                isMovementCompleted: boolean
            ) => void
        } = {}
    ) {
        
        if (this.isResizable) {
            return
        }
        
        const overlayElement = optionalParameters.overlayElement ?? this.viewHTMLElement
        
        const borderWidth = IF(optionalParameters.borderWidth)(RETURNER(optionalParameters.borderWidth + "px"))
                .ELSE(RETURNER(undefined)) ||
            overlayElement.style.borderWidth ||
            this.style.borderWidth || "5px"
        
        const borderColor = optionalParameters.borderColor?.stringValue ??
            // overlayElement.style.borderColor ??
            // view.style.borderColor ??
            UIColor.transparentColor.stringValue
        //this.transformColorForView(view).stringValue
        
        const maxCornerSize = optionalParameters.maxCornerSize ?? "10px"
        const cornerSize = optionalParameters.cornerSize ?? "5%"
        
        let yOverflow = 0
        let xOverflow = 0
        
        const pointerUpFunction = () => {
            yOverflow = 0
            xOverflow = 0
            optionalParameters.viewDidChangeToSize?.(this, YES)
        }
        
        const frameWasChanged = () => {
            const frame = this.frame
            if (this.style.minHeight) {
                frame.height = [
                    frame.height,
                    toPx(this.viewHTMLElement, this.style.minHeight)
                ].max()
            }
            if (this.style.maxHeight) {
                frame.height = [
                    frame,
                    toPx(this.viewHTMLElement, this.style.maxHeight)
                ].min()
            }
            yOverflow = yOverflow + this.frame.height - frame.height
            this.frame = frame
            optionalParameters.viewDidChangeToSize?.(this, NO)
        }
        
        
        const PointerXDragFunction = (centeredOnPosition: number, sender: UIView, event: Event) => {
            
            if (event instanceof MouseEvent) {
                
                const scaleX = this.viewHTMLElement.getBoundingClientRect().width / this.viewHTMLElement.offsetWidth
                const signMultiplier = 1 - 2 * centeredOnPosition
                let movementX = event.movementX / scaleX
                const pageScale = UIView.pageScale
                
                if (xOverflow * signMultiplier > 0 && 0 > movementX) {
                    xOverflow = (xOverflow + movementX / pageScale).integerValue
                    if (xOverflow >= 0) {
                        return
                    }
                    movementX = xOverflow
                    xOverflow = 0
                }
                
                if (xOverflow > 0 && 0 < movementX && signMultiplier < 0) {
                    xOverflow = (xOverflow + signMultiplier * movementX / pageScale).integerValue
                    if (xOverflow >= 0) {
                        return
                    }
                    movementX = xOverflow * signMultiplier
                    xOverflow = 0
                }
                
                const frame = this.frame
                const widthChange = (signMultiplier * movementX) / pageScale
                let frameWidth = frame.width + widthChange
                
                if (this.style.minWidth) {
                    frameWidth = [
                        frameWidth,
                        toPx(this.viewHTMLElement, this.style.minWidth),
                        0
                    ].max()
                }
                
                if (this.style.maxWidth) {
                    frameWidth = [
                        frameWidth,
                        toPx(this.viewHTMLElement, this.style.maxWidth)
                    ].min()
                }
                
                xOverflow = (xOverflow + frame.width + widthChange - frameWidth).integerValue
                this.frame = frame.rectangleWithWidth(frameWidth, centeredOnPosition)
                frameWasChanged()
                
            }
            
        }
        
        const PointerYDragFunction = (centeredOnPosition: number, sender: UIView, event: Event) => {
            
            if (event instanceof MouseEvent) {
                
                const scaleX = this.viewHTMLElement.getBoundingClientRect().width / this.viewHTMLElement.offsetWidth
                const signMultiplier = 1 - 2 * centeredOnPosition
                let movementY = event.movementY / scaleX
                const pageScale = UIView.pageScale
                
                if (yOverflow * signMultiplier > 0 && 0 > movementY) {
                    yOverflow = (yOverflow + movementY / pageScale).integerValue
                    if (yOverflow >= 0) {
                        return
                    }
                    movementY = yOverflow
                    yOverflow = 0
                }
                
                if (yOverflow > 0 && 0 < movementY && signMultiplier < 0) {
                    yOverflow = (yOverflow + signMultiplier * movementY / pageScale).integerValue
                    if (yOverflow >= 0) {
                        return
                    }
                    movementY = yOverflow * signMultiplier
                    yOverflow = 0
                }
                
                const frame = this.frame
                const heightChange = (signMultiplier * movementY) / pageScale
                let frameHeight = frame.height + heightChange
                
                if (this.style.minHeight) {
                    frameHeight = [
                        frameHeight,
                        toPx(this.viewHTMLElement, this.style.minHeight),
                        0
                    ].max()
                }
                
                if (this.style.maxHeight) {
                    frameHeight = [
                        frameHeight,
                        toPx(this.viewHTMLElement, this.style.maxHeight)
                    ].min()
                }
                
                yOverflow = (yOverflow + frame.height + heightChange - frameHeight).integerValue
                this.frame = frame.rectangleWithHeight(frameHeight, centeredOnPosition)
                frameWasChanged()
                
            }
            
        }
        
        
        const leftEdge = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "leftEdge",
                style: {
                    position: "absolute",
                    height: "100%",
                    width: borderWidth,
                    top: "0px",
                    left: "0px",
                    cursor: "col-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        leftEdge.controlEventTargetAccumulator.PointerDrag = PointerXDragFunction.bind(this, 1)
        leftEdge.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        const rightEdge = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "rightEdge",
                style: {
                    position: "absolute",
                    height: "100%",
                    width: borderWidth,
                    top: "0px",
                    right: "0px",
                    cursor: "col-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        rightEdge.controlEventTargetAccumulator.PointerDrag = PointerXDragFunction.bind(this, 0)
        rightEdge.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        // noinspection JSSuspiciousNameCombination
        const bottomEdge = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "bottomEdge",
                style: {
                    position: "absolute",
                    height: borderWidth,
                    width: "100%",
                    bottom: "0px",
                    left: "0px",
                    cursor: "row-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        bottomEdge.controlEventTargetAccumulator.PointerDrag = PointerYDragFunction.bind(this, 0)
        bottomEdge.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        // noinspection JSSuspiciousNameCombination
        const topEdge = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "topEdge",
                style: {
                    position: "absolute",
                    height: borderWidth,
                    width: "100%",
                    top: "0px",
                    right: "0px",
                    cursor: "row-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        topEdge.controlEventTargetAccumulator.PointerDrag = PointerYDragFunction.bind(this, 1)
        topEdge.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
        const pointerDragTLFunction = (sender: UIView, event: Event) => {
            PointerXDragFunction(1, sender, event)
            PointerYDragFunction(1, sender, event)
        }
        
        // noinspection JSSuspiciousNameCombination
        const topLeftCornerTop = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "topLeftCornerTop",
                style: {
                    position: "absolute",
                    height: borderWidth,
                    width: cornerSize,
                    maxWidth: maxCornerSize,
                    top: "0px",
                    left: "0px",
                    cursor: "nwse-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        topLeftCornerTop.controlEventTargetAccumulator.PointerDrag = pointerDragTLFunction
        topLeftCornerTop.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        const topLeftCornerLeft = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "topLeftCornerLeft",
                style: {
                    position: "absolute",
                    height: cornerSize,
                    maxHeight: maxCornerSize,
                    width: borderWidth,
                    top: "0px",
                    left: "0px",
                    cursor: "nwse-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        topLeftCornerLeft.controlEventTargetAccumulator.PointerDrag = pointerDragTLFunction
        topLeftCornerLeft.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
        const pointerDragBLFunction = (sender: UIView, event: Event) => {
            PointerXDragFunction(1, sender, event)
            PointerYDragFunction(0, sender, event)
        }
        
        const bottomLeftCornerLeft = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "bottomLeftCornerLeft",
                style: {
                    position: "absolute",
                    height: cornerSize,
                    maxHeight: maxCornerSize,
                    width: borderWidth,
                    bottom: "0px",
                    left: "0px",
                    cursor: "nesw-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        bottomLeftCornerLeft.controlEventTargetAccumulator.PointerDrag = pointerDragBLFunction
        bottomLeftCornerLeft.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        // noinspection JSSuspiciousNameCombination
        const bottomLeftCornerBottom = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "bottomLeftCornerBottom",
                style: {
                    position: "absolute",
                    height: borderWidth,
                    width: cornerSize,
                    maxWidth: maxCornerSize,
                    bottom: "0px",
                    left: "0px",
                    cursor: "nesw-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        bottomLeftCornerBottom.controlEventTargetAccumulator.PointerDrag = pointerDragBLFunction
        bottomLeftCornerBottom.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
        const pointerDragBRFunction = (sender: UIView, event: Event) => {
            PointerXDragFunction(0, sender, event)
            PointerYDragFunction(0, sender, event)
        }
        
        // noinspection JSSuspiciousNameCombination
        const bottomRightCornerBottom = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "bottomRightCornerBottom",
                style: {
                    position: "absolute",
                    height: borderWidth,
                    width: cornerSize,
                    maxWidth: maxCornerSize,
                    bottom: "0px",
                    right: "0px",
                    cursor: "nwse-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        bottomRightCornerBottom.controlEventTargetAccumulator.PointerDrag = pointerDragBRFunction
        bottomRightCornerBottom.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        const bottomRightCornerRight = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "bottomRightCornerRight",
                style: {
                    position: "absolute",
                    height: cornerSize,
                    maxHeight: maxCornerSize,
                    width: borderWidth,
                    bottom: "0px",
                    right: "0px",
                    cursor: "nwse-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        bottomRightCornerRight.controlEventTargetAccumulator.PointerDrag = pointerDragBRFunction
        bottomRightCornerRight.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
        const pointerDragTRFunction = (sender: UIView, event: Event) => {
            PointerXDragFunction(0, sender, event)
            PointerYDragFunction(1, sender, event)
        }
        
        const topRightCornerRight = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "topRightCornerRight",
                style: {
                    position: "absolute",
                    height: cornerSize,
                    maxHeight: maxCornerSize,
                    width: borderWidth,
                    top: "0px",
                    right: "0px",
                    cursor: "nesw-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        topRightCornerRight.controlEventTargetAccumulator.PointerDrag = pointerDragTRFunction
        topRightCornerRight.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        // noinspection JSSuspiciousNameCombination
        const topRightCornerTop = new UIView().configuredWithObject({
            _viewHTMLElement: {
                className: "topRightCornerTop",
                style: {
                    position: "absolute",
                    height: borderWidth,
                    width: cornerSize,
                    maxWidth: maxCornerSize,
                    top: "0px",
                    right: "0px",
                    cursor: "nesw-resize",
                    backgroundColor: borderColor,
                    pointerEvents: "auto"
                }
            },
            shouldCallPointerUpInside: async () => YES,
            shouldCallPointerHover: async () => YES,
            pausesPointerEvents: YES
        })
        topRightCornerTop.controlEventTargetAccumulator.PointerDrag = pointerDragTRFunction
        topRightCornerTop.controlEventTargetAccumulator.PointerUp = pointerUpFunction
        
        
        const views = [
            
            leftEdge,
            rightEdge,
            bottomEdge,
            topEdge,
            
            topRightCornerTop,
            topLeftCornerTop,
            topLeftCornerLeft,
            bottomLeftCornerLeft,
            bottomLeftCornerBottom,
            bottomRightCornerBottom,
            bottomRightCornerRight,
            topRightCornerRight
        
        ]
        
        views.forEach(view => overlayElement.appendChild(view.viewHTMLElement))
        
        this.resizingHandles = views
        
        this._isResizable = YES
        
        this.makeNotResizable = () => {
            
            if (!this.isResizable) {
                return
            }
            
            views.everyElement.viewHTMLElement.remove()
            this.makeNotResizable = undefined
            this._isResizable = NO
            this.resizingHandles = []
            
        }
        
    }
    
    // noinspection JSUnusedLocalSymbols
    static async shouldCallPointerUpInsideOnView(view: UIView, event: MouseEvent | TouchEvent) {
        
        return YES
        
    }
    
    // noinspection JSUnusedLocalSymbols
    static async shouldCallPointerHoverOnView(view: UIView, event: MouseEvent | TouchEvent) {
        
        return YES
        
    }
    
    // noinspection JSUnusedLocalSymbols
    static async shouldCallPointerLeaveOnView(view: UIView, event: MouseEvent | TouchEvent) {
        
        return YES
        
    }
    
    // noinspection JSUnusedLocalSymbols
    static async shouldCallPointerCancelOnView(view: UIView, event: MouseEvent | TouchEvent) {
        
        return YES
        
    }
    
    shouldCallPointerUpInside(event: MouseEvent | TouchEvent) {
        return UIView.shouldCallPointerUpInsideOnView(this, event)
    }
    
    shouldCallPointerCancel(event: MouseEvent | TouchEvent) {
        return UIView.shouldCallPointerCancelOnView(this, event)
    }
    
    shouldCallPointerHover(event: MouseEvent | TouchEvent) {
        return UIView.shouldCallPointerHoverOnView(this, event)
    }
    
    
    shouldCallPointerLeave(event: MouseEvent | TouchEvent) {
        return UIView.shouldCallPointerLeaveOnView(this, event)
    }
    
    protected _loadUIEvents() {
        
        
        const isTouchEventClassDefined: boolean = NO || (window as any).TouchEvent
        
        const pauseEvent = (event: Event, forced = NO) => {
            
            if (this.pausesPointerEvents || forced) {
                
                if (event.stopPropagation) {
                    event.stopPropagation()
                }
                if (event.preventDefault) {
                    event.preventDefault()
                }
                event.cancelBubble = true
                event.returnValue = false
                return false
                
            }
            
            if (event.stopPropagation && this.stopsPointerEventPropagation) {
                event.stopPropagation()
            }
            
        }
        
        const onMouseDown = (event: MouseEvent) => {
            
            if ((this.ignoresTouches && isTouchEventClassDefined && event instanceof TouchEvent) ||
                ((this.ignoresMouse || (IS(this._touchEventTime) && (Date.now() - this._touchEventTime) > 500)) &&
                    event instanceof MouseEvent)) {
                return
            }
            
            this.sendControlEventForKey(UIView.controlEvent.PointerDown, event)
            
            this._isPointerInside = YES
            this._isPointerValid = YES
            this._isPointerValidForMovement = YES
            this._isPointerDown = YES
            this._initialPointerPosition = new UIPoint(event.clientX, event.clientY)
            if (isTouchEventClassDefined && event instanceof TouchEvent) {
                this._touchEventTime = Date.now()
                this._initialPointerPosition = new UIPoint(event.touches[0].clientX, event.touches[0].clientY)
                if (event.touches.length > 1) {
                    onTouchCancel(event)
                    return
                }
            }
            else {
                this._touchEventTime = nil
                pauseEvent(event)
            }
            
            this._hasPointerDragged = NO
            
            UIView._onWindowTouchMove = onTouchMove
            UIView._onWindowMouseup = onmouseup
            UIView._onWindowMouseMove = onMouseMove
            
        }
        
        const onTouchStart = onMouseDown as any
        
        const onmouseup = async (event: MouseEvent) => {
            
            this._isPointerDown = NO
            
            if (!this._isPointerValid) {
                return
            }
            
            if ((this.ignoresTouches && isTouchEventClassDefined && event instanceof TouchEvent) ||
                (this.ignoresMouse && event instanceof MouseEvent)) {
                return
            }
            
            if (this._isPointerInside && await this.shouldCallPointerUpInside(event)) {
                onPointerUpInside(event)
                if (!this._hasPointerDragged) {
                    this.sendControlEventForKey(UIView.controlEvent.PointerTap, event)
                }
            }
            
            // This has to be sent after the more specific event so that UIButton can ignore it when not highlighted
            this.sendControlEventForKey(UIView.controlEvent.PointerUp, event)
            
            pauseEvent(event)
            
        }
        
        const onTouchEnd = onmouseup
        
        const onmouseout = async (event: MouseEvent) => {
            
            if ((this.ignoresTouches && isTouchEventClassDefined && event instanceof TouchEvent) ||
                (this.ignoresMouse && event instanceof MouseEvent)) {
                return
            }
            
            if (await this.shouldCallPointerLeave(event)) {
                this.sendControlEventForKey(UIView.controlEvent.PointerLeave, event)
            }
            
            this._isPointerInside = NO
            
            pauseEvent(event)
            
        }
        
        const onTouchLeave = onmouseout
        
        const onmouseover = async (event: MouseEvent) => {
            
            if ((this.ignoresTouches && isTouchEventClassDefined && event instanceof TouchEvent) ||
                (this.ignoresMouse && event instanceof MouseEvent)) {
                return
            }
            
            if (await this.shouldCallPointerHover(event)) {
                this.sendControlEventForKey(UIView.controlEvent.PointerHover, event)
            }
            
            this._isPointerInside = YES
            this._isPointerValid = YES
            this._isPointerValidForMovement = YES
            
            pauseEvent(event)
            
        }
        
        const onMouseMove = (event: MouseEvent) => {
            
            // if (this._isPointerDown) {
            //
            //     console.log("Mouse move")
            //
            // }
            
            if (!this._isPointerValid && !this._isPointerValidForMovement) {
                return
            }
            
            if ((this.ignoresTouches && isTouchEventClassDefined && event instanceof TouchEvent) ||
                (this.ignoresMouse && event instanceof MouseEvent)) {
                return
            }
            
            const clientPoint = new UIPoint(
                event.clientX,
                event.clientY
            )
            if (IS_NOT(this._initialPointerPosition)) {
                this._initialPointerPosition = clientPoint
            }
            
            const distanceToInitialPoint = clientPoint.to(this._initialPointerPosition).length
            if (distanceToInitialPoint > this._pointerDragThreshold) {
                this._hasPointerDragged = YES
            }
            
            this.sendControlEventForKey(UIView.controlEvent.PointerMove, event)
            
            if (this._hasPointerDragged && this._isPointerDown) {
                const scaleX = this.viewHTMLElement.getBoundingClientRect().width / this.viewHTMLElement.offsetWidth
                const movementPoint = this._previousClientPoint.to(clientPoint)
                this.pointerDraggingPoint = new UIPoint(movementPoint.x, movementPoint.y).scale(1 / scaleX)
                    .add(this.pointerDraggingPoint)
                this.sendControlEventForKey(UIView.controlEvent.PointerDrag, event)
            }
            
            this._previousClientPoint = clientPoint
            
            pauseEvent(event)
            
        }
        
        const onTouchMove = async (event: TouchEvent) => {
            
            if (!this._isPointerValid) {
                return
            }
            
            if ((this.ignoresTouches && isTouchEventClassDefined && event instanceof TouchEvent) ||
                (this.ignoresMouse && event instanceof MouseEvent)) {
                return
            }
            
            if (event.touches.length > 1) {
                onTouchZoom(event)
                return
            }
            
            const touch = event.touches[0]
            
            const clientPoint = new UIPoint(
                touch.clientX,
                touch.clientY
            )
            const distanceToInitialPoint = clientPoint.to(this._initialPointerPosition!).length
            if (distanceToInitialPoint > this._pointerDragThreshold) {
                this._hasPointerDragged = YES
            }
            
            if (this._isPointerInside && this.viewHTMLElement !=
                document.elementFromPoint(touch.clientX, touch.clientY)) {
                this._isPointerInside = NO
                if (await this.shouldCallPointerLeave(event)) {
                    this.sendControlEventForKey(UIView.controlEvent.PointerLeave, event)
                }
            }
            
            this.sendControlEventForKey(UIView.controlEvent.PointerMove, event)
            
            
            if (this._hasPointerDragged) {
                const scaleX = this.viewHTMLElement.getBoundingClientRect().width / this.viewHTMLElement.offsetWidth
                const movementPoint = this._previousClientPoint.to(clientPoint)
                this.pointerDraggingPoint = new UIPoint(movementPoint.x, movementPoint.y).scale(1 / scaleX)
                    .add(this.pointerDraggingPoint)
                this.sendControlEventForKey(UIView.controlEvent.PointerDrag, event)
            }
            
            this._previousClientPoint = clientPoint
            
        }
        
        const onTouchZoom = (event: TouchEvent) => {
            this.sendControlEventForKey(UIView.controlEvent.MultipleTouches, event)
        }
        const onPointerUpInside = (event: Event) => {
            
            pauseEvent(event)
            this._isPointerDown = NO
            this.sendControlEventForKey(UIView.controlEvent.PointerUpInside, event)
            
            
        }
        
        const onTouchCancel = async (event: MouseEvent | TouchEvent) => {
            
            if (!this._isPointerValid) {
                return
            }
            
            if ((this.ignoresTouches && isTouchEventClassDefined && event instanceof TouchEvent) ||
                (this.ignoresMouse && event instanceof MouseEvent)) {
                return
            }
            
            this._isPointerValid = NO
            this._isPointerValidForMovement = NO
            this._isPointerDown = NO
            
            if (await this.shouldCallPointerCancel(event)) {
                this.sendControlEventForKey(UIView.controlEvent.PointerCancel, event)
            }
            
        }
        
        function eventKeyIsEnter(event: { keyCode: number }) {
            if (event.keyCode !== 13) {
                return NO
            }
            return YES
        }
        
        function eventKeyIsTab(event: { keyCode: number }) {
            if (event.keyCode !== 9) {
                return NO
            }
            return YES
        }
        
        function eventKeyIsEsc(event: { key: string; keyCode: number }) {
            let result: boolean
            if ("key" in event) {
                result = (event.key == "Escape" || event.key == "Esc")
            }
            else {
                // @ts-ignore
                result = (event.keyCode == 27)
            }
            return result
        }
        
        function eventKeyIsLeft(event: KeyboardEvent) {
            if (event.keyCode != 37) {
                return NO
            }
            return YES
        }
        
        function eventKeyIsRight(event: KeyboardEvent) {
            if (event.keyCode != 39) {
                return NO
            }
            return YES
        }
        
        function eventKeyIsDown(event: KeyboardEvent) {
            if (event.keyCode != 40) {
                return NO
            }
            return YES
        }
        
        function eventKeyIsUp(event: KeyboardEvent) {
            if (event.keyCode != 38) {
                return NO
            }
            return YES
        }
        
        const onKeyDown = (event: KeyboardEvent) => {
            
            if (eventKeyIsEnter(event)) {
                this.sendControlEventForKey(UIView.controlEvent.EnterDown, event)
            }
            
            if (eventKeyIsEsc(event)) {
                this.sendControlEventForKey(UIView.controlEvent.EscDown, event)
            }
            
            if (eventKeyIsTab(event) && this._controlEventTargets.TabDown && this._controlEventTargets.TabDown.length) {
                this.sendControlEventForKey(UIView.controlEvent.TabDown, event)
                pauseEvent(event, YES)
            }
            
            if (eventKeyIsLeft(event)) {
                this.sendControlEventForKey(UIView.controlEvent.LeftArrowDown, event)
            }
            
            if (eventKeyIsRight(event)) {
                this.sendControlEventForKey(UIView.controlEvent.RightArrowDown, event)
            }
            
            if (eventKeyIsDown(event)) {
                this.sendControlEventForKey(UIView.controlEvent.DownArrowDown, event)
            }
            
            if (eventKeyIsUp(event)) {
                this.sendControlEventForKey(UIView.controlEvent.UpArrowDown, event)
            }
            
        }
        
        const onKeyUp = (event: KeyboardEvent) => {
            
            if (eventKeyIsEnter(event)) {
                this.sendControlEventForKey(UIView.controlEvent.EnterUp, event)
            }
            
        }
        
        
        const onfocus = (event: Event) => {
            this.sendControlEventForKey(UIView.controlEvent.Focus, event)
        }
        
        const onblur = (event: Event) => {
            this.sendControlEventForKey(UIView.controlEvent.Blur, event)
        }
        
        
        // Mouse and touch start events
        // this._viewHTMLElement.onmousedown = onMouseDown
        // this._viewHTMLElement.ontouchstart = onTouchStart
        this.viewHTMLElement.addEventListener("mousedown", onMouseDown, false)
        this.viewHTMLElement.addEventListener("touchstart", onTouchStart, false)
        // //this.viewHTMLElement.addEventListener("mouseenter", onMouseEnter.bind(this), false);
        
        // Mouse and touch move events
        // this._viewHTMLElement.onmousemove = onMouseMove
        // this._viewHTMLElement.ontouchmove = onTouchMove
        //this.viewHTMLElement.addEventListener("mousemove", onMouseMove, false)
        this.viewHTMLElement.addEventListener("touchmove", onTouchMove, false)
        
        //this.viewHTMLElement.addEventListener("mousewheel", onmousewheel.bind(this), false)
        
        this._viewHTMLElement.onmouseover = onmouseover
        // this.viewHTMLElement.addEventListener("mouseover", onmouseover.bind(this), false)
        
        // Mouse and touch end events
        // this._viewHTMLElement.onmouseup = onmouseup
        // // @ts-ignore
        // this._viewHTMLElement.ontouchend = onTouchEnd
        // this._viewHTMLElement.ontouchcancel = onTouchCancel
        this.viewHTMLElement.addEventListener("mouseup", onmouseup, false)
        // @ts-ignore
        this.viewHTMLElement.addEventListener("touchend", onTouchEnd, false)
        this.viewHTMLElement.addEventListener("touchcancel", onTouchCancel, false)
        
        //this._viewHTMLElement.onmouseout = onmouseout
        this.viewHTMLElement.addEventListener("mouseout", onmouseout, false)
        // @ts-ignore
        this._viewHTMLElement.addEventListener("touchleave", onTouchLeave, true)
        
        // this.viewHTMLElement.onkeydown = onkeydown
        // this.viewHTMLElement.onkeyup = onkeyup
        this._viewHTMLElement.addEventListener("keydown", onKeyDown, false)
        this._viewHTMLElement.addEventListener("keyup", onKeyUp, false)
        
        // Focus events
        this._viewHTMLElement.onfocus = onfocus
        this._viewHTMLElement.onblur = onblur
        // this.viewHTMLElement.addEventListener("focus", onfocus, true)
        // this.viewHTMLElement.addEventListener("blur", onblur, true)
        
        
    }
    
    public static controlEvent = {
        
        "PointerDown": "PointerDown",
        "PointerMove": "PointerMove",
        "PointerDrag": "PointerDrag",
        "PointerLeave": "PointerLeave",
        "PointerEnter": "PointerEnter",
        "PointerUpInside": "PointerUpInside",
        "PointerTap": "PointerTap",
        "PointerUp": "PointerUp",
        "MultipleTouches": "PointerZoom",
        "PointerCancel": "PointerCancel",
        "PointerHover": "PointerHover",
        "EnterDown": "EnterDown",
        "EnterUp": "EnterUp",
        "EscDown": "EscDown",
        "TabDown": "TabDown",
        "LeftArrowDown": "LeftArrowDown",
        "RightArrowDown": "RightArrowDown",
        "DownArrowDown": "DownArrowDown",
        "UpArrowDown": "UpArrowDown",
        "Focus": "Focus",
        "Blur": "Blur"
        
    } as const
    
    
    controlEvent = UIView.controlEvent
    
    
    public get controlEventTargetAccumulator(): UIViewAddControlEventTargetObject<UIView> {
        
        const eventKeys: string[] = []
        
        const result: any = new Proxy(
            (this.constructor as any).controlEvent,
            {
                
                get: (target, key: string, _receiver) => {
                    
                    eventKeys.push(key)
                    
                    return result
                    
                },
                set: (target, key: string, value, _receiver) => {
                    
                    eventKeys.push(key)
                    this.addTargetForControlEvents(eventKeys, value)
                    
                    return true
                    
                }
                
            }
        )
        
        return result
        
    }
    
    
    addTargetForControlEvents(eventKeys: string[], targetFunction: (sender: UIView, event: Event) => void) {
        eventKeys.forEach(key => this.addTargetForControlEvent(key, targetFunction))
    }
    
    addTargetForControlEvent(eventKey: string, targetFunction: (sender: UIView, event: Event) => void) {
        
        let targets = this._controlEventTargets[eventKey]
        
        if (!targets) {
            // @ts-ignore
            targets = []
            this._controlEventTargets[eventKey] = targets
        }
        
        if (targets.indexOf(targetFunction) == -1) {
            targets.push(targetFunction)
        }
        
    }
    
    removeTargetForControlEvent(eventKey: string, targetFunction: (sender: UIView, event: Event) => void) {
        const targets = this._controlEventTargets[eventKey]
        if (!targets) {
            return
        }
        const index = targets.indexOf(targetFunction)
        if (index != -1) {
            targets.splice(index, 1)
        }
    }
    
    removeTargetForControlEvents(eventKeys: string[], targetFunction: (sender: UIView, event: Event) => void) {
        eventKeys.forEach(key => this.removeTargetForControlEvent(key, targetFunction))
    }
    
    
    sendControlEventForKey(eventKey: string, nativeEvent?: Event) {
        let targets = this._controlEventTargets[eventKey]
        if (!targets) {
            return
        }
        targets = targets.copy()
        for (let i = 0; i < targets.length; i++) {
            const target = targets[i]
            target(this, nativeEvent)
        }
    }
    
    
    static broadcastEventName = {
        
        "LanguageChanged": "LanguageChanged",
        "RemovedFromViewTree": "RemovedFromViewTree",
        "AddedToViewTree": "AddedToViewTree",
        "PageDidScroll": "PageDidScroll"
        
    } as const
    
    broadcastEventInSubtree(event: UIViewBroadcastEvent) {
        this.forEachViewInSubtree(view => {
            view.didReceiveBroadcastEvent(event)
            if (IS(view.viewController)) {
                view.viewController.viewDidReceiveBroadcastEvent(event)
            }
        })
    }
    
    
    didReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
        
        if (event.name == UIView.broadcastEventName.PageDidScroll) {
            this._isPointerValid = NO
        }
        
        if (event.name == UIView.broadcastEventName.AddedToViewTree) {
            this.wasAddedToViewTree()
        }
        
        if (event.name == UIView.broadcastEventName.RemovedFromViewTree) {
            this.wasRemovedFromViewTree()
        }
        
        if (event.name == UIView.broadcastEventName.LanguageChanged || event.name ==
            UIView.broadcastEventName.AddedToViewTree) {
            this._setInnerHTMLFromKeyIfPossible()
            this._setInnerHTMLFromLocalizedTextObjectIfPossible()
        }
        
    }
    
    
    forEachViewInSubtree(functionToCall: (view: UIView) => void) {
        functionToCall(this)
        this.subviews.everyElement.forEachViewInSubtree(functionToCall)
    }
    
    rectangleInView(rectangle: UIRectangle, view: UIView, forceIfNotInViewTree = NO) {
        
        if (!forceIfNotInViewTree && (!view.isMemberOfViewTree || !this.isMemberOfViewTree)) {
            return nil
        }
        
        // Get all the superview elements
        const allViewSuperviewElements = view.elementWithAllSuperviewElements
        
        // Find the first common element and the views in between
        const superviewElementsUntilCommonElement = this.elementWithAllSuperviewElements.slice(
            0,
            this.elementWithAllSuperviewElements.findIndex(
                viewElement => allViewSuperviewElements.contains(viewElement)
            ) + 1
        )
        const commonElement = superviewElementsUntilCommonElement.lastElement
        const viewSuperviewElementsUntilCommonElement = allViewSuperviewElements.slice(
            0,
            allViewSuperviewElements.findIndex(viewElement => viewElement == commonElement) + 1
        )
        
        // Step until the common element and record the offsets
        let selfOffsetPoint = new UIPoint(0, 0)
        //let selfScale = 1
        for (let i = 0; i < superviewElementsUntilCommonElement.length - 1; i++) {
            const element = superviewElementsUntilCommonElement[i]
            selfOffsetPoint = selfOffsetPoint.add(
                element.UIViewObject?.frame.min ?? new UIPoint(element.offsetLeft, element.offsetTop)
            )
            //selfScale = selfScale * (element.UIView?.scale ?? (element.getBoundingClientRect().width /
            // element.offsetWidth))
        }
        
        let viewOffsetPoint = new UIPoint(0, 0)
        //let viewScale = 1
        for (let i = 0; i < viewSuperviewElementsUntilCommonElement.length - 1; i++) {
            const element = viewSuperviewElementsUntilCommonElement[i]
            viewOffsetPoint = viewOffsetPoint.add(
                element.UIViewObject?.frame.min ?? new UIPoint(element.offsetLeft, element.offsetTop)
            )
            //viewScale = viewScale * (element.UIView?.scale ?? (element.getBoundingClientRect().width /
            // element.offsetWidth))
        }
        
        const offsetPoint = selfOffsetPoint.subtract(viewOffsetPoint)
        
        return rectangle.copy().offsetByPoint(offsetPoint)
        
    }
    
    
    rectangleFromView(rectangle: UIRectangle, view: UIView) {
        return view.rectangleInView(rectangle, this)
    }
    
    
    get contentBounds(): UIRectangle {
        
        const bounds = this.bounds
        const insets = this._contentInsets
        
        return new UIRectangle(
            insets.left,
            insets.top,
            bounds.height - insets.top - insets.bottom,
            bounds.width - insets.left - insets.right
        )
        
    }
    
    contentBoundsWithInset(inset: number): UIRectangle {
        this._contentInsets = { top: inset, left: inset, bottom: inset, right: inset }
        const bounds = this.bounds
        return new UIRectangle(
            inset,
            inset,
            bounds.height - inset * 2,
            bounds.width - inset * 2
        )
    }
    
    contentBoundsWithInsets(
        left: number,
        right: number,
        bottom: number,
        top: number
    ): UIRectangle {
        this._contentInsets = { left, right, bottom, top }
        const bounds = this.bounds
        return new UIRectangle(
            left,
            top,
            bounds.height - top - bottom,
            bounds.width - left - right
        )
    }
    
    protected _getIntrinsicSizeCacheKey(constrainingHeight: number, constrainingWidth: number): string {
        return `h_${constrainingHeight}__w_${constrainingWidth}`
    }
    
    protected _getCachedIntrinsicSize(cacheKey: string): UIRectangle | undefined {
        return this._intrinsicSizesCache[cacheKey]
    }
    
    protected _setCachedIntrinsicSize(cacheKey: string, size: UIRectangle): void {
        this._intrinsicSizesCache[cacheKey] = size.copy()
    }
    
    clearIntrinsicSizeCache(): void {
        this._intrinsicSizesCache = {}
        
        this._frameCacheForVirtualLayouting = undefined
        this._frameCache = undefined
        
        // Optionally clear parent cache if this view affects parent's intrinsic size
        if (this.superview?.usesVirtualLayoutingForIntrinsicSizing) {
            this.superview.clearIntrinsicSizeCache()
        }
    }
    
    intrinsicContentSizeWithConstraints(constrainingHeight: number = 0, constrainingWidth: number = 0) {
        
        const cacheKey = this._getIntrinsicSizeCacheKey(constrainingHeight, constrainingWidth)
        const cachedResult = this._getCachedIntrinsicSize(cacheKey)
        if (cachedResult) {
            return cachedResult
        }
        
        // This works but is slow
        
        const result = new UIRectangle(0, 0, 0, 0)
        if (this.rootView.forceIntrinsicSizeZero) {
            return result
        }
        
        let temporarilyInViewTree = NO
        let nodeAboveThisView: Node | null = null
        if (!this.isMemberOfViewTree) {
            document.body.appendChild(this.viewHTMLElement)
            temporarilyInViewTree = YES
            nodeAboveThisView = this.viewHTMLElement.nextSibling
        }
        
        const height = this.style.height
        const width = this.style.width
        
        this.style.height = "" + constrainingHeight
        this.style.width = "" + constrainingWidth
        
        
        const left = this.style.left
        const right = this.style.right
        const bottom = this.style.bottom
        const top = this.style.top
        
        this.style.left = ""
        this.style.right = ""
        this.style.bottom = ""
        this.style.top = ""
        
        
        const resultHeight = this.viewHTMLElement.scrollHeight
        
        
        const whiteSpace = this.style.whiteSpace
        this.style.whiteSpace = "nowrap"
        
        const resultWidth = this.viewHTMLElement.scrollWidth
        
        this.style.whiteSpace = whiteSpace
        
        
        this.style.height = height
        this.style.width = width
        
        this.style.left = left
        this.style.right = right
        this.style.bottom = bottom
        this.style.top = top
        
        if (temporarilyInViewTree) {
            document.body.removeChild(this.viewHTMLElement)
            if (this.superview) {
                if (nodeAboveThisView) {
                    this.superview.viewHTMLElement.insertBefore(this.viewHTMLElement, nodeAboveThisView)
                }
                else {
                    this.superview.viewHTMLElement.appendChild(this.viewHTMLElement)
                }
            }
        }
        
        result.height = resultHeight
        result.width = resultWidth
        
        this._setCachedIntrinsicSize(cacheKey, result)
        
        return result
        
    }
    
    
    private _intrinsicFrameFromSubviewFrames() {
        
        const framePoints: UIPoint[] = []
        this.subviews.forEach(subview => {
            if (subview == this._loadingView || subview.hasWeakFrame) {
                return
            }
            subview.layoutIfNeeded()
            framePoints.push(subview.frame.min)
            framePoints.push(subview.frame.max)
        })
        // Since this is always called inside a virtual layouting context,
        // we will add padding based on the _contentInsets
        const resultFrame = UIRectangle.boundingBoxForPoints(framePoints)
            .rectangleWithInsets(
                -this._contentInsets?.left ?? 0,
                -this._contentInsets?.right ?? 0,
                -this._contentInsets?.bottom ?? 0,
                -this._contentInsets?.top ?? 0
            )
        return resultFrame
    }
    
    
    intrinsicContentWidth(constrainingHeight: number = 0): number {
        
        const cacheKey = this._getIntrinsicSizeCacheKey(constrainingHeight, 0)
        const cached = this._getCachedIntrinsicSize(cacheKey)
        if (cached) {
            return cached.width
        }
        
        if (this.usesVirtualLayoutingForIntrinsicSizing) {
            this.startVirtualLayout()
            let resultFrame: UIRectangle
            try {
                this.frame = this.frame.rectangleWithHeight(constrainingHeight)
                this.layoutIfNeeded()
                resultFrame = this._intrinsicFrameFromSubviewFrames()
            }
            finally {
                this.finishVirtualLayout()
            }
            
            this._setCachedIntrinsicSize(cacheKey, new UIRectangle(0, 0, resultFrame.height, resultFrame.width))
            return resultFrame.width
        }
        
        const size = this.intrinsicContentSizeWithConstraints(constrainingHeight, 0)
        return size.width
        
    }
    
    
    intrinsicContentHeight(constrainingWidth: number = 0): number {
        
        const cacheKey = this._getIntrinsicSizeCacheKey(0, constrainingWidth)
        const cached = this._getCachedIntrinsicSize(cacheKey)
        if (cached) {
            return cached.height
        }
        
        if (this.usesVirtualLayoutingForIntrinsicSizing) {
            this.startVirtualLayout()
            let resultFrame: UIRectangle
            try {
                this.frame = this.frame.rectangleWithWidth(constrainingWidth)
                this.layoutIfNeeded()
                resultFrame = this._intrinsicFrameFromSubviewFrames()
            }
            finally {
                this.finishVirtualLayout()
            }
            
            this._setCachedIntrinsicSize(cacheKey, new UIRectangle(0, 0, resultFrame.height, resultFrame.width))
            return resultFrame.height
        }
        
        const size = this.intrinsicContentSizeWithConstraints(0, constrainingWidth)
        
        if (isNaN(size.height)) {
            console.error("NaN in intrinsicContentHeight", this)
            var asd = 1
        }
        
        return size.height
        
    }
    
    
    intrinsicContentSize(): UIRectangle {
        
        const cacheKey = this._getIntrinsicSizeCacheKey(0, 0)
        const cached = this._getCachedIntrinsicSize(cacheKey)
        if (cached) {
            return cached
        }
        
        if (this.usesVirtualLayoutingForIntrinsicSizing) {
            this.startVirtualLayout()
            let resultFrame: UIRectangle
            try {
                this.layoutIfNeeded()
                resultFrame = this._intrinsicFrameFromSubviewFrames()
            }
            finally {
                this.finishVirtualLayout()
            }
            
            this._setCachedIntrinsicSize(cacheKey, resultFrame)
            return resultFrame
        }
        
        return nil
        
    }
    
    
}


const windowMouseMoveFunction = (event: MouseEvent) => {
    
    UIView._onWindowMouseMove(event)
    //pauseEvent(event, YES)
    
}
const windowMouseUpOrLeaveFunction = (event: MouseEvent) => {
    
    const onWindowMouseUp = UIView._onWindowMouseup
    
    UIView._onWindowMouseMove = nil
    UIView._onWindowMouseup = nil
    
    // window.removeEventListener("mousemove", windowMouseMoveFunction)
    // window.removeEventListener("mouseup", windowMouseUpOrLeaveFunction, true)
    // document.body.removeEventListener("mouseleave", windowMouseUpOrLeaveFunction)
    onWindowMouseUp(event)
    
}
window.addEventListener("mousemove", windowMouseMoveFunction)
window.addEventListener("mouseup", windowMouseUpOrLeaveFunction, true)
document.body.addEventListener("mouseleave", windowMouseUpOrLeaveFunction)

const windowTouchFunction = () => {
    
    UIView._onWindowTouchMove = nil
    UIView._onWindowMouseup = nil
    // window.removeEventListener("touchmove", UIView._onWindowTouchMove, true)
    // window.removeEventListener("mouseup", windowTouchFunction, true)
    
}
window.addEventListener("touchmove", UIView._onWindowTouchMove, true)
window.addEventListener("mouseup", windowTouchFunction, true)

function props(obj: any) {
    const p = []
    for (; obj != null; obj = Object.getPrototypeOf(obj)) {
        const op = Object.getOwnPropertyNames(obj)
        for (let i = 0; i < op.length; i++) {
            if (p.indexOf(op[i]) == -1) {
                p.push(op[i])
            }
        }
    }
    return p
}

const _UIViewPropertyKeys = props(UIView.prototype).concat(new UIView().allKeys)
const _UIViewControllerPropertyKeys = props(UIViewController.prototype)
    .concat(new UIViewController(nil).allKeys)





































