# UICore API Reference

All public classes, properties, and methods exported from the `UI`-prefixed source files. Internal/private members (prefixed with `_`) are omitted unless they are commonly accessed through public patterns.

---

## Table of Contents

- [Global utilities](#global-utilities)
  - [Constants — YES / NO / nil](#constants--yes--no--nil)
  - [Guard functions — IS, IS\_NOT, IS\_DEFINED, …](#guard-functions)
  - [Functional helpers — IF, FIRST, FIRST\_OR\_NIL, LAZY\_VALUE, CALL, EXTEND](#functional-helpers)
  - [Type utilities](#type-utilities)
- [UIObject](#uiobject)
- [UIColor](#uicolor)
- [UIPoint](#uipoint)
- [UIRectangle](#uirectangle)
- [UIView](#uiview)
- [UIBaseButton](#uibasebutton)
- [UIButton](#uibutton)
- [UILink](#uilink)
- [UILinkButton](#uilinkbutton)
- [UITextView](#uitextview)
- [UITextField](#uitextfield)
- [UITextArea](#uitextarea)
- [UIImageView](#uiimageview)
- [UIActionIndicator](#uiactionindicator)
- [UILoadingView](#uiloadingview)
- [UIScrollView](#uiscrollview)
- [UINativeScrollView](#uinativescrollview)
- [UITableView](#uitableview)
- [UISlideScrollerView](#uislidescrollerview)
- [UIDialogView](#uidialogview)
- [UIDateTimeInput](#uidatetimeinput)
- [UIAutocompleteTextField](#uiautocompletatextfield)
- [UIAutocompleteDropdownView](#uiautocompletedropdownview)
- [UIAutocompleteRowView](#uiautocompleterowview)
- [UITimer](#uitimer)
- [UIStringFilter](#uistringfilter)
- [UIKeyValueStringFilter](#uikeyvaluestringfilter)
- [UIKeyValueSorter](#uikeyvaluesorter)
- [UILayoutGrid](#uilayoutgrid)
- [UIViewController](#uiviewcontroller)
- [UIRootViewController](#uirootviewcontroller)
- [UIRoute](#uiroute)
- [UICore](#uicore)
- [Native prototype extensions](#native-prototype-extensions)
- [Decorator — @UIComponentView](#decorator--uicomponentview)

---

## Global utilities

### Constants — YES / NO / nil

```typescript
const YES: true   // = true
const NO: false   // = false
```

`nil` is a safe-null proxy. Any property access or method call on `nil` returns `nil` rather than throwing. It coerces to `0` (number), `""` (string), and `false` (boolean).

```typescript
nil.anyProperty           // → nil
nil.anyMethod()           // → nil
nil + 0                   // → 0
nil + ""                  // → ""
```

---

### Guard functions

```typescript
IS(object): object is T
```
Returns `true` when `object` is defined, non-null, and not `nil`. The recommended truthiness check throughout UICore.

```typescript
IS_NOT(object): object is undefined | null | false
```
Inverse of `IS`.

```typescript
IS_DEFINED(object): object is T
```
Returns `true` when `object !== undefined` (allows `null`).

```typescript
IS_UNDEFINED(object): object is undefined
```

```typescript
IS_NIL(object): object is typeof nil
```
Strict check for the `nil` proxy.

```typescript
IS_NOT_NIL(object): boolean
```

```typescript
IS_LIKE_NULL(object): boolean
```
Returns `true` for `undefined`, `null`, and `nil`.

```typescript
IS_NOT_LIKE_NULL(object): boolean
```

```typescript
IS_AN_EMAIL_ADDRESS(email: string): boolean
```
Simple regex check (`\S+@\S+\.\S+`).

```typescript
MAKE_ID(randomPartLength = 15): string
```
Generates a unique string ID (random characters + timestamp).

---

### Functional helpers

```typescript
FIRST<T>(...objects: (T | undefined | null)[]): T
```
Returns the first value for which `IS()` is true, or the last element if none pass.

```typescript
FIRST_OR_NIL<T>(...objects: (T | undefined | null)[]): T
```
Same as `FIRST` but returns `nil` instead of the last element.

```typescript
RETURNER<T>(value?: T): (...args: any[]) => T
```
Returns a function that always returns `value`.

```typescript
IF(value: any): UIIFBlockReceiver<T>
```
Inline conditional expression that evaluates lazily.

```typescript
// Usage
const result = IF(condition)(() => valueWhenTrue)
    .ELSE_IF(otherCondition)(() => valueWhenOtherTrue)
    .ELSE(() => valueWhenFalse)
```

```typescript
LAZY_VALUE<T>(initFunction: () => T): UILazyPropertyValue<T>
```
Wraps a factory for use inside `configureWithObject`. The property is initialised on first access.

```typescript
CALL<T extends (...args: any) => any>(...args: Parameters<T>): UIFunctionCall<T>
```
Creates a call descriptor for use inside `configureWithObject` when you need to invoke a method rather than assign a value.

```typescript
EXTEND<T extends (...args: any) => any>(extendingFunction: T): UIFunctionExtender<T>
```
Creates an extender for use inside `configureWithObject`. When applied, the extender runs *after* the existing method rather than replacing it.

```typescript
// Extend a method in configureWithObject
this.configureWithObject({
    layoutSubviews: EXTEND(function(this: MyView) {
        this.childView.frame = this.bounds
    })
})
```

---

### Type utilities

```typescript
type UIInitializerObject<T>   // Deep partial used by configureWithObject
type UIInitializerValue<T>    // Accepted values: primitives, nested objects, UIFunctionCall, UIFunctionExtender, UILazyPropertyValue
type RecursiveRequired<T>
type MethodsOnly<T>
type ValueOf<T>
```

---

## UIObject

Base class for all UICore objects. Implements `Configurable`.

### Constructor

```typescript
new UIObject()
```

### Instance properties

| Property | Type | Description |
|----------|------|-------------|
| `class` | `any` | Constructor of this instance. |
| `superclass` | `any` | Constructor of the parent class. |

### Instance methods

```typescript
isKindOfClass(classObject: any): boolean
```
Returns `true` if this instance is an instance of `classObject` or any subclass.

```typescript
isMemberOfClass(classObject: any): boolean
```
Returns `true` only for exact class membership (no subclass match).

```typescript
valueForKey(key: string): any
```

```typescript
valueForKeyPath<T>(keyPath: string, defaultValue?: T): T | undefined
```
Traverses dot-separated key paths. A path segment prefixed with `[]` maps over an array at that key.

```typescript
setValueForKeyPath(keyPath: string, value: any, createPath?: boolean): boolean
```

```typescript
configureWithObject<K extends keyof this>(
    object: { [P in K]?: UIInitializerValue<this[P]> }
): void
```
The primary initialiser pattern. Deeply merges `object` onto `this`. Accepts plain property values, `UIFunctionCall` descriptors, `UIFunctionExtender` wrappers, and `UILazyPropertyValue` factories.

```typescript
configuredWithObject<K extends keyof this>(
    object: { [P in K]?: UIInitializerValue<this[P]> }
): this
```
Same as `configureWithObject` but returns `this` for chaining.

```typescript
performFunctionWithDelay(delay: number, functionToCall: Function): void
```
Fires `functionToCall` after `delay` seconds (uses `UITimer` internally).

```typescript
performFunctionWithSelf<T>(functionToPerform: (self: this) => T): T
```
Passes `this` to the function and returns whatever it returns. Useful for inline transformations.

```typescript
performingFunctionWithSelf(functionToPerform: (self: this) => void): this
```
Same as above but returns `this` for chaining (the function's return value is ignored).

### Static methods

```typescript
static wrapObject<T>(object: T): UIObject & T
```
Promotes a plain object to a `UIObject` (no-op if already a `UIObject`).

```typescript
static valueForKeyPath<T>(keyPath: string, object: any, defaultValue?: T): T | undefined
static setValueForKeyPath(keyPath: string, value: any, target: any, createPath: boolean): boolean
static configureWithObject<T>(target: T, object: UIInitializerObject<T>): object
static configuredWithObject<T>(target: T, object: UIInitializerObject<T>): T
```

```typescript
static recordAnnotation(annotation: Function, target: Function): void
static classHasAnnotation(classObject: Function, annotation: Function): boolean
static annotationsOnClass(classObject: Function): Function[]
```

---

## UIColor

Wraps a CSS colour string. All factory methods return fresh instances (no shared mutable state).

### Constructor

```typescript
new UIColor(stringValue: string)
```
Accepts any valid CSS colour string (`"#ff0000"`, `"rgb(255,0,0)"`, `"red"`, etc.).

### Instance properties

| Property | Type |
|----------|------|
| `stringValue` | `string` |
| `colorDescriptor` | `UIColorDescriptor` |

### Instance methods

```typescript
colorWithAlpha(alpha: number): UIColor
colorWithRed(red: number): UIColor
colorWithGreen(green: number): UIColor
colorWithBlue(blue: number): UIColor
toString(): string   // returns stringValue
```

### Static factories

```typescript
static get redColor(): UIColor
static get blueColor(): UIColor
static get greenColor(): UIColor
static get yellowColor(): UIColor
static get blackColor(): UIColor
static get brownColor(): UIColor
static get whiteColor(): UIColor
static get greyColor(): UIColor
static get lightGreyColor(): UIColor
static get transparentColor(): UIColor
static get clearColor(): UIColor      // alias for transparent
static get nilColor(): UIColor        // empty string — no colour applied
```

```typescript
static colorWithRGBA(r: number, g: number, b: number, a?: number): UIColor
```

### Static utilities

```typescript
static nameToHex(name: string): string | undefined
static hexToDescriptor(hex: string): UIColorDescriptor
static rgbToDescriptor(colorString: string): UIColorDescriptor
```

### UIColorDescriptor interface

```typescript
interface UIColorDescriptor {
    red: number;
    green: number;
    blue: number;
    alpha?: number;
}
```

---

## UIPoint

A 2-D point. Extends `UIObject`.

### Constructor

```typescript
new UIPoint(x: number, y: number)
```

### Properties

| Property | Type |
|----------|------|
| `x` | `number` |
| `y` | `number` |
| `length` | `number` (read-only) |

### Methods

```typescript
copy(): UIPoint
isEqualTo(point: UIPoint): boolean
scale(zoom: number): this           // mutates in place, returns this
add(point: UIPoint): this
subtract(point: UIPoint): this
to(targetPoint: UIPoint): UIPoint   // vector from this → targetPoint

pointWithX(x: number): UIPoint      // copy with new x
pointWithY(y: number): UIPoint      // copy with new y
pointByAddingX(x: number): UIPoint
pointByAddingY(y: number): UIPoint
```

---

## UIRectangle

Axis-aligned rectangle with copy-on-write (COW) data sharing. Extends `UIObject`.

### Constructor

```typescript
new UIRectangle(x: number = 0, y: number = 0, height: number = 0, width: number = 0)
```

### Core properties

| Property | Type | Description |
|----------|------|-------------|
| `min` | `UIPoint` | Top-left corner (origin). |
| `max` | `UIPoint` | Bottom-right corner. |
| `x` | `number` | Left edge (`min.x`). |
| `y` | `number` | Top edge (`min.y`). |
| `width` | `number` | `max.x − min.x`. |
| `height` | `number` | `max.y − min.y`. |
| `minWidth` | `number \| undefined` | Layout constraint — minimum allowed width. Used by `rectangleByEnforcingMinAndMaxSizes()` and the fluent `settingMinWidth()` API. Not applied to CSS. |
| `maxWidth` | `number \| undefined` | Layout constraint — maximum allowed width. |
| `minHeight` | `number \| undefined` | Layout constraint — minimum allowed height. |
| `maxHeight` | `number \| undefined` | Layout constraint — maximum allowed height. |

### Derived properties (read-only)

```typescript
get center(): UIPoint
get centerX(): number
get centerY(): number
get area(): number
get isValid(): boolean         // width > 0 && height > 0
```

### SizeNumberOrFunctionOrView

Many UIRectangle methods accept flexible sizing values via this union type:

```typescript
type SizeNumberOrFunctionOrView =
    | number
    | ((constrainingOrthogonalSize: number) => number)
    | UIView   // uses intrinsic content size
```

When a `UIView` is passed, the rectangle method calls `intrinsicContentHeight(width)` or `intrinsicContentWidth(height)` on that view. When a function is passed, it receives the orthogonal dimension (e.g. width when computing height) and must return a number.

### Non-mutating constructors (return new UIRectangle)

```typescript
copy(): UIRectangle
lazyCopy(): UIRectangle       // COW — shares data until mutation

rectangleWithX(x: number, centeredOnPosition?: number): UIRectangle
rectangleWithY(y: number, centeredOnPosition?: number): UIRectangle
rectangleWithWidth(width: SizeNumberOrFunctionOrView, centeredOnPosition?: number): UIRectangle
rectangleWithHeight(height: SizeNumberOrFunctionOrView, centeredOnPosition?: number): UIRectangle

rectangleByAddingX(delta: number): UIRectangle
rectangleByAddingY(delta: number): UIRectangle
rectangleByAddingWidth(delta: number, centeredOnPosition?: number): UIRectangle
rectangleByAddingHeight(delta: number, centeredOnPosition?: number): UIRectangle

rectangleWithInset(inset: number): UIRectangle
rectangleWithInsets(left: number, right: number, bottom: number, top: number): UIRectangle

// Size relative to the other dimension
rectangleWithHeightRelativeToWidth(heightRatio?: number, centeredOnPosition?: number): UIRectangle
rectangleWithWidthRelativeToHeight(widthRatio?: number, centeredOnPosition?: number): UIRectangle

// Clamp to min/max dimensions — returns this unchanged if already within bounds
rectangleWithMaxWidth(maxWidth: number, centeredOnPosition?: number): UIRectangle
rectangleWithMaxHeight(maxHeight: number, centeredOnPosition?: number): UIRectangle
rectangleWithMinWidth(minWidth: number, centeredOnPosition?: number): UIRectangle
rectangleWithMinHeight(minHeight: number, centeredOnPosition?: number): UIRectangle

// Position relative to a reference rectangle (default: centered)
rectangleByCenteringInRectangle(
    referenceRectangle: UIRectangle,
    xPosition?: number,  // 0–1, default 0.5
    yPosition?: number   // 0–1, default 0.5
): UIRectangle

// Fractional sub-rectangle
rectangleWithRelativeValues(
    relativeXPosition: number,
    widthMultiplier: number,
    relativeYPosition: number,
    heightMultiplier: number
): UIRectangle

// Expand bounding box to include another rectangle (non-mutating)
rectangleByConcatenatingWithRectangle(rectangle: UIRectangle): UIRectangle
```

### Row / column navigation

Returns a rectangle positioned directly next to (or before) this one.
The first parameter is the gap (padding) between the two rectangles.
The second parameter sets the size on the stacking axis.

```typescript
rectangleForNextRow(padding?: number, height?: SizeNumberOrFunctionOrView): UIRectangle
rectangleForNextColumn(padding?: number, width?: SizeNumberOrFunctionOrView): UIRectangle
rectangleForPreviousRow(padding?: number, height?: SizeNumberOrFunctionOrView): UIRectangle
rectangleForPreviousColumn(padding?: number, width?: SizeNumberOrFunctionOrView): UIRectangle
```

Usage:

```typescript
// Stack three views vertically with 10px gaps
let frame = bounds.rectangleWithHeight(40)
headerView.frame = frame

frame = frame.rectangleForNextRow(10, 30)
subtitleView.frame = frame

frame = frame.rectangleForNextRow(10, contentView)  // height from intrinsic size
contentView.frame = frame
```

### Splitting and distribution

```typescript
// Weighted column / row splitting
rectanglesBySplittingWidth(
    weights: SizeNumberOrFunctionOrView[],
    paddings?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[],
    absoluteWidths?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[]
): UIRectangle[]

rectanglesBySplittingHeight(
    weights: SizeNumberOrFunctionOrView[],
    paddings?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[],
    absoluteHeights?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[]
): UIRectangle[]

// Equal splitting
rectanglesByEquallySplittingWidth(numberOfFrames: number, padding?: number): UIRectangle[]
rectanglesByEquallySplittingHeight(numberOfFrames: number, padding?: number): UIRectangle[]

// Assign frames to views using weighted splits
distributeViewsAlongWidth(
    views: UIView[],
    weights?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[],
    paddings?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[],
    absoluteWidths?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[]
): this

distributeViewsAlongHeight(
    views: UIView[],
    weights?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[],
    paddings?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[],
    absoluteHeights?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[]
): this

// Assign frames to views using equal splits
distributeViewsEquallyAlongWidth(views: UIView[], padding: number): this
distributeViewsEquallyAlongHeight(views: UIView[], padding: number): this

// Distribute views sequentially, sizing each from its intrinsic content
framesByDistributingViewsAsColumn(
    views: UIView[],
    paddings?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[],
    absoluteHeights?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[]
): UIRectangle[]

framesByDistributingViewsAsRow(
    views: UIView[],
    paddings?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[],
    absoluteWidths?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[]
): UIRectangle[]

// 2D grid: views[row][column]
framesByDistributingViewsAsGrid(
    views: UIView[][],
    paddings?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[],
    absoluteHeights?: SizeNumberOrFunctionOrView | SizeNumberOrFunctionOrView[]
): UIRectangle[][]
```

Usage:

```typescript
// Two-column layout: 1/3 sidebar, 2/3 main with 15px gap
const [sidebarFrame, mainFrame] = bounds.rectanglesBySplittingWidth([1, 2], 15)

// Distribute views in a column using intrinsic heights
bounds.framesByDistributingViewsAsColumn([titleView, bodyView, footerView], 10)
```

### Constraint helpers

```typescript
// Size from a view's intrinsic content
rectangleWithIntrinsicContentSizeForView(
    view: UIView,
    centeredOnXPosition?: number,
    centeredOnYPosition?: number
): UIRectangle

// Fluent setters for min/max constraints (return this)
settingMinHeight(minHeight?: number): this
settingMinWidth(minWidth?: number): this
settingMaxHeight(maxHeight?: number): this
settingMaxWidth(maxWidth?: number): this

// Returns a new rectangle clamped to stored min/max constraints
rectangleByEnforcingMinAndMaxSizes(
    centeredOnXPosition?: number,
    centeredOnYPosition?: number
): UIRectangle

// Set this rectangle as the frame of a view (returns this)
assignedAsFrameOfView(view: UIView, isWeakFrame?: boolean): this
```

### Mutating methods

```typescript
materialize(): void   // force COW detach before external mutation

// Translates the rectangle in place — returns this
offsetByPoint(offset: UIPoint): this

// Expands bounding box in place to include another rectangle — returns this
concatenateWithRectangle(rectangle: UIRectangle): this
```

### Utility

```typescript
isEqualTo(other: UIRectangle | undefined): boolean

// Inherited from UIObject — generic, not UIRectangle-specific
performFunctionWithSelf<T>(fn: (self: this) => T): T
performingFunctionWithSelf(fn: (self: this) => void): this  // returns this for chaining
```

---

## UIView

The central layout and rendering node. Every visible element in UICore is a `UIView` or subclass. Extends `UIObject`.

### Constructor

```typescript
new UIView(
    elementID?: string,
    viewHTMLElement?: HTMLElement | null,
    elementType?: string | null    // defaults to "div"
)
```

### Static control events

```typescript
UIView.controlEvent = {
    PointerDown, PointerUp, PointerUpInside, PointerMove,
    PointerHover, PointerLeave, PointerEnter, PointerCancel,
    PointerTap,
    Focus, Blur,
    EnterDown, EnterUp,
    UpArrowDown, DownArrowDown,
    EscDown,
    MultipleTouches,
    // … and more
}
```

### Static broadcast event names

```typescript
UIView.broadcastEventName = {
    AddedToViewTree,
    PageDidScroll,
    WindowDidResize,
    LanguageChanged,
    // … and more
}
```

### Static layout methods

```typescript
static layoutViewsIfNeeded(): void
static runFunctionBeforeNextFrame(fn: () => void): void
static animateViewOrViewsWithDurationDelayAndFunction(
    view: UIView | UIView[],
    duration: number,
    delay: number,
    timingFunction: string | undefined,
    animationsFunction: () => void,
    completionFunction: (() => void) | null
): void
```

### Static page dimensions

```typescript
static get pageWidth(): number
static get pageHeight(): number
static get pageScale(): number
static invalidatePageDimensionsCache(): void
```

### Core instance properties

| Property | Type | Description |
|----------|------|-------------|
| `viewHTMLElement` | `HTMLElement` | The underlying DOM element. |
| `elementID` | `string` | `viewHTMLElement.id`. |
| `superview` | `UIView \| undefined` | Parent in the view tree. |
| `subviews` | `UIView[]` | Direct children. |
| `viewController` | `UIViewController \| undefined` | Owning view controller, if any. |
| `core` | `UICore` | UICore instance (defaults to `UICore.main`). |
| `style` | `CSSStyleDeclaration` | Inline style of the element. |
| `computedStyle` | `CSSStyleDeclaration` | `getComputedStyle` result. |

### Geometry

```typescript
get frame(): UIRectangle
set frame(rect: UIRectangle)

get bounds(): UIRectangle   // origin always (0, 0)
get rootView(): UIView

setFrame(rect: UIRectangle, zIndex?: number, performUncheckedLayout?: boolean): void
setPosition(
    left?: number | string,
    right?: number | string,
    bottom?: number | string,
    top?: number | string,
    height?: number | string,
    width?: number | string
): void
setSizes(height?: number | string, width?: number | string): void
setMargins(left?: number | string, right?: number | string, bottom?: number | string, top?: number | string): void
setPaddings(left?: number | string, right?: number | string, bottom?: number | string, top?: number | string): void
```

`setPosition` sets CSS `left`/`right`/`bottom`/`top`/`height`/`width` as inline styles. All parameters accept `nil` to skip a property.

### Appearance

```typescript
get hidden(): boolean
set hidden(hidden: boolean)

get alpha(): number
set alpha(alpha: number)

get backgroundColor(): UIColor
set backgroundColor(color: UIColor)

get zIndex(): number
set zIndex(index: number)

setBorder(radius: number, width: number, color?: UIColor): void
setCornerRadius(radius: number): void
setShadow(x: number, y: number, blur: number, color: UIColor): void
```

### Layout

```typescript
setNeedsLayout(): void
setNeedsLayoutUpToRootView(): void

get needsLayout(): boolean

// Called by the layout engine — override in subclasses
layoutSubviews(): void

// Intrinsic sizing
intrinsicContentSize(): UIRectangle
intrinsicContentHeight(constrainingWidth?: number): number
intrinsicContentWidth(constrainingHeight?: number): number
clearIntrinsicSizeCache(): void

// Content bounds — the usable interior area after content insets
get contentBounds(): UIRectangle
contentBoundsWithInset(inset: number): UIRectangle     // sets all insets uniformly
contentBoundsWithInsets(left: number, right: number, bottom: number, top: number): UIRectangle

// Convenience position helpers
centerInContainer(): void
centerXInContainer(): void
centerYInContainer(): void
```

### View hierarchy

```typescript
addSubview(view: UIView): void
removeFromSuperview(): void
hasSubview(view: UIView): boolean
forEachViewInSubtree(fn: (view: UIView) => void): void

get isMemberOfViewTree(): boolean
get rootView(): UIView
```

### Event handling

```typescript
addTargetForControlEvent(event: string, handler: Function): void
addTargetForControlEvents(events: string[], handler: Function): void
removeTargetForControlEvent(event: string, handler: Function): void
sendControlEventForKey(event: string, nativeEvent?: Event): void

// Fluent accumulator — assigns one handler per control event
get controlEventTargetAccumulator(): UIViewAddControlEventTargetObject<UIView>
```

Usage pattern:

```typescript
view.controlEventTargetAccumulator.PointerUpInside = () => this.doSomething()
// Chain multiple events in one expression:
view.controlEventTargetAccumulator.PointerUpInside.EnterDown = () => this.doSomething()
```

### Broadcast events

```typescript
broadcastEventInSubtree(event: UIViewBroadcastEvent): void

// Override in subclasses to receive events
didReceiveBroadcastEvent(event: UIViewBroadcastEvent): void
```

### Interaction flags

```typescript
userInteractionEnabled: boolean
pausesPointerEvents: boolean     // YES = absorb pointer events but don't propagate
stopsPointerEventPropagation: boolean
ignoresTouches: boolean
ignoresMouse: boolean
nativeSelectionEnabled: boolean  // text selection
tabIndex: number

get enabled(): boolean
set enabled(enabled: boolean)
updateContentForCurrentEnabledState(): void  // override in subclasses

focus(): void
blur(): void
```

### Content

```typescript
get innerHTML(): string
set innerHTML(html: string)

hoverText: string | undefined | null   // tooltip

setInnerHTML(key: string, defaultString: string, parameters?: Record<string, string>): void

get scrollSize(): UIRectangle
get localizedTextObject(): UILocalizedTextObject | undefined
set localizedTextObject(obj: UILocalizedTextObject | undefined)
```

### Loading overlay

```typescript
get loading(): boolean
set loading(isLoading: boolean)
```
Requires `UIView.LoadingViewClass` to be registered once at startup:
```typescript
UIView.LoadingViewClass = UILoadingView
```

### Style classes

```typescript
addStyleClass(className: string): void
removeStyleClass(className: string): void
get styleClasses(): string[]
set styleClasses(classes: string[])
get styleClassName(): string  // per-class CSS selector token

// Override to register static CSS rules once per class
initViewStyleSelectors(): void
initStyleSelector(selector: string, style: string): void
```

### Lifecycle callbacks (override in subclasses)

```typescript
willMoveToSuperview(superview: UIView): void
didMoveToSuperview(superview: UIView): void
wasAddedToViewTree(): void
wasRemovedFromViewTree(): void
willAppear(animated?: boolean): void
didAppear(animated?: boolean): void
```

### Coordinate conversion

```typescript
rectangleInView(rectangle: UIRectangle, view: UIView, forceIfNotInViewTree?: boolean): UIRectangle
rectangleFromView(rectangle: UIRectangle, view: UIView): UIRectangle  // inverse of rectangleInView
```

### Virtual layout

```typescript
startVirtualLayout(): void
finishVirtualLayout(): void
get isVirtualLayouting(): boolean
usesVirtualLayoutingForIntrinsicSizing: boolean  // default YES
```

---

## UIBaseButton

Abstract interactive element with pointer-state tracking. Extends `UIView`.

### State properties

```typescript
get selected(): boolean
set selected(selected: boolean)

get highlighted(): boolean
set highlighted(highlighted: boolean)

get hovered(): boolean
set hovered(hovered: boolean)

get focused(): boolean
set focused(focused: boolean)

isToggleable: boolean   // when YES, PointerUpInside toggles selected state
```

### State override methods (override in subclasses)

```typescript
updateContentForCurrentState(): void
updateContentForNormalState(): void
updateContentForHoveredState(): void        // default: calls Normal
updateContentForFocusedState(): void        // default: calls Hovered
updateContentForHighlightedState(): void
updateContentForSelectedState(): void
updateContentForSelectedAndHighlightedState(): void  // default: calls Selected
updateContentForCurrentEnabledState(): void
```

State priority (highest first): SelectedAndHighlighted → Selected → Focused → Highlighted → Hovered → Normal.

---

## UIButton

Full-featured button with title label, image view, and per-state colour configuration. Extends `UIBaseButton`.

### UIButtonColorSpecifier interface

```typescript
interface UIButtonColorSpecifier {
    background: {
        normal: UIColor;
        hovered?: UIColor;
        focused?: UIColor;
        highlighted: UIColor;
        selected: UIColor;
        selectedAndHighlighted?: UIColor;
    };
    titleLabel: {
        normal: UIColor;
        hovered?: UIColor;
        focused?: UIColor;
        highlighted: UIColor;
        selected: UIColor;
        selectedAndHighlighted?: UIColor;
    };
}
```

### UIButtonElementColorSpecifier interface

```typescript
interface UIButtonElementColorSpecifier {
    normal: UIColor;
    hovered?: UIColor;
    focused?: UIColor;
    highlighted: UIColor;
    selected: UIColor;
    selectedAndHighlighted?: UIColor;
}
```

### Constructor

```typescript
new UIButton(elementID?: string, elementType?: string, titleType?: string)
```

### Properties

```typescript
get titleLabel(): UITextView
get imageView(): UIImageView

colors: UIButtonColorSpecifier         // drives all state methods
contentPadding: number                 // horizontal padding for text/image
usesAutomaticTitleFontSize: boolean
minAutomaticFontSize: number
maxAutomaticFontSize: number
```

---

## UILink

A button backed by an `<a>` element for native browser navigation. Extends `UIBaseButton`.

### Properties

```typescript
text: string
target: string       // the href attribute value

// Returns a UIRoute or URL string for the current app state
targetRouteForCurrentState: () => UIRoute | string
colors: UIButtonColorSpecifier | undefined
```

`target` is automatically kept in sync when the route changes (via `RouteDidChange` broadcast).

---

## UILinkButton

Wraps a `UIButton` inside a `UILink`, combining styled button visuals with native `<a>` semantics. Extends `UILink`.

```typescript
get titleLabel(): UITextView   // forwarded from inner UIButton
get imageView(): UIImageView
colors: UIButtonColorSpecifier
target: string
```

---

## UITextView

Text display and measurement. Backed by a flex wrapper `<span>` containing an inner element (`<p>`, `<h1>`–`<h6>`, `<span>`, etc.). Extends `UIView`.

### Static properties

```typescript
static defaultTextColor: UIColor      // = UIColor.blackColor
static notificationTextColor: UIColor // = UIColor.redColor

static type = {
    paragraph: "p",
    header1: "h1", header2: "h2", header3: "h3",
    header4: "h4", header5: "h5", header6: "h6",
    textArea: "textarea",
    textField: "input",
    span: "span",
    label: "label"
} as const

static textAlignment = {
    left: "left", center: "center",
    right: "right", justify: "justify"
} as const
```

### Constructor

```typescript
new UITextView(elementID?: string, textViewType?: string)
```
`textViewType` defaults to `UITextView.type.paragraph`.

### Core text properties

```typescript
text: string                      // innerHTML of the inner element
textColor: UIColor
textAlignment: ValueOf<typeof UITextView.textAlignment>
fontSize: number                  // in points
isSingleLine: boolean             // true = nowrap + ellipsis; false = multiline
notificationAmount: number        // appends a red "(n)" badge to the text
```

### Inner element access

```typescript
get textElementView(): UIView     // the inner element UIView
get containerStyle(): CSSStyleDeclaration  // outer wrapper styles
```

### Localisation

```typescript
setText(key: string, defaultString: string, parameters?: Record<string, string>): void
```

### Measurement

```typescript
intrinsicContentSize(): UIRectangle
intrinsicContentHeight(constrainingWidth?: number): number
intrinsicContentWidth(constrainingHeight?: number): number

useAutomaticFontSize(minFontSize?: number, maxFontSize?: number): void
setUseFastMeasurement(useFast: boolean): void
invalidateMeasurementStrategy(): void

static automaticallyCalculatedFontSize(
    bounds: UIRectangle,
    intrinsicSize: UIRectangle,
    currentFontSize: number,
    minFontSize: number,
    maxFontSize: number
): number
```

### Overrides

```typescript
notificationAmountDidChange(amount: number): void  // hook — override in subclass
```

---

## UITextField

Editable single-line text input (`<input type="text">`). Extends `UITextView`.

### Additional control events

```typescript
UITextField.controlEvent.TextChange       // fires on oninput and onchange
UITextField.controlEvent.ValidationChange // fires when autocomplete validation state changes
```

### Properties

```typescript
text: string                   // the current input value (read/write)
placeholderText: string
isSecure: boolean              // toggles type="password"

// Native browser datalist autocomplete
nativeAutocompleteData: string[]
minCharactersForAutocomplete: number  // default 0
hideNativeAutocompleteOnExactMatch: boolean  // default YES

// Validation against the autocomplete list
validatesAgainstNativeAutocomplete: boolean
isValidAgainstNativeAutocomplete: boolean  // read-only
validationInvalidBackgroundColor: UIColor
validationInvalidBorderColor: UIColor
```

### Methods

```typescript
setPlaceholderText(key: string, defaultString: string): void  // localised placeholder

clearIfInvalid(): boolean          // clears text if it fails autocomplete validation
getMatchingAutocompleteOptions(): string[]
```

---

## UITextArea

Multi-line `<textarea>`. Extends `UITextField`. The textarea fills its parent's `contentBounds`; set height on the parent view.

```typescript
new UITextArea(elementID?: string)
```

Inherits all `UITextField` properties. `isSingleLine` is effectively `NO`.

---

## UIImageView

Image element (`<img>`). Extends `UIView`.

### Static fill modes

```typescript
UIImageView.fillMode = {
    stretchToFill: "fill",
    aspectFit: "contain",
    aspectFill: "cover",
    center: "none",
    aspectFitIfLarger: "scale-down"
}
```

### Properties

```typescript
imageSource: string      // the img src attribute; setting empty hides the view
fillMode: string         // one of UIImageView.fillMode values (sets object-fit)
hiddenWhenEmpty: boolean // auto-hide when imageSource is empty
```

### Methods

```typescript
getDataURL(height?: number, width?: number): string  // renders to canvas and returns data URL

setImageSource(key: string, defaultString: string): void  // localised image source
intrinsicContentSize(): UIRectangle  // returns natural image dimensions
```

### Static utilities

```typescript
static dataURL(url: string | URL, callback: (result: string | ArrayBuffer | null) => void): void
static dataURLWithMaxSize(url: string, maxSize: number, completion: (url: string) => void): void
static dataURLWithSizes(url: string, height: number, width: number, completion: (url: string) => void): void
static objectURLFromDataURL(dataURL: string): string
```

---

## UIActionIndicator

Animated spinner view. Hidden by default. Extends `UIView`.

### Properties

```typescript
size: number      // spinner size in pixels (default 50)
```

### Methods

```typescript
start(): void   // show and animate
stop(): void    // hide
```

---

## UILoadingView

Full-overlay loading screen with a spinner. Typically registered globally and shown via `view.loading = YES`. Extends `UIView`.

```typescript
new UILoadingView(elementID?: string)
```

```typescript
theme: "light" | "dark"   // default "light"
```

Register once at startup:

```typescript
UIView.LoadingViewClass = UILoadingView
```

---

## UIScrollView

A custom-implemented scroll container backed by an absolutely positioned container view. Pointer-drag scrolling (touch and mouse) is built in. Extends `UIView`.

### Constructor

```typescript
new UIScrollView(elementID: string)
```

### Properties

```typescript
get containerView(): UIView     // the scrollable content container

get contentOffset(): UIPoint
set contentOffset(offset: UIPoint)  // triggers layout

_scrollEnabled: boolean   // whether drag-scroll is active
```

### Methods

```typescript
// Override addSubview — adds to containerView
addSubview(view: UIView): void
invalidateIntrinsicContentFrame(): void
```

---

## UINativeScrollView

Uses the browser's native scroll (`overflow: auto`). Extends `UIView`. This is the base of `UITableView`.

### Key properties

```typescript
scrollsX: boolean
scrollsY: boolean
animationDuration: number

get contentOffset(): UIPoint
set contentOffset(offset: UIPoint)

get scrollSize(): UIRectangle  // full scrollable content dimensions
```

### Methods

```typescript
scrollToTop(animated?: boolean): void

// Override to react to scroll position changes
didScrollToPosition(offsetPosition: UIPoint): void
```

---

## UITableView

Virtualised list with off-screen row recycling. Extends `UINativeScrollView`.

### Properties

```typescript
allRowsHaveEqualHeight: boolean  // optimises position calculation when YES
sidePadding: number              // horizontal padding applied to each row
animationDuration: number        // used by animated row changes (default 0.25)
reloadsOnLanguageChange: boolean // default YES
cellWeights: number[] | undefined  // column width ratios for grid layouts
```

### Data source methods (override to provide content)

```typescript
numberOfRows(): number              // default 10000 — always override
heightForRowWithIndex(index: number): number  // default 50
viewForRowWithIndex(index: number): UIView    // return a configured row view
newReusableViewForIdentifier(identifier: string, rowIDIndex: number): UIView

// Persistence — save/restore transient row state across virtualisation cycles
defaultRowPersistenceDataItem(): any
persistenceDataItemForRowWithIndex(rowIndex: number, row: UIView): any
```

### Reload / update

```typescript
reloadData(): void                                  // full reload, clears reuse pool
loadData(): void                                    // recalculate positions, keep pool
invalidateSizeOfRowWithIndex(index: number, animateChange?: boolean): void
highlightChanges(previousData: any[], newData: any[]): void  // animates new rows
```

### Reuse pool

```typescript
reusableViewForIdentifier(identifier: string, rowIndex: number): UIView
```

### Query

```typescript
visibleRowWithIndex(rowIndex: number | undefined): UIView | undefined
isRowWithIndexVisible(rowIndex: number): boolean
indexesForVisibleRows(paddingRatio?: number): number[]
intrinsicContentHeight(constrainingWidth?: number): number
```

---

## UISlideScrollerView

Horizontal carousel / slideshow. Extends `UIView`.

### Properties

```typescript
slideViews: UIView[]       // set to replace all slides
currentPageIndex: number   // read/write; triggers scroll
wrapAround: boolean        // default YES
animationDuration: number  // slide transition (default 0.35 s)
animationDelay: number     // auto-play delay (default 2 s)
```

### Methods

```typescript
scrollToPageWithIndex(targetIndex: number, animated?: boolean): void
scrollToNextPage(animated: boolean): void
scrollToPreviousPage(animated: boolean): void

startAnimating(): void     // begin auto-play
stopAnimating(): void

// Override hooks
willScrollToPageWithIndex(index: number): void
didScrollToPageWithIndex(index: number): void
buttonForPageIndicatorWithIndex(index: number): UIButton  // customise indicators
```

---

## UIDialogView

Modal overlay. The `view` property holds the content; the `UIDialogView` itself is the dark backdrop. Generic parameter `ViewType` constrains the content view type. Extends `UIView`.

### Constructor

```typescript
new UIDialogView<ViewType extends UIView>(elementID?: string)
```

### Properties

```typescript
view: ViewType             // the content view
isVisible: boolean
dismissesOnTapOutside: boolean  // default YES
animationDuration: number       // default 0.25 s
zIndex: number
```

### Methods

```typescript
showInView(containerView: UIView, animated: boolean): void
showInRootView(animated: boolean): void   // shortcut — shows in UICore.main rootView
dismiss(animated?: boolean): void

// Override to customise enter/exit animations
animateAppearing(): void
animateDisappearing(): void
didDetectTapOutside(sender: UIView, event: Event): void
```

---

## UIDateTimeInput

Native `<input type="date|time|datetime">`. Extends `UIView`.

### Additional control events

```typescript
UIDateTimeInput.controlEvent.ValueChange
```

### Static types

```typescript
UIDateTimeInput.type = {
    Date: "date",
    Time: "time",
    DateTime: "datetime"
}
UIDateTimeInput.format = {
    European: "DD-MM-YYYY",
    ISOComputer: "YYYY-MM-DD",
    American: "MM/DD/YYYY"
}
```

### Constructor

```typescript
new UIDateTimeInput(elementID: string, type?: string)
```

### Properties

```typescript
get date(): Date   // parsed from the current input value
```

---

## UIAutocompleteTextField

Text field with a filtered dropdown. Extends `UITextField`.

### Additional control events

```typescript
UIAutocompleteTextField.controlEvent.SelectionDidChange
```

### Properties

```typescript
autocompleteStrings: string[]                // convenience setter — converts to items
autocompleteData: UIAutocompleteItem<T>[]    // full item list (label + value)
selectedItem: T | undefined                  // the committed selection value
strictSelection: boolean                     // clears text if not in list on close
get isValid(): boolean
```

### Methods

```typescript
commitSelection(item: UIAutocompleteItem<T>): void
openDropdown(): void
closeDropdown(): void
updateFilteredItems(): void
updateValidationVisuals(): void  // hook — override in subclass

// Override to return a custom dropdown
newDropdownView(): UIAutocompleteDropdownView<T>
```

---

## UIAutocompleteDropdownView

Dropdown list anchored beneath a field. Typically created and owned by `UIAutocompleteTextField`. Extends `UIView`.

### Properties

```typescript
filteredItems: UIAutocompleteItem<T>[]
highlightedRowIndex: number
get highlightedItem(): UIAutocompleteItem<T> | undefined
didSelectItem: ((item: UIAutocompleteItem<T>) => void) | undefined
anchorView: UIView | undefined

_rowHeight: number          // default 36
_maxVisibleRows: number     // default 8
```

### Methods

```typescript
showAnchoredToView(anchorView: UIView): void
dismiss(): void
newRowView(identifier: string, rowIndex: number): UIAutocompleteRowView<T>  // override in subclass
```

---

## UIAutocompleteRowView

A single row in `UIAutocompleteDropdownView`. Extends `UIButton`.

```typescript
item: UIAutocompleteItem<T>
```

### UIAutocompleteItem interface

```typescript
interface UIAutocompleteItem<T> {
    label: string;
    value: T;
}
```

---

## UITimer

Thin wrapper around `setInterval` / `clearInterval`.

### Constructor

```typescript
new UITimer(interval: number, repeats: boolean, target: Function)
```
`interval` is in **seconds**. The timer starts immediately.

### Properties

```typescript
interval: number
repeats: boolean
isValid: boolean
```

### Methods

```typescript
schedule(): void
reschedule(): void   // invalidates then re-schedules
fire(): void         // execute target immediately, then handle repeat/invalidate
invalidate(): void   // stops the timer
```

---

## UIStringFilter

Off-thread string filtering via a shared `Worker`. Case-insensitive, space-tokenised (all words must match). Results arrive in callback order.

### Constructor

```typescript
new UIStringFilter(useSeparateWebWorkerHolder?: boolean)
```
Pass `YES` to get a dedicated worker (for high-frequency independent searches).

### Methods

```typescript
// Callback-based
filterData(
    filteringString: string,
    data: string[],
    excludedData: string[],
    identifier: any,
    completion: (filteredData: string[], filteredIndexes: number[], identifier: any) => void
): void

// Promise-based
filteredData(
    filteringString: string,
    data: string[],
    excludedData?: string[],
    identifier?: any
): Promise<{ filteredData: string[], filteredIndexes: number[], identifier: any }>

closeThread(): void   // terminate a dedicated worker
```

---

## UIKeyValueStringFilter

Like `UIStringFilter` but filters objects by a dot-path string value.

### Constructor

```typescript
new UIKeyValueStringFilter(useSeparateWebWorkerHolder?: boolean)
```

### Methods

```typescript
filterData<T extends object>(
    filteringString: string,
    data: T[],
    excludedData: string[],
    dataKeyPath: string,
    identifier: any,
    completion: (filteredData: T[], filteredIndexes: number[], identifier: any) => void
): void

closeThread(): void
```

---

## UIKeyValueSorter

Off-thread multi-key sorting via a shared `Worker`.

### Static constants

```typescript
UIKeyValueSorter.dataType = { string: "string", number: "number" }
UIKeyValueSorter.direction = { ascending: "ascending", descending: "descending" }
```

### UIKeyValueSorterSortingInstruction interface

```typescript
interface UIKeyValueSorterSortingInstruction {
    keyPath: string;
    dataType: "string" | "number";
    direction: "ascending" | "descending";
}
```

### Constructor

```typescript
new UIKeyValueSorter(useSeparateWebWorkerHolder?: boolean)
```

### Methods

```typescript
// Callback-based
sortData<T>(
    data: T[],
    sortingInstructions: UIKeyValueSorterSortingInstruction[],
    identifier: any,
    completion: (sortedData: T[], sortedIndexes: number[], identifier: any) => void
): void

// Promise-based
sortedData<T>(
    data: T[],
    sortingInstructions: UIKeyValueSorterSortingInstruction[],
    identifier?: any
): Promise<{ sortedData: T[], sortedIndexes: number[], identifier: any }>

closeThread(): void
```

---

## UILayoutGrid

Helper for splitting a `UIRectangle` into a grid. Not fully implemented in the current codebase — `splitXInto` is stubbed. Extend or use directly when the implementation is complete.

```typescript
new UILayoutGrid(frame: UIRectangle)
```

---

## UIViewController

Base class for all view controllers. Manages a root `UIView` and participates in the route, lifecycle, and view-controller hierarchy. Extends `UIObject`.

### Static properties

```typescript
static readonly routeComponentName: string    // declare in subclass
static readonly ParameterIdentifierName: any  // declare in subclass for type-safe params
```

### Constructor

```typescript
new UIViewController(view: UIView)
```

### Properties

```typescript
view: UIView
parentViewController: UIViewController | undefined
childViewControllers: UIViewController[]
get core(): UICore
get routeComponent(): UIRouteComponent | undefined
```

### Lifecycle (override in subclasses)

```typescript
async viewWillAppear(): Promise<void>
async viewDidAppear(): Promise<void>
async viewWillDisappear(): Promise<void>
async viewDidDisappear(): Promise<void>

viewWillLayoutSubviews(): void   // calls updateViewConstraints + updateViewStyles
viewDidLayoutSubviews(): void
updateViewConstraints(): void    // hook
updateViewStyles(): void         // hook
layoutViewSubviews(): void       // hook
```

### Route handling

```typescript
async handleRoute(route: UIRoute): Promise<void>           // override in subclass
handleRouteRecursively(route: UIRoute): void               // called by UICore; recurses into children
viewDidReceiveBroadcastEvent(event: UIViewBroadcastEvent): void
```

### Child view controller management

```typescript
addChildViewController(viewController: UIViewController): void
removeChildViewController(controller: UIViewController): void
removeFromParentViewController(): void
hasChildViewController(viewController: UIViewController): boolean

// Add a child whose view goes into a specific container view
addChildViewControllerInContainer(
    controller: UIViewController,
    containerView: UIView
): void

// Add a child and connect it to a UIDialogView's content
addChildViewControllerInDialogView(
    controller: UIViewController,
    dialogView: UIDialogView
): void

willMoveToParentViewController(parent: UIViewController): void
didMoveToParentViewController(parent: UIViewController): void
```

---

## UIRootViewController

Application root. Owns the full-screen `UIView` and manages lazy-loaded child view controllers. Extends `UIViewController`.

### Interfaces

```typescript
interface UIRootViewControllerLazyViewControllerObject<T extends typeof UIViewController> {
    viewControllerClass: T;
    deleteOnUnload?: boolean;    // destroy VC instance when not shown (saves memory)
    shouldShow?: () => Promise<boolean> | boolean;
}

interface UIRootViewControllerLazyViewControllersObject {
    [key: string]: UIRootViewControllerLazyViewControllerObject<any>;
}
```

### Properties

```typescript
topBarView: UIView      // persistent top bar — excluded from content area
bottomBarView: UIView   // persistent bottom bar
```

### Methods

```typescript
// Register lazy view controllers by key
lazyViewControllerObjectWithClass<T extends typeof UIViewController>(
    viewControllerClass: T,
    options?: { deleteOnUnload?: boolean; shouldShow?: () => Promise<boolean> | boolean }
): UIRootViewControllerLazyViewControllerObject<T>

// Scale the RootView for zoom/accessibility
updatePageScale(options: {
    minWidth?: number;
    maxWidth?: number;
    minScale?: number;
    maxScale?: number;
}): void

// Perform root-level layout
performDefaultLayout(): void
```

---

## UIRoute

Represents the URL hash as a structured array of named components with key-value parameters. Extends `Array<UIRouteComponent>`.

Hash format: `#component1[key:value,key2:value2]/component2[key:value]/`

### UIRouteComponent interface

```typescript
interface UIRouteComponent<T = any> {
    name: string;
    parameters: UIRouteParameters<T>;
}

type UIRouteParameters<T = any> = {
    [K in keyof T]?: string;
}
```

### Static accessors

```typescript
static get currentRoute(): UIRoute   // parsed from window.location.hash
```

### Instance methods

```typescript
// Navigation
apply(): void                           // pushes route to history
applyByReplacingCurrentRouteInHistory(): void  // replaces history entry

get linkRepresentation(): string        // the hash string for use in href

// Lookup
componentWithName(name: string): UIRouteComponent | undefined
componentWithViewController(vcClass: typeof UIViewController): UIRouteComponent | undefined

// Build a new route
routeBySettingComponent(component: UIRouteComponent): UIRoute
routeByRemovingComponentWithName(name: string): UIRoute
routeByRemovingComponentsOtherThanOnesNamed(names: string[]): UIRoute

// Parameter helpers on a component
parametersWithValue(value: string, forKey: string): UIRouteParameters
```

### Typical pattern

```typescript
class SearchViewController extends UIViewController {
    static readonly routeComponentName = "search"

    // Write to route from control event
    override async viewDidAppear() {
        this.searchField.controlEventTargetAccumulator.TextChange = () => {
            UIRoute.currentRoute
                .routeBySettingComponent({
                    name: SearchViewController.routeComponentName,
                    parameters: { query: this.searchField.text }
                })
                .apply()
        }
    }

    // Read from route on navigation
    override async handleRoute(route: UIRoute) {
        const component = route.componentWithViewController(SearchViewController)
        const query = component?.parameters?.query ?? ""
        this.searchField.text = query
        this.reload(query)
    }
}
```

---

## UICore

Bootstrap singleton that wires the root view controller to the DOM and starts the event loop. Extends `UIObject`.

### Static properties

```typescript
static main: UICore                  // the singleton instance
static RootViewControllerClass: typeof UIViewController
static readonly broadcastEventName = {
    RouteDidChange: "RouteDidChange",
    WindowDidResize: "WindowDidResize"
}
```

### Constructor

```typescript
new UICore(
    rootDivElementID: string,
    rootViewControllerClass: typeof UIViewController,
    paddingLength?: number   // default 20
)
```

### Instance properties

```typescript
rootViewController: UIViewController
paddingLength: number
```

### What UICore wires automatically

- `window resize` → invalidates frame cache, triggers two layout passes, broadcasts `WindowDidResize`
- `window scroll` → broadcasts `PageDidScroll`
- `window hashchange` → calls `handleRouteRecursively`, broadcasts `RouteDidChange`

---

## Native prototype extensions

UICore extends JavaScript built-in prototypes via `UICoreExtensions.ts`. These are available globally once UICore is imported.

### Array\<T\>

```typescript
removeElementAtIndex(index: number): void
removeElement(element: T): void
insertElementAtIndex(index: number, element: T): void
replaceElementAtIndex(index: number, element: T): void
contains(element: T): boolean
findAsyncSequential(fn: (value: T) => Promise<boolean>): Promise<T | undefined>
groupedBy(keyFn: (item: T) => any): { [key: string]: T[] }
uniqueMap<R>(keyFn: (item: T) => R): R[]
copy(): T[]
arrayByRepeating(n: number): T[]
arrayByTrimmingToLengthIfLonger(maxLength: number): T[]
anyMatch(predicate: (value: T, index: number, obj: T[]) => boolean): boolean
noneMatch(predicate: ...): boolean
allMatch(predicate: ...): boolean

get firstElement(): T
get lastElement(): T
get summedValue(): T     // numeric sum
get everyElement(): T    // proxy — setting a property sets it on all elements
max(): number
min(): number
average(): number
isEqualToArray(array: T[], keyPath?: string): boolean
```

### String

```typescript
contains(string: string): boolean
get numericalValue(): number
get integerValue(): number
isAString: true
```

### Number

```typescript
isANumber: true
get integerValue(): number
constrainedValue(min: number, max: number): number
```

### Date

```typescript
get dateString(): string
```

### Object

```typescript
forEach(callback: (value: any, key: string, stopLooping: () => void) => void): void
objectByCopyingValuesRecursivelyFromObject<T extends object>(object: T): T & this
get allValues(): any[]
get allKeys(): (keyof this)[]
```

---

## Decorator — @UIComponentView

```typescript
function UIComponentView(target: Function, context: ClassDecoratorContext): void
```

Applied to a `UIView` subclass to register it as a reusable component. This makes it available for visual editing in CBEditor (when that layer is included in the application).

```typescript
@UIComponentView
export class MyCard extends UIView { ... }
```

The annotation is stored on `UIObject.annotationsMap` and can be queried:

```typescript
UIObject.classHasAnnotation(MyCard, UIComponentView)  // → true
```
