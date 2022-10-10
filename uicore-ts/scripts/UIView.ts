import { IS_FIREFOX, IS_SAFARI } from "./ClientCheckers"
import { UIColor } from "./UIColor"
import { UICore } from "./UICore"
import "./UICoreExtensions"
import type { UIDialogView } from "./UIDialogView"
import { UILocalizedTextObject } from "./UIInterfaces"
import { FIRST, FIRST_OR_NIL, IS, IS_DEFINED, IS_NIL, IS_NOT, nil, NO, UIObject, YES } from "./UIObject"
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
    
    
    enum Attribute {
        
        LEFT, RIGHT, BOTTOM, TOP, CENTERX, CENTERY, WIDTH, HEIGHT, ZINDEX, VARIABLE, NOTANATTRIBUTE
        
    }
    
    
    enum Relation {
        
        EQU, LEQ, GEQ
        
    }
    
    
}

// @ts-ignore
if (!window.AutoLayout) {
    
    // @ts-ignore
    window.AutoLayout = nil
    
}


export interface LooseObject {
    [key: string]: any
}


export interface ControlEventTargetsObject {
    
    [key: string]: Function[];
    
}


export interface UIViewBroadcastEvent {
    
    name: string;
    parameters: {
        [key: string]: string | string[];
    }
    
}


export type UIViewAddControlEventTargetObject<T extends typeof UIView> = {
    
    [K in keyof T["controlEvent"]]: ((sender: T, event: Event) => void) & Partial<UIViewAddControlEventTargetObject<T>>
    
}


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


export class UIView extends UIObject {
    
    _nativeSelectionEnabled: boolean = YES
    _shouldLayout?: boolean
    _UITableViewRowIndex?: number
    _UITableViewReusabilityIdentifier: any
    _UIViewIntrinsicTemporaryWidth?: string
    _UIViewIntrinsicTemporaryHeight?: string
    _enabled: boolean = YES
    _frame?: UIRectangle & { zIndex?: number }
    _backgroundColor: UIColor = UIColor.transparentColor
    
    _viewHTMLElement!: HTMLElement & LooseObject
    
    // Dynamic innerHTML
    _innerHTMLKey?: string
    _defaultInnerHTML?: string
    _parameters?: { [x: string]: (string | UILocalizedTextObject) }
    
    _localizedTextObject?: UILocalizedTextObject = nil
    
    _controlEventTargets: ControlEventTargetsObject = {} //{ "PointerDown": Function[]; "PointerMove": Function[]; "PointerLeave": Function[]; "PointerEnter": Function[]; "PointerUpInside": Function[]; "PointerUp": Function[]; "PointerHover": Function[]; };
    _frameTransform: string
    viewController: UIViewController = nil
    _updateLayoutFunction: any = nil
    // @ts-ignore
    _constraints: any[] //AutoLayout.Constraint[];
    superview: UIView
    subviews: UIView[]
    _styleClasses: any[]
    _isHidden: boolean = NO
    
    pausesPointerEvents: boolean = NO
    stopsPointerEventPropagation: boolean = YES
    pointerDraggingPoint: UIPoint = new UIPoint(0, 0)
    _previousClientPoint: UIPoint = new UIPoint(0, 0)
    _isPointerInside?: boolean
    _isPointerValid?: boolean
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
    
    constructor(
        elementID: string = ("UIView" + UIView.nextIndex),
        viewHTMLElement: HTMLElement & LooseObject | null = null,
        elementType: string | null = null,
        initViewData?: any
    ) {
        
        super()
        
        // Instance variables
        
        UIView._UIViewIndex = UIView.nextIndex
        this._UIViewIndex = UIView._UIViewIndex
        
        this._styleClasses = []
        
        this._initViewHTMLElement(elementID, viewHTMLElement, elementType)
        
        this.subviews = []
        this.superview = nil
        
        this._constraints = []
        this._updateLayoutFunction = nil
        
        
        this._frameTransform = ""
        
        this._initViewCSSSelectorsIfNeeded()
        
        this._loadUIEvents()
        this.setNeedsLayout()
        
    }
    
    
    static get nextIndex() {
        return UIView._UIViewIndex + 1
    }
    
    static get pageHeight() {
        const body = document.body
        const html = document.documentElement
        return Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight
        )
    }
    
    static get pageWidth() {
        const body = document.body
        const html = document.documentElement
        return Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth)
    }
    
    
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
        this.viewHTMLElement.UIView = this
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
    
    
    set hoverText(hoverText: string) {
        this.viewHTMLElement.setAttribute("title", hoverText)
    }
    
    get hoverText() {
        return this.viewHTMLElement.getAttribute("title") ?? ""
    }
    
    
    get scrollSize() {
        return new UIRectangle(0, 0, this.viewHTMLElement.scrollHeight, this.viewHTMLElement.scrollWidth)
    }
    
    
    get dialogView(): UIDialogView {
        if (!IS(this.superview)) {
            return nil
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
    
    
    get propertyDescriptors(): { object: object; name: string }[] {
        let result: any[] = []
        this.allSuperviews.forEach(view => {
            FIRST_OR_NIL(view.viewController).forEach((value, key, stopLooping) => {
                if (this == value) {
                    result.push({ object: view.viewController, name: key })
                }
            })
            view.forEach((value, key, stopLooping) => {
                if (this == value) {
                    result.push({ object: view, name: key })
                }
            })
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
    
    
    static findViewWithElementID(elementID: string): UIView {
        const viewHTMLElement = document.getElementById(elementID)
        if (IS_NOT(viewHTMLElement)) {
            return nil
        }
        // @ts-ignore
        return viewHTMLElement.UIView
    }
    
    
    static createStyleSelector(selector: string, style: string) {
        
        return
        
        // // @ts-ignore
        // if (!document.styleSheets) {
        //     return
        // }
        // if (document.getElementsByTagName("head").length == 0) {
        //     return
        // }
        //
        // let styleSheet
        // let mediaType
        //
        // if (document.styleSheets.length > 0) {
        //     for (var i = 0, l: any = document.styleSheets.length; i < l; i++) {
        //         if (document.styleSheets[i].disabled) {
        //             continue
        //         }
        //         const media = document.styleSheets[i].media
        //         mediaType = typeof media
        //
        //         if (mediaType === "string") {
        //             if (media as any === "" || ((media as any).indexOf("screen") !== -1)) {
        //                 styleSheet = document.styleSheets[i]
        //             }
        //         }
        //         else if (mediaType == "object") {
        //             if (media.mediaText === "" || (media.mediaText.indexOf("screen") !== -1)) {
        //                 styleSheet = document.styleSheets[i]
        //             }
        //         }
        //
        //         if (typeof styleSheet !== "undefined") {
        //             break
        //         }
        //     }
        // }
        //
        // if (typeof styleSheet === "undefined") {
        //     const styleSheetElement = document.createElement("style")
        //     styleSheetElement.type = "text/css"
        //     document.getElementsByTagName("head")[0].appendChild(styleSheetElement)
        //
        //     for (i = 0; i < document.styleSheets.length; i++) {
        //         if (document.styleSheets[i].disabled) {
        //             continue
        //         }
        //         styleSheet = document.styleSheets[i]
        //     }
        //
        //     mediaType = typeof styleSheet.media
        // }
        //
        // if (mediaType === "string") {
        //     for (var i = 0, l = styleSheet.rules.length; i < l; i++) {
        //         if (styleSheet.rules[i].selectorText && styleSheet.rules[i].selectorText.toLowerCase() ==
        //             selector.toLowerCase()) {
        //             styleSheet.rules[i].style.cssText = style
        //             return
        //         }
        //     }
        //     styleSheet.addRule(selector, style)
        // }
        // else if (mediaType === "object") {
        //
        //     var styleSheetLength = 0
        //
        //     try {
        //
        //         styleSheetLength = (styleSheet.cssRules) ? styleSheet.cssRules.length : 0
        //
        //     } catch (error) {
        //
        //     }
        //
        //
        //     for (var i = 0; i < styleSheetLength; i++) {
        //         if (styleSheet.cssRules[i].selectorText && styleSheet.cssRules[i].selectorText.toLowerCase() ==
        //             selector.toLowerCase()) {
        //             styleSheet.cssRules[i].style.cssText = style
        //             return
        //         }
        //     }
        //     styleSheet.insertRule(selector + "{" + style + "}", styleSheetLength)
        // }
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
    
    
    calculateAndSetViewFrame() {
        
        // Use this method to calculate the frame for the view itself
        
        // This can be used when adding subviews to existing views like buttons
        
    }
    
    
    public get frame() {
        let result: UIRectangle & { zIndex?: number } = this._frame?.copy() as any
        if (!result) {
            result = new UIRectangle(
                this.viewHTMLElement.offsetLeft,
                this.viewHTMLElement.offsetTop,
                this.viewHTMLElement.offsetHeight,
                this.viewHTMLElement.offsetWidth
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
    
    setFrame(rectangle: UIRectangle & { zIndex?: number }, zIndex = 0, performUncheckedLayout = NO) {
        
        const frame: (UIRectangle & { zIndex?: number }) = this._frame || new UIRectangle(nil, nil, nil, nil) as any
        
        if (zIndex != undefined) {
            rectangle.zIndex = zIndex
        }
        this._frame = rectangle
        
        if (frame && frame.isEqualTo(rectangle) && frame.zIndex == rectangle.zIndex && !performUncheckedLayout) {
            return
        }
        
        UIView._setAbsoluteSizeAndPosition(
            this.viewHTMLElement,
            rectangle.topLeft.x,
            rectangle.topLeft.y,
            rectangle.width,
            rectangle.height,
            rectangle.zIndex
        )
        
        if (frame.height != rectangle.height || frame.width != rectangle.width || performUncheckedLayout) {
            this.setNeedsLayout()
            this.boundsDidChange()
        }
        
    }
    
    
    get bounds() {
        let result: UIRectangle
        if (IS_NOT(this._frame)) {
            result = new UIRectangle(0, 0, this.viewHTMLElement.offsetHeight, this.viewHTMLElement.offsetWidth)
        }
        else {
            result = this.frame.copy()
            result.x = 0
            result.y = 0
        }
        return result
    }
    
    set bounds(rectangle) {
        const frame = this.frame
        const newFrame = new UIRectangle(frame.topLeft.x, frame.topLeft.y, rectangle.height, rectangle.width)
        // @ts-ignore
        newFrame.zIndex = frame.zIndex
        this.frame = newFrame
    }
    
    
    boundsDidChange() {
        
        
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
            this.boundsDidChange()
        }
        
    }
    
    setSizes(height?: number | string, width?: number | string) {
        
        const previousBounds = this.bounds
        
        this.setStyleProperty("height", height)
        this.setStyleProperty("width", width)
        
        const bounds = this.bounds
        if (bounds.height != previousBounds.height || bounds.width != previousBounds.width) {
            this.setNeedsLayout()
            this.boundsDidChange()
        }
        
    }
    
    setMinSizes(height?: number | string, width?: number | string) {
        
        const previousBounds = this.bounds
        
        this.setStyleProperty("minHeight", height)
        this.setStyleProperty("minWidth", width)
        
        const bounds = this.bounds
        if (bounds.height != previousBounds.height || bounds.width != previousBounds.width) {
            this.setNeedsLayout()
            this.boundsDidChange()
        }
        
    }
    
    setMaxSizes(height?: number | string, width?: number | string) {
        
        const previousBounds = this.bounds
        
        this.setStyleProperty("maxHeight", height)
        this.setStyleProperty("maxWidth", width)
        
        const bounds = this.bounds
        if (bounds.height != previousBounds.height || bounds.width != previousBounds.width) {
            this.setNeedsLayout()
            this.boundsDidChange()
        }
        
    }
    
    setMargin(margin?: number | string) {
        
        const previousBounds = this.bounds
        
        this.setStyleProperty("margin", margin)
        
        const bounds = this.bounds
        if (bounds.height != previousBounds.height || bounds.width != previousBounds.width) {
            this.setNeedsLayout()
            this.boundsDidChange()
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
            this.boundsDidChange()
        }
        
    }
    
    setPadding(padding?: number | string) {
        
        const previousBounds = this.bounds
        
        this.setStyleProperty("padding", padding)
        
        const bounds = this.bounds
        if (bounds.height != previousBounds.height || bounds.width != previousBounds.width) {
            this.setNeedsLayout()
            this.boundsDidChange()
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
            this.boundsDidChange()
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
    
        } catch (exception) {
            
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
        zIndex = 0
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
        
        let str = element.style.cssText
        
        const frameTransform = UIView._transformAttribute + ": translate3d(" + (left).integerValue + "px, " +
            (top).integerValue + "px, 0px)"
        
        if (element.UIView) {
            str = str + frameTransform + ";"
        }
        else {
            element.UIView._frameTransform = frameTransform
        }
        
        if (IS_NIL(height)) {
            str = str + " height: unset;"
        }
        else {
            str = str + " height:" + height + ";"
        }
        
        if (IS_NIL(width)) {
            str = str + " width: unset;"
        }
        else {
            str = str + " width:" + width + ";"
        }
        
        if (IS_NIL(zIndex)) {
            str = str + " z-index: unset;"
        }
        else {
            str = str + " z-index:" + zIndex + ";"
        }
        
        element.style.cssText = element.style.cssText + str
        
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
                
            } catch (error) {
                
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
                        subView.height
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
        for (var i = 0; i < UIView._viewsToLayout.length; i++) {
            const view = UIView._viewsToLayout[i]
            view.layoutIfNeeded()
        }
        UIView._viewsToLayout = []
    }
    
    
    setNeedsLayout() {
        
        if (this._shouldLayout) {
            return
        }
        
        this._shouldLayout = YES
        
        // Register view for layout before next frame
        UIView._viewsToLayout.push(this)
        
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
        
        this._shouldLayout = NO
        
        try {
            
            this.layoutSubviews()
            
        } catch (exception) {
            
            console.log(exception)
            
        }
        
    }
    
    
    layoutSubviews() {
    
        this.willLayoutSubviews()
        
        this._shouldLayout = NO
        
        // Autolayout
        if (this.constraints.length) {
            this._updateLayoutFunction = UIView.performAutoLayout(this.viewHTMLElement, null, this.constraints)
        }
        this._updateLayoutFunction()
    
        this.viewController.layoutViewSubviews()
        
        this.applyClassesAndStyles()
    
        for (let i = 0; i < this.subviews.length; i++) {
        
            const subview = this.subviews[i]
            subview.calculateAndSetViewFrame()
        
        }
        
        this.didLayoutSubviews()
        
    }
    
    
    applyClassesAndStyles() {
        for (let i = 0; i < this.styleClasses.length; i++) {
            const styleClass = this.styleClasses[i]
            if (styleClass) {
                this.viewHTMLElement.classList.add(styleClass)
            }
        }
    }
    
    willLayoutSubviews() {
        
        this.viewController.viewWillLayoutSubviews()
        
    }
    
    didLayoutSubviews() {
        
        this.viewController.viewDidLayoutSubviews()
        
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
        
    }
    
    static constraintRelation = {
        
        "equal": AutoLayout.Relation.EQU,
        "lessThanOrEqual": AutoLayout.Relation.LEQ,
        "greaterThanOrEqual": AutoLayout.Relation.GEQ
        
    }
    
    
    subviewWithID(viewID: string): UIView {
        let resultHTMLElement = nil
        
        try {
            resultHTMLElement = this.viewHTMLElement.querySelector("#" + viewID)
        } catch (error) {
            console.log(error)
        }
        
        if (resultHTMLElement && resultHTMLElement.UIView) {
            return resultHTMLElement.UIView
        }
        return nil
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
                    parameters: nil
                })
                
            }
            
            this.setNeedsLayout()
            
        }
        
    }
    
    addSubviews(views: UIView[]) {
        views.forEach(view => this.addSubview(view))
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
    
    
    removeFromSuperview() {
        if (IS(this.superview)) {
            this.forEachViewInSubtree(view => view.blur())
            const index = this.superview.subviews.indexOf(this)
            if (index > -1) {
                this.superview.subviews.splice(index, 1)
                this.superview.viewHTMLElement.removeChild(this.viewHTMLElement)
                this.superview = nil
                this.broadcastEventInSubtree({
                    name: UIView.broadcastEventName.RemovedFromViewTree,
                    parameters: nil
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
        
    }
    
    wasRemovedFromViewTree() {
        
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
    
    
    get allSuperviews() {
        const result = []
        let view: UIView = this
        for (let i = 0; IS(view); i = i) {
            result.push(view)
            view = view.superview
        }
        return result
    }
    
    
    setNeedsLayoutOnAllSuperviews() {
        this.allSuperviews.reverse().everyElement.setNeedsLayout()
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
    
    
    static pointerUpInsideCalled(view: UIView) {
    
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
            
            window.addEventListener("mousemove", onMouseMove, true)
            window.addEventListener("mouseup", (event) => {
                
                window.removeEventListener("mousemove", onMouseMove, true)
                onmouseup(event)
                
            })
            
            window.addEventListener("touchmove", onTouchMove, true)
            window.addEventListener("mouseup", () => window.removeEventListener("touchmove", onTouchMove, true))
            
        }
        
        const onTouchStart = onMouseDown as any
        
        const onmouseup = (event: MouseEvent) => {
            
            this._isPointerDown = NO
            
            if (!this._isPointerValid) {
                return
            }
            
            if ((this.ignoresTouches && isTouchEventClassDefined && event instanceof TouchEvent) ||
                (this.ignoresMouse && event instanceof MouseEvent)) {
                return
            }
            
            if (this._isPointerInside) {
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
        
        const onmouseout = (event: MouseEvent) => {
            
            if ((this.ignoresTouches && isTouchEventClassDefined && event instanceof TouchEvent) ||
                (this.ignoresMouse && event instanceof MouseEvent)) {
                return
            }
            
            this.sendControlEventForKey(UIView.controlEvent.PointerLeave, event)
            
            this._isPointerInside = NO
            
            pauseEvent(event)
            
        }
        
        const onTouchLeave = onmouseout
        
        const onmouseover = (event: MouseEvent) => {
            
            if ((this.ignoresTouches && isTouchEventClassDefined && event instanceof TouchEvent) ||
                (this.ignoresMouse && event instanceof MouseEvent)) {
                return
            }
            
            this.sendControlEventForKey(UIView.controlEvent.PointerHover, event)
            
            this._isPointerInside = YES
            this._isPointerValid = YES
            
            pauseEvent(event)
            
        }
        
        const onMouseMove = (event: MouseEvent) => {
            
            // if (this._isPointerDown) {
            //
            //     console.log("Mouse move")
            //
            // }
            
            if (!this._isPointerValid) {
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
                const movementPoint = this._previousClientPoint.to(clientPoint)
                this.pointerDraggingPoint = new UIPoint(movementPoint.x, movementPoint.y).scale(1 / UIView.pageScale)
                    .add(this.pointerDraggingPoint)
                this.sendControlEventForKey(UIView.controlEvent.PointerDrag, event)
            }
            
            this._previousClientPoint = clientPoint
            
            pauseEvent(event)
            
        }
        
        const onTouchMove = (event: TouchEvent) => {
            
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
                this.sendControlEventForKey(UIView.controlEvent.PointerLeave, event)
            }
            
            this.sendControlEventForKey(UIView.controlEvent.PointerMove, event)
            
            
            if (this._hasPointerDragged) {
                const movementPoint = this._previousClientPoint.to(clientPoint)
                this.pointerDraggingPoint = new UIPoint(movementPoint.x, movementPoint.y).scale(1 / UIView.pageScale)
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
            
            
            UIView.pointerUpInsideCalled(this)
            
        }
        
        const onTouchCancel = (event: Event) => {
            
            if (!this._isPointerValid) {
                return
            }
            
            if ((this.ignoresTouches && isTouchEventClassDefined && event instanceof TouchEvent) ||
                (this.ignoresMouse && event instanceof MouseEvent)) {
                return
            }
            
            this._isPointerValid = NO
            this._isPointerDown = NO
            
            this.sendControlEventForKey(UIView.controlEvent.PointerCancel, event)
            
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
        
    }
    
    controlEvent = UIView.controlEvent
    
    
    public get controlEventTargetAccumulator(): UIViewAddControlEventTargetObject<typeof UIView> {
        
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
    
    sendControlEventForKey(eventKey: string, nativeEvent: Event) {
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
        
    }
    
    
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
    
    
    rectangleInView(rectangle: UIRectangle, view: UIView) {
        if (!view.isMemberOfViewTree || !this.isMemberOfViewTree) {
            return nil
        }
        
        const viewClientRectangle = view.viewHTMLElement.getBoundingClientRect()
        const viewLocation = new UIPoint(viewClientRectangle.left, viewClientRectangle.top)
        
        const selfClientRectangle = this.viewHTMLElement.getBoundingClientRect()
        const selfLocation = new UIPoint(selfClientRectangle.left, selfClientRectangle.top)
        
        const offsetPoint = selfLocation.subtract(viewLocation)
        
        return rectangle.copy().offsetByPoint(offsetPoint)
    }
    
    rectangleFromView(rectangle: UIRectangle, view: UIView) {
        return view.rectangleInView(rectangle, this)
    }
    
    
    intrinsicContentSizeWithConstraints(constrainingHeight: number = 0, constrainingWidth: number = 0) {
    
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
        
        
        return result
        
    }
    
    
    intrinsicContentWidth(constrainingHeight: number = 0): number {
    
        return this.intrinsicContentSizeWithConstraints(constrainingHeight).width
        
    }
    
    intrinsicContentHeight(constrainingWidth: number = 0): number {
    
        return this.intrinsicContentSizeWithConstraints(undefined, constrainingWidth).height
        
        
    }
    
    intrinsicContentSize(): UIRectangle {
        
        return nil
    
    }
    
    
}




































