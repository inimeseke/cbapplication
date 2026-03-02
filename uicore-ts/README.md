# UICore-TS

A TypeScript web UI framework inspired by Apple's UIKit, designed for building complex, performant web applications with an imperative, frame-based layout model.

---

## Table of Contents

- [Philosophy](#philosophy)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
  - [HTML Setup](#html-setup)
  - [Entry Point — RunApplication.ts](#entry-point--runapplicationts)
- [Core Classes](#core-classes)
  - [UIObject](#uiobject)
  - [UIView](#uiview)
  - [UIViewController](#uiviewcontroller)
  - [UIRootViewController](#uirootviewcontroller)
  - [UICore](#uicore)
- [Layout System](#layout-system)
  - [UIRectangle](#uirectangle)
  - [UIPoint](#uipoint)
  - [Frame-Based Layout](#frame-based-layout)
  - [Layout Methods Reference](#layout-methods-reference)
- [Routing](#routing)
  - [UIRoute](#uiroute)
- [UI Components](#ui-components)
  - [UITextView](#uitextview)
  - [UITextField & UITextArea](#uitextfield--uitextarea)
  - [UIButton & UIBaseButton](#uibutton--uibasebutton)
  - [UILink & UILinkButton](#uilink--uilinkbutton)
  - [UITableView](#uitableview)
  - [UIScrollView & UINativeScrollView](#uiscrollview--uinativescrollview)
  - [UISlideScrollerView](#uislidescrollerview)
  - [UIImageView](#uiimageview)
  - [UIDialogView](#uidialogview)
  - [UIActionIndicator](#uiactionindicator)
  - [UILoadingView](#uiloadingview)
  - [UIDateTimeInput](#uidatetimeinput)
  - [UIAutocompleteTextField](#uiautocompletextfield)
- [Event System](#event-system)
- [Color System](#color-system)
  - [UIColor](#uicolor)
  - [Extending UIColor — BSColor pattern](#extending-uicolor--bscolor-pattern)
- [Subclassing Components](#subclassing-components)
  - [Custom UIButton subclass](#custom-uibutton-subclass)
  - [Animated collapsible view](#animated-collapsible-view)
- [Utilities](#utilities)
  - [UITimer](#uitimer)
  - [UIStringFilter & UIKeyValueStringFilter](#uistringfilter--uikeyvaluestringfilter)
  - [UIKeyValueSorter](#uikeyvaluesorter)
  - [UICoreExtensions](#uicoreextensions)
- [Global Utility Functions](#global-utility-functions)
- [Templates](#templates)
  - [SomeContentView](#somecontentview-template)
  - [SomeContentViewController](#somecontentviewcontroller-template)

---

## Philosophy

UICore-TS brings the **UIKit programming model** to the web. Rather than declarative templates or reactive state trees, layouts are computed explicitly in code — a style that is:

- **Predictable**: You read the layout code and know exactly where every pixel lands.
- **Debuggable**: No magic diffing, virtual DOM, or compiler transforms.
- **Composable**: Views are plain TypeScript classes; composition is just class inheritance and subview trees.
- **Performant**: A copy-on-write rectangle API, Web Worker–based filtering, virtual scrolling in `UITableView`, and canvas-based text measurement keep things fast.

The guiding principles are **KISS** and **separation of concerns**. Views handle presentation; view controllers handle business logic and layout coordination. The framework does not enforce data binding — you call methods and set properties.

---

## Architecture Overview

```
UICore                          ← Application bootstrap & global state
└── UIRootViewController        ← Root controller; manages content & details VCs
    └── UIViewController        ← Screen-level controller
        └── UIView              ← All visual elements; subclasses for each widget
```

Every visual component is a `UIView`. Every screen is managed by a `UIViewController`. The `UICore` singleton initialises the root view from a DOM element, sets up resize and hash-change listeners, and dispatches layout and routing events.

---

## Getting Started

### Installation

```bash
npm install uicore-ts
```

### HTML Setup

UICore mounts onto a single `<div>` that fills the viewport. Everything else — every view, every dialog, every table row — is created entirely in TypeScript. A minimal but production-ready `index.html` looks like this:

```html
<!DOCTYPE html>
<head>
    <title>My UICore App</title>

    <!-- Scale the viewport for responsive layouts.
         UICore's updatePageScale() works in concert with this. -->
    <meta name="viewport" content="width=device-width, initial-scale=0.86,
          maximum-scale=3.0, minimum-scale=0.86">

    <!-- Bootstrap 5.3 (optional — not required by UICore) -->
    <link rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"/>

    <!-- Optional: icons and fonts -->
    <link href="https://fonts.googleapis.com/css?family=Material+Icons" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,600,700&display=swap"
          rel="stylesheet">
</head>
<body>

<!-- The single root element UICore mounts into.
     MUST be position:absolute and fill the viewport; the layout engine
     derives all measurements from this element's bounds. -->
<div id="RootView" style="position: absolute; left: 0; top: 0; width: 100%; height: 100%;">

    <!-- Optional static loading splash, rendered immediately by the browser
         before any JavaScript executes. RunApplication.ts removes it once
         UICore is initialised. This prevents a blank screen flash on first load. -->
    <div id="LoadingView"
         style="position: absolute; left: 0; top: 0; width: 100%; height: 100%;
                background-color: rgba(0, 10, 25, 0.75); z-index: 150;">
        <!-- Replace with a spinner or branded logo -->
        <h3 id="LoadingLabel" style="color: white; text-align: center; margin-top: 45vh;">
            Loading.
        </h3>
    </div>

</div>

<!-- Your compiled TypeScript bundle.
     In production, add a cache-busting query param, e.g. ?q=<build-timestamp>. -->
<script type="text/javascript" src="compiledScripts/webclient.js"></script>
</body>
```

**Key points about the HTML:**

- `#RootView` must be `position: absolute` and fill the viewport — UICore's layout system measures its bounds from this element, and views are positioned with `transform: translate3d()` inside it.
- The static loading splash is optional but recommended for production. The browser renders it instantly from HTML — before JavaScript is even downloaded — so users see branded feedback rather than a white screen.
- If you're using a server-side template engine (e.g. EJS), you can inject a configuration object directly into the page to avoid an extra round-trip on startup:

```html
<script>
    // Server renders this; client reads it immediately on startup.
    window.AppConfig = JSON.parse(decodeURIComponent('<%- configJSON %>'))
</script>
```

### Entry Point — RunApplication.ts

`RunApplication.ts` is the single TypeScript file that bridges your HTML page, any server-provided data, and UICore. Keep it small — it should do nothing except bootstrap the framework.

```typescript
import { IS, UICore, UIRoute } from "uicore-ts"
import { RootViewController } from "./RootViewController"

// Removes the static HTML loading splash injected in index.html.
function removeLoadingView() {
    const loadingView = document.getElementById("LoadingView")
    const rootView    = document.getElementById("RootView")
    if (rootView && loadingView) {
        rootView.removeChild(loadingView)
    }
}

try {

    // Read any config data the server injected into the page at render time.
    // Provides e.g. auth tokens, feature flags, or the default language key
    // without requiring a separate HTTP request on startup.
    const config = (window as any).AppConfig ?? {}

    // Bootstrap UICore.
    //   "RootView"          — ID of the root <div> in index.html
    //   RootViewController  — your UIRootViewController subclass
    //   16                  — global paddingLength (accessible via view.core.paddingLength)
    UICore.main = new UICore("RootView", RootViewController, 16)

    // Remove the static loading splash now that UICore has mounted.
    removeLoadingView()

} catch (exception) {

    console.error(exception)
    // The static loading splash stays visible on error — users won't see a blank screen.
    // Optionally redirect: window.location.href = "/unsupported"

}
```

**Why `try/catch`?** If the bundle fails to initialise (unsupported browser, network error loading a dependency, etc.), the static loading splash remains visible instead of a blank page, and the error is cleanly logged.

**Why `UICore.main =` rather than `new UICore(...)`?** Assigning to `UICore.main` is the canonical pattern. It also lets you conditionally bootstrap different root controllers — for example, switching between the full application and a standalone dev-tool window based on the current route:

```typescript
// Route-based conditional bootstrap — used in development for e.g. a code editor panel
if (IS(UIRoute.currentRoute.componentWithName("dev_editor"))) {
    UICore.main = new UICore("RootView", EditorViewController)
} else {
    UICore.main = new UICore("RootView", RootViewController, 16)
}
```

---

## Core Classes

### UIObject

The base class for all framework objects. Provides:

- **`configureWithObject(object)`** / **`configuredWithObject(object)`** — deep property assignment with nested key-path support, lazy values (`LAZY_VALUE`), function extension (`EXTEND`), and function call objects (`CALL`). The "configured" variant returns `this` for chaining.
- **`valueForKeyPath(keyPath)`** / **`setValueForKeyPath(keyPath, value)`** — KVC-style access using dot-separated key paths. Supports `[]keyPath` syntax for mapping over arrays.
- **`isKindOfClass(classObject)`** / **`isMemberOfClass(classObject)`** — runtime type checks.
- **`performFunctionWithSelf(fn)`** / **`performingFunctionWithSelf(fn)`** — useful for inline side effects without breaking a chain.
- **`performFunctionWithDelay(delay, fn)`** — executes a function after a delay (via `UITimer`).
- **`methods`** — a bound-methods-only copy of the instance, useful for passing callbacks without losing `this`.

#### Key utility functions (exported from `UIObject`)

| Function | Description |
|---|---|
| `IS(x)` | Truthy guard that also checks against `nil` |
| `IS_NOT(x)` | Inverse of `IS` |
| `IS_DEFINED(x)` | Checks `x !== undefined` |
| `FIRST_OR_NIL(...xs)` | Returns first truthy value, else `nil` |
| `FIRST(...xs)` | Returns first truthy value, else the last argument |
| `LAZY_VALUE(fn)` | Wraps an init function; initialised on first access |
| `EXTEND(fn)` | Returns a `UIFunctionExtender` — extends a target function to also call `fn` |
| `CALL(...args)` | Wraps arguments as a `UIFunctionCall` for use in `configureWithObject` |
| `IF(cond)(fn).ELSE_IF(cond)(fn).ELSE(fn)` | Inline conditional expression |
| `MAKE_ID(length?)` | Generates a unique alphanumeric + timestamp string |
| `nil` | A Proxy that silently swallows property accesses and method calls on null/undefined |
| `YES` / `NO` | Typed aliases for `true` / `false` |

---

### UIView

The building block of all UI. Every widget is a `UIView` subclass backed by an `HTMLElement`.

#### Construction

```typescript
const myView = new UIView("MyView")
// or with a specific HTML element type:
const myDiv = new UIView("MyDiv", null, "div")
```

The `elementID` maps to the element's `id` in the DOM and is used for debugging. Views auto-generate IDs when none are provided.

#### Subview Management

```typescript
parentView.addSubview(childView)
childView.removeFromSuperview()
parentView.addSubview(newView, existingView)  // inserts newView above existingView
```

Alternatively, use the fluent form during construction:

```typescript
readonly myLabel = new UITextView()
    .configuredWithObject({ text: "Hello" })
    .addedAsSubviewToView(this.view)
```

#### Frame & Layout

```typescript
view.frame = new UIRectangle(x, y, height, width)
view.bounds   // { x: 0, y: 0, height, width } — local coordinate space
```

Trigger a layout pass:

```typescript
view.setNeedsLayout()
view.setNeedsLayoutUpToRootView()  // also triggers parent chain
UIView.layoutViewsIfNeeded()       // flushes all pending layouts
```

Override `layoutSubviews()` in subclasses to position child views:

```typescript
override layoutSubviews() {
    super.layoutSubviews()
    const bounds = this.bounds.rectangleWithInset(20)
    this.titleLabel.frame = bounds.rectangleWithHeight(40)
    this.bodyView.frame   = this.titleLabel.frame.rectangleForNextRow(10)
}
```

#### Common Properties

| Property | Type | Description |
|---|---|---|
| `frame` | `UIRectangle` | Position and size in superview coordinates |
| `bounds` | `UIRectangle` | Position and size in local coordinates |
| `backgroundColor` | `UIColor` | Background fill |
| `alpha` | `number` | Opacity `0–1` |
| `hidden` | `boolean` | Visibility (view remains in layout) |
| `userInteractionEnabled` | `boolean` | Whether pointer events are received |
| `pausesPointerEvents` | `boolean` | Prevents events from passing to subviews |
| `style` | `CSSStyleDeclaration` | Direct access to the element's inline styles |
| `loading` | `boolean` | Shows/hides the registered `UILoadingView` overlay |

#### Intrinsic Content Size

```typescript
view.intrinsicContentHeight(constrainingWidth)
view.intrinsicContentWidth(constrainingHeight)
view.intrinsicContentSize()  // { width, height }
```

UICore uses a **virtual layout** system to measure intrinsic sizes without triggering real reflows. Views that contain pure HTML (not frame-managed) should set `usesVirtualLayoutingForIntrinsicSizing = false`.

#### Styling Helpers

```typescript
view.setBorder(radius, width, color, style)
view.setPadding(value)
view.setPaddings(left, right, bottom, top)
view.setMargin(value)
view.setMinSizes(height, width)
view.setMaxSizes(height, width)
view.addStyleClass("my-css-class")
view.removeStyleClass("my-css-class")
```

#### Static CSS Injection

```typescript
UIView.injectCSS(".my-class { color: red; }", "unique-id")
UIView.createStyleSelector(".my-class:hover", "color: blue;")
```

#### Animation

```typescript
UIView.animateViewOrViewsWithDurationDelayAndFunction(
    view,         // UIView | UIView[]
    0.3,          // duration in seconds
    0,            // delay in seconds
    undefined,    // timing function (default cubic-bezier)
    () => {
        view.frame = newFrame
    },
    () => {
        // completion
    }
)
```

#### Broadcast Events

Broadcast events propagate through the entire view subtree:

```typescript
view.broadcastEventInSubtree({ name: "MyEvent", parameters: { key: "value" } })

// In a UIView subclass:
override didReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
    super.didReceiveBroadcastEvent(event)
    if (event.name == UICore.broadcastEventName.RouteDidChange) { ... }
}
```

Built-in broadcast event names: `UICore.broadcastEventName.RouteDidChange`, `UICore.broadcastEventName.WindowDidResize`, `UIView.broadcastEventName.PageDidScroll`.

---

### UIViewController

Manages a `UIView` and coordinates layout, lifecycle, and routing.

#### Lifecycle Hooks

```typescript
async viewWillAppear()
async viewDidAppear()
async viewWillDisappear()
async viewDidDisappear()
```

#### Layout Hooks

These are called automatically by the framework's layout pass:

```typescript
updateViewConstraints()      // called before layout; set style constraints here
updateViewStyles()           // called before layout; update style-dependent values
layoutViewSubviews()         // place subview frames here (mirrors UIView.layoutSubviews)
viewDidLayoutSubviews()      // post-layout hook
```

#### Routing

```typescript
static readonly routeComponentName = "myscreen"
static readonly ParameterIdentifierName = { id: "id" }

override async handleRoute(route: UIRoute) {
    super.handleRoute(route)
    const component = route.componentWithName(MyViewController.routeComponentName)
    const id = component?.parameters[MyViewController.ParameterIdentifierName.id]
}
```

#### Child View Controllers

```typescript
// Add a child VC into a container view:
this.addChildViewControllerInContainer(childVC, this.containerView)

// Add a child VC into a dialog:
this.addChildViewControllerInDialogView(childVC, this.dialogView)

// Remove:
this.removeChildViewController(childVC)
```

#### `core` shortcut

```typescript
const padding = this.core.paddingLength  // same as this.view.core.paddingLength
```

---

### UIRootViewController

Extends `UIViewController` and acts as the application shell. It manages:

- **`backgroundView`** — fills the content area.
- **`topBarView`** / **`bottomBarView`** — optional persistent bars.
- **`contentViewController`** — the active primary screen.
- **`detailsViewController`** — an optional slide-over detail panel shown in a `UIDialogView`.

#### Defining Content Views

```typescript
contentViewControllers = {
    mainViewController: this.lazyViewControllerObjectWithClass(HomeViewController),
    settingsViewController: this.lazyViewControllerObjectWithClass(SettingsViewController, {
        shouldShow: () => UIRoute.currentRoute.componentWithViewController(SettingsViewController) != null,
        deleteOnUnload: true  // destroys the VC when navigated away from
    })
}
```

The root controller selects the active content VC based on which route component matches.

**Real-world example — a full application shell:**

```typescript
export class RootViewController extends UIRootViewController {

    // Persistent top and bottom bars — declared as class fields,
    // initialised immediately, added as subviews in one chain.
    override readonly topBarView = new TopBarView("TopBarView")
        .configuredWithObject({ titleLabel: { setText: CALL("topBarTitle", "My App") } })
        .addedAsSubviewToView(this.view)

    override readonly bottomBarView = new BottomBarView("BottomBarView")
        .configuredWithObject({ style: { overflow: "hidden" } })
        .addedAsSubviewToView(this.view)

    // All screen-level view controllers registered here.
    // lazyViewControllerObjectWithClass() creates each one on first navigation
    // and optionally destroys it on unload to free memory.
    override contentViewControllers = {
        mainViewController:    this.lazyViewControllerObjectWithClass(MainViewController),
        loginViewController:   this.lazyViewControllerObjectWithClass(LoginViewController),
        settingsViewController: this.lazyViewControllerObjectWithClass(SettingsViewController),

        // deleteOnUnload: YES — useful for large multi-step forms whose state
        // should not persist when the user navigates away.
        newProcurementViewController: this.lazyViewControllerObjectWithClass(
            NewProcurementViewController,
            { deleteOnUnload: YES }
        ),

        // shouldShow: an async guard — the VC is only shown if the user has
        // the appropriate permissions, checked at route time.
        adminViewController: this.lazyViewControllerObjectWithClass(
            AdminViewController,
            { shouldShow: async () => IS(await api.isAdmin()) }
        ),
    }

    constructor(view: UIView) {
        super(view)

        // Set global text defaults
        UITextView.defaultTextColor = AppColor.textPrimary

        // Keyboard shortcut: Escape dismisses the topmost dialog
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                DialogShower.currentDialog?.dismiss()
            }
        })
    }

    override layoutViewSubviews() {
        super.layoutViewSubviews()

        // Clamp page scale: below 700 px wide, scale down to 0.7.
        this.updatePageScale({ minScaleWidth: 700, maxScaleWidth: 1500,
                               minScale: 0.7,      maxScale: 1 })

        this.performDefaultLayout({
            paddingLength:       this.core.paddingLength,
            contentViewMaxWidth: 1200,
            topBarHeight:        this.topBarView.intrinsicContentHeight(UIView.pageWidth) || 65,
            bottomBarMinHeight:  80,
        })
    }

    // React to auth changes broadcast from any child view.
    override viewDidReceiveBroadcastEvent(event: UIViewBroadcastEvent) {
        super.viewDidReceiveBroadcastEvent(event)
        if (event.name === "UserDidLogIn" || event.name === "UserDidLogOut") {
            this.handleRoute(UIRoute.currentRoute)
        }
    }

}
```

#### Default Layout

```typescript
override layoutViewSubviews() {
    this.performDefaultLayout({
        paddingLength:      20,
        contentViewMaxWidth: 1000,
        topBarHeight:       65,
        bottomBarMinHeight: 100
    })
}
```

`performDefaultLayout` handles top bar, bottom bar, content width centering, and details panel positioning automatically.

#### Page Scale

```typescript
this.updatePageScale({ minScaleWidth: 700, maxScaleWidth: 1500, minScale: 0.7, maxScale: 1 })
```

---

### UICore

The application bootstrap singleton.

```typescript
const app = new UICore("RootView", AppRootViewController, 20)

UICore.main          // the singleton
UICore.languageService  // optional i18n service
```

`UICore` registers `hashchange` and `resize` window listeners, dispatches route and resize broadcast events, and triggers the initial layout pass.

---

## Layout System

### UIRectangle

`UIRectangle` is the central data structure for all layout work. It is defined by `(x, y, height, width)`, with the origin at the top-left.

```typescript
const rect = new UIRectangle(x, y, height, width)
```

`UIRectangle` uses **copy-on-write** internally, so deriving new rectangles from existing ones is zero-copy until mutation actually occurs. This makes chained layout calculations fast.

### UIPoint

```typescript
const point = new UIPoint(x, y)
point.pointByAddingX(10)
point.pointByAddingY(-5)
point.add(other)
point.subtract(other)
point.scale(factor)
point.length  // magnitude
```

### Frame-Based Layout

All layout happens in `layoutSubviews()` (for `UIView` subclasses) or `layoutViewSubviews()` (for `UIViewController` subclasses). A typical pattern:

```typescript
override layoutViewSubviews() {
    super.layoutViewSubviews()

    const padding     = this.core.paddingLength
    const bounds      = this.view.bounds.rectangleWithInset(padding)
    const labelHeight = padding * 2

    this.titleLabel.frame = bounds.rectangleWithHeight(labelHeight)

    this.bodyView.frame = this.titleLabel.frame.rectangleForNextRow(
        padding,
        this.bodyView.intrinsicContentHeight(bounds.width)
    )

    const [leftBtn, rightBtn] = bounds.rectanglesBySplittingWidth([1, 1], padding)
    this.leftButton.frame  = leftBtn
    this.rightButton.frame = rightBtn
}
```

### Layout Methods Reference

All methods return a **new** `UIRectangle` (copy-on-write). They do not mutate the receiver.

#### Sizing

| Method | Description |
|---|---|
| `rectangleWithHeight(h)` | Same rectangle with a new height |
| `rectangleWithWidth(w)` | Same rectangle with a new width |
| `rectangleWithInset(n)` | Shrink all sides by `n` |
| `rectangleWithInsets(left, right, bottom, top)` | Shrink each side individually |
| `rectangleWithMaxWidth(max)` | Clamps width to `max` |
| `rectangleWithMaxHeight(max)` | Clamps height to `max` |
| `rectangleWithMinWidth(min)` | Ensures width is at least `min` |
| `rectangleWithMinHeight(min)` | Ensures height is at least `min` |
| `rectangleWithHeightRelativeToWidth(ratio)` | Sets `height = width * ratio` |
| `rectangleWithWidthRelativeToHeight(ratio)` | Sets `width = height * ratio` |
| `rectangleWithRelativeValues(xPos, wMul, yPos, hMul)` | Relative positioning and sizing |
| `settingMinHeight(h)` / `settingMaxHeight(h)` | Attach min/max constraints to the rectangle |
| `settingMinWidth(w)` / `settingMaxWidth(w)` | Attach min/max constraints to the rectangle |
| `rectangleByEnforcingMinAndMaxSizes()` | Apply attached constraints |

#### Positioning

| Method | Description |
|---|---|
| `rectangleWithX(x)` | Move origin to x |
| `rectangleWithY(y)` | Move origin to y |
| `rectangleByAddingX(dx)` | Offset x by `dx` |
| `rectangleByAddingY(dy)` | Offset y by `dy` |
| `rectangleByAddingWidth(dw)` | Grow width by `dw` |
| `rectangleByAddingHeight(dh)` | Grow height by `dh` |
| `rectangleByCenteringInRectangle(ref, xPos, yPos)` | Center within `ref` |

#### Sequential Layout

| Method | Description |
|---|---|
| `rectangleForNextRow(padding, height?)` | Rectangle directly below this one |
| `rectangleForNextColumn(padding, width?)` | Rectangle directly to the right |
| `rectangleForPreviousRow(padding, height?)` | Rectangle directly above |
| `rectangleForPreviousColumn(padding, width?)` | Rectangle directly to the left |

#### Splitting & Distribution

| Method | Description |
|---|---|
| `rectanglesBySplittingWidth(weights, paddings?, absoluteWidths?)` | Split horizontally by weight |
| `rectanglesBySplittingHeight(weights, paddings?, absoluteHeights?)` | Split vertically by weight |
| `rectanglesByEquallySplittingWidth(n, padding?)` | `n` equal columns with padding |
| `rectanglesByEquallySplittingHeight(n, padding?)` | `n` equal rows with padding |
| `distributeViewsAlongWidth(views, weights?, paddings?, absoluteWidths?)` | Assign frames to views horizontally |
| `distributeViewsAlongHeight(views, weights?, paddings?, absoluteHeights?)` | Assign frames to views vertically |
| `distributeViewsEquallyAlongWidth(views, padding)` | Equal-width columns |
| `distributeViewsEquallyAlongHeight(views, padding)` | Equal-height rows |
| `framesByDistributingViewsAsColumn(views, paddings?, absoluteHeights?)` | Stack views vertically, using intrinsic height |
| `framesByDistributingViewsAsRow(views, paddings?, absoluteWidths?)` | Place views horizontally, using intrinsic width |
| `framesByDistributingViewsAsGrid(views[][], paddings?, absoluteHeights?)` | 2D grid of views |

The `weights` and `paddings` parameters accept numbers, functions `(orthogonalSize) => number`, or a `UIView` whose intrinsic size is used.

#### Geometry

| Method / Property | Description |
|---|---|
| `center` | `UIPoint` at the centre |
| `min` / `max` | Top-left and bottom-right `UIPoint`s |
| `topLeft` / `topRight` / `bottomLeft` / `bottomRight` | Corner points |
| `area` | `height * width` |
| `containsPoint(point)` | Hit test |
| `intersectsWithRectangle(rect)` | Overlap test |
| `intersectionRectangleWithRectangle(rect)` | Intersection rectangle |
| `updateByAddingPoint(point)` | Expand bounding box to include a point |
| `lazyCopy()` | Zero-cost copy (shares data until mutation) |
| `copy()` | Full independent copy |
| `static zero()` | `new UIRectangle(0, 0, 0, 0)` |
| `static boundingBoxForPoints(points)` | Bounding box of a set of points |

#### Conditional Chains

`UIRectangle` supports inline conditional layout without breaking method chains:

```typescript
const frame = bounds
    .rectangleWithHeight(40)
    .IF(isWide)
        .rectangleWithWidth(300)
    .ELSE()
        .rectangleWithWidth(150)
    .ENDIF()
```

`.TRANSFORM(fn)` allows arbitrary transformations within a chain.

---

## Routing

### UIRoute

Routes are encoded in the URL hash using the format `#component_name[key:value,key:value]component_name2[key:value]`.

Each bracket-delimited segment is a **route component** — a view controller reference (determined by the static `routeComponentName` property on the given UIViewController subclass) plus a parameter dictionary. UICore listens for `hashchange` events and calls `handleRoute` on the active controller hierarchy automatically.

```typescript
// Read the current route
const route = UIRoute.currentRoute

// Look up a component by name or by view controller class:
const component = route.componentWithName("settings")
const id = component?.parameters["id"]

// Equivalent using the class:
const component2 = route.componentWithViewController(SettingsViewController)
```

#### Navigating

```typescript
// Push a new route (adds a browser history entry):
UIRoute.currentRoute
    .routeWithViewControllerComponent(SettingsViewController, { tab: "profile" })
    .apply()

// Replace the current history entry (no back button entry):
UIRoute.currentRoute
    .routeWithViewControllerComponent(SettingsViewController, { tab: "profile" })
    .applyByReplacingCurrentRouteInHistory()

// Add or update a single parameter without changing other components:
UIRoute.currentRoute
    .routeBySettingParameterInComponent("settings", "tab", "security")
    .apply()

// Remove a parameter:
UIRoute.currentRoute
    .routeByRemovingParameterInComponent("settings", "tab")
    .apply()
```

#### Reacting to navigation

Declare a static `routeComponentName` and override `handleRoute` in your view controller:

```typescript
export class SettingsViewController extends UIViewController {

    // The URL token for this screen — e.g. #settings[tab:profile]
    static override readonly routeComponentName = "settings"

    // Type-safe registry of parameter keys used by this screen:
    static override readonly ParameterIdentifierName = {
        tab: "tab"
    } as const

    override async handleRoute(route: UIRoute) {
        await super.handleRoute(route)

        const component = route.componentWithName(SettingsViewController.routeComponentName)
        const tab = component?.parameters[SettingsViewController.ParameterIdentifierName.tab]

        this.showTab(tab ?? "general")
    }

}
```

#### Real-world pattern — syncing controls to the route

Write route parameters in a control's event handler; read them back in `handleRoute`. The URL then always reflects the current UI state, making pages shareable and bookmarkable:

```typescript
// Write to the route when a dropdown changes:
this.periodDropdown.controlEventTargetAccumulator.SelectionDidChange = () => {
    UIRoute.currentRoute
        .routeBySettingParameterInComponent(
            MyViewController.routeComponentName,
            MyViewController.ParameterIdentifierName.period,
            this.periodDropdown.selectedItemCode ?? nil
        )
        .applyByReplacingCurrentRouteInHistory()
}

// Read back from the route and update UI:
override async handleRoute(route: UIRoute) {
    await super.handleRoute(route)
    const component = route.componentWithName(MyViewController.routeComponentName)
    const period = component?.parameters[MyViewController.ParameterIdentifierName.period]
    this.periodDropdown.selectedItemCode = period ?? "all"
    await this.loadData()
}
```

#### Route Manipulation Reference

```typescript
route.routeWithViewControllerComponent(ViewControllerClass, parameters)
route.routeByRemovingComponentNamed(name)
route.routeByRemovingComponentsOtherThanOnesNamed(names)
route.routeBySettingParameterInComponent(componentName, key, value)
route.routeByRemovingParameterInComponent(componentName, key)
route.componentWithViewController(ViewControllerClass)
route.componentWithName(name)
```

#### `UILink`

`UILink` is an `<a>`-backed view that keeps its `href` in sync with the route automatically. Subclass and override `_targetRouteForCurrentState()` to compute the target route dynamically.

---

## UI Components

### UITextView

A label/rich-text view. Backed by a `<p>`, `<h1>`–`<h6>`, `<span>`, `<textarea>`, or `<input>` depending on the `type` argument.

```typescript
const label = new UITextView(elementID, UITextView.type.header2)
label.text         = "Hello"
label.textColor    = UIColor.blackColor
label.textAlignment = "center"
label.isSingleLine = false  // wraps (default is true)
```

**Types:** `paragraph`, `header1`–`header6`, `textField`, `textArea`, `label`, `span`.

`intrinsicContentHeight(constrainingWidth)` measures the text's rendered height using the Canvas API for plain text (fast) and DOM measurement for HTML content, with result caching.

---

### UITextField & UITextArea

`UITextField` extends `UITextView` with editing support.

```typescript
const field = new UITextField()
field.placeholderText = "Enter value…"
field.text            // current value

// Native HTML datalist autocomplete:
field.nativeAutocompleteData = ["Option A", "Option B"]
field.validatesAgainstNativeAutocomplete = true

// Listen for changes:
field.controlEventTargetAccumulator.TextChange = (sender) => {
    console.log(sender.text)
}
```

`UITextArea` is a multi-line variant that auto-sizes vertically.

---

### UIButton & UIBaseButton

```typescript
const button = new UIButton()
button.titleLabel.text = "Click me"

// Colors:
button.colors = {
    titleLabel: {
        normal:      UIColor.whiteColor,
        highlighted: UIColor.whiteColor,
        selected:    UIColor.whiteColor
    },
    background: {
        normal:      UIColor.blueColor,
        highlighted: UIColor.greenColor,
        selected:    UIColor.redColor
    }
}

button.selected = true
button.enabled  = false

// Event:
button.controlEventTargetAccumulator.PointerUpInside = (sender, event) => {
    // handle tap
}
```

`UIBaseButton` is the abstract base that handles pointer state tracking and style switching. Subclass it to build custom button types.

---

### UILink & UILinkButton

`UILink` renders an `<a>` element and keeps its `href` in sync with the route. `UILinkButton` wraps a full `UIButton` inside a `UILink`, giving you button visuals with proper anchor semantics (right-click → open in new tab, etc.).

---

### UITableView

A virtualised scrolling list. Only renders rows that are currently visible.

```typescript
const table = new UITableView()

table.numberOfRows          = () => myData.length
table.heightForRowWithIndex = (index) => 44
table.allRowsHaveEqualHeight = true   // performance optimisation

table.newReusableViewForIdentifier = (identifier, index) => new MyRowView(identifier + index)
table.viewForRowWithIndex          = (index) => {
    const row = table.reusableViewForIdentifier("Row", index) as MyRowView
    row.configure(myData[index])
    return row
}

table.reloadData()
table.invalidateSizeOfRowWithIndex(index, YES)  // animateChange = YES
```

`UITableView.intrinsicContentHeight()` returns the total height of all rows, enabling use inside scroll-free containers.

---

### UIScrollView & UINativeScrollView

`UIScrollView` is the framework's custom scroll container; `UINativeScrollView` delegates to the browser's native overflow scrolling.

```typescript
scrollView.contentOffset = new UIPoint(0, 300)
scrollView.animationDuration = 0.3

// Override in a subclass to react to scroll position changes:
override didScrollToPosition(offsetPosition: UIPoint) {
    super.didScrollToPosition(offsetPosition)
    // ...
}
```

---

### UISlideScrollerView

A paged horizontal scroller with optional auto-advance and page indicator dots.

```typescript
const scroller = new UISlideScrollerView()
scroller.slideViews   = [view1, view2, view3]
scroller.wrapAround   = true
scroller.startAnimating()
```

---

### UIImageView

```typescript
const img = new UIImageView()
img.imageSource = "https://example.com/photo.jpg"
img.fillMode    = UIImageView.fillMode.aspectFill
```

---

### UIDialogView

A modal overlay. Can contain any `UIView` or a `UIViewController`'s view.

```typescript
const dialog = new UIDialogView()
dialog.view    = contentView
dialog.showInView(rootView, true /* animated */)
dialog.dismiss()
```

When dismissed, the dismiss callback runs. `UIRootViewController.addChildViewControllerInDialogView` wires dismissal to also remove the child VC automatically.

---

### UIActionIndicator

A circular spinner for short in-place loading states.

```typescript
const indicator = new UIActionIndicator()
indicator.size = 40
indicator.start()
indicator.stop()
```

---

### UILoadingView

A full-overlay loading screen. Register the class once at startup:

```typescript
UIView.LoadingViewClass = UILoadingView
```

Then toggle on any view:

```typescript
myView.loading = true   // shows overlay
myView.loading = false  // removes overlay
```

Supports `theme: "light" | "dark"`.

---

### UIDateTimeInput

A date/time picker backed by a native `<input>`. Supports types `Date` (`"date"`), `Time` (`"time"`), and `DateTime` (`"datetime"`).

```typescript
const picker = new UIDateTimeInput("MyPicker", UIDateTimeInput.type.Date)
picker.controlEventTargetAccumulator.ValueChange = (sender) => {
    console.log(picker.date)
}
```

---

### UIAutocompleteTextField

A text field with a custom dropdown powered by `UITableView` virtual scrolling. Supports keyboard navigation (↑/↓/Enter/Escape).

```typescript
const field = new UIAutocompleteTextField<MyItem>()
field.autocompleteData = items.map(item => ({ value: item, label: item.name }))
field.controlEventTargetAccumulator.SelectionDidChange = (sender) => {
    console.log(field.selectedItem)
}
```

Subclass `UIAutocompleteDropdownView` to provide custom row views.

---

## Event System

Events are registered on a `UIView` using control event keys:

```typescript
view.addTargetForControlEvent(UIView.controlEvent.PointerUpInside, (sender, event) => { ... })
view.removeTargetForControlEvent(UIView.controlEvent.PointerUpInside, handler)
view.sendControlEventForKey(UIView.controlEvent.PointerUpInside, nativeEvent)
```

The `controlEventTargetAccumulator` proxy allows concise, chainable assignment:

```typescript
view.controlEventTargetAccumulator.PointerUpInside = handler
// Multiple events on one line:
view.controlEventTargetAccumulator.PointerUpInside.EnterDown = handler
```

#### Built-in Control Events

| Event Key | Trigger |
|---|---|
| `PointerDown` | Mouse/touch press begins |
| `PointerUp` | Mouse/touch released (anywhere) |
| `PointerUpInside` | Released inside the view |
| `PointerMove` | Pointer moved while down |
| `PointerHover` | Pointer moved over view (not pressed) |
| `PointerEnter` | Pointer entered the view bounds |
| `PointerLeave` | Pointer left the view bounds |
| `PointerDrag` | Pointer dragged (threshold exceeded) |
| `EnterDown` | Enter key pressed |
| `EnterUp` | Enter key released |
| `Blur` | View lost focus |
| `Focus` | View gained focus |
| `TextChange` | Text input changed (`UITextField`) |
| `ValidationChange` | Validation state changed (`UITextField`) |

---

## Color System

### UIColor

```typescript
UIColor.redColor
UIColor.blueColor
UIColor.greenColor
UIColor.blackColor
UIColor.whiteColor
UIColor.grayColor
UIColor.transparentColor

UIColor.colorWithRGBA(255, 0, 0, 1)
new UIColor("#FF0000")
new UIColor("rgba(255, 0, 0, 1)")

color.colorWithAlpha(0.5)
color.colorWithRed(128)
color.colorByMultiplyingRGB(0.8)   // darken
color.stringValue                  // CSS string representation
color.colorDescriptor              // { red, green, blue, alpha }
```

### Extending UIColor — BSColor pattern

The recommended approach for a design system is to subclass `UIColor` and define all semantic colour tokens as `static get` properties. This centralises every colour in the app, makes global redesigns trivial, and gives you type-safe autocomplete:

```typescript
import { UIColor } from "uicore-ts"

export class AppColor extends UIColor {

    // Brand colours
    static get primary()     { return new AppColor("#0d6efd") }
    static get primaryHover(){ return new AppColor("#0b5ed7") }
    static get success()     { return new AppColor("#198754") }
    static get danger()      { return new AppColor("#dc3545") }
    static get warning()     { return new AppColor("#ffc107") }

    // Semantic surfaces
    static get background()  { return new AppColor("#f8f9fa") }
    static get borderLight() { return new AppColor("#dee2e6") }

    // Text
    static get textPrimary() { return new AppColor("#212529") }
    static get textMuted()   { return new AppColor("#6c757d") }
    static get textWhite()   { return new AppColor("#ffffff") }

    // States — alpha variants derived from primitives:
    static get primaryFocusRing() {
        return AppColor.primary.colorWithAlpha(0.25)
    }

    static get primaryHoverBackground() {
        return AppColor.primary.colorWithAlpha(0.1)
    }

}
```

Usage throughout the app:

```typescript
this.titleLabel.textColor    = AppColor.textPrimary
this.view.backgroundColor    = AppColor.background
this.borderView.style.border = `1px solid ${AppColor.borderLight.stringValue}`
```

Using `static get` (rather than `static readonly`) means each call returns a fresh `UIColor` instance, so mutations on one don't affect the global token. It also prevents initialisation-order issues since the values are computed on first access.

---

## Subclassing Components

UICore's component layer is built on ordinary TypeScript class inheritance. Subclassing is the intended extension point for custom buttons, styled inputs, composite views, and anything reusable across screens.

### Custom UIButton subclass

A real-world Bootstrap-style button with multiple visual variants, per-state colour configs, and ripple animations:

```typescript
import { UIButton, UIColor, UIComponentView } from "uicore-ts"
import { AppColor } from "./AppColor"

export type ButtonVariant =
    | "primary" | "secondary" | "success" | "danger"
    | "warning" | "light"     | "dark"    | "link"

@UIComponentView  // makes this component available for visual editing in CBEditor
export class AppButton extends UIButton {

    _variant: ButtonVariant = "primary"

    constructor(elementID?: string) {
        super(elementID, "button")

        this.configureWithObject({
            style: {
                fontWeight:    "400",
                lineHeight:    "1.5",
                textAlign:     "center",
                cursor:        "pointer",
                border:        "1px solid transparent",
                padding:       "0.375rem 0.75rem",
                borderRadius:  "6px",
                overflow:      "hidden",
            }
        })

        this.setVariant("primary")
    }

    get variant() { return this._variant }
    set variant(value: ButtonVariant) { this.setVariant(value) }

    setVariant(variant: ButtonVariant) {
        this._variant = variant

        // configureWithObject({ colors }) is the idiomatic way to batch-update
        // all state colours without replacing the entire button instance.
        this.configureWithObject({ colors: this._colorConfigFor(variant) })
        this.updateContentForCurrentState()
    }

    private _colorConfigFor(variant: ButtonVariant) {
        const textColor = ["warning", "light"].includes(variant)
            ? AppColor.textPrimary
            : AppColor.textWhite

        const bgMap: Record<ButtonVariant, UIColor> = {
            primary:   AppColor.primary,
            secondary: AppColor.secondary,
            success:   AppColor.success,
            danger:    AppColor.danger,
            warning:   AppColor.warning,
            light:     AppColor.background,
            dark:      AppColor.textPrimary,
            link:      UIColor.transparentColor,
        }

        const bg = bgMap[variant]

        return {
            titleLabel: {
                normal:      textColor,
                hovered:     textColor,
                highlighted: textColor,
            },
            background: {
                normal:      bg,
                hovered:     bg.colorByMultiplyingRGB(0.9),
                highlighted: bg.colorByMultiplyingRGB(0.8),
            }
        }
    }

    // Override state methods to add extra styling (border, shadow, etc.)
    override updateContentForNormalState() {
        super.updateContentForNormalState()
        this.style.border = "none"
    }

    override updateContentForHoveredState() {
        super.updateContentForHoveredState()
        this.style.border = "none"
    }

}
```

Usage:

```typescript
readonly saveButton = new AppButton()
    .configuredWithObject({ variant: "primary", titleLabel: { text: "Save" } })
    .addedAsSubviewToView(this.view)

// noinspection JSConstantReassignment
this.saveButton.controlEventTargetAccumulator.PointerUpInside = () => {
    this.save()
}
```

> **Note:** The `// noinspection JSConstantReassignment` comment suppresses an IDE warning that fires because `controlEventTargetAccumulator` properties look like assignments to a constant. This is a framework idiom — the accumulator uses a `Proxy` setter internally.

### Animated collapsible view

A reusable accordion that slides its content in and out. Shows how to combine the animation API, `intrinsicContentHeight`, `setNeedsLayoutUpToRootView`, and the `UIView.animateViewOrViewsWithDurationDelayAndFunction` API:

```typescript
import { NO, UITextView, UIView, YES } from "uicore-ts"
import { AppButton } from "./AppButton"
import { AppColor }  from "./AppColor"

export class AccordionView extends UIView {

    static readonly animationDuration = 0.28  // seconds

    readonly headerButton = new AppButton()
        .configuredWithObject({ variant: "light", style: { textAlign: "left", borderRadius: "0" } })
        .addedAsSubviewToView(this)

    readonly chevronLabel = new UITextView()
        .configuredWithObject({ isSingleLine: YES, backgroundColor: UIColor.transparentColor })
        .addedAsSubviewToView(this)

    // Overflow hidden clips the sliding content
    readonly contentContainer = new UIView()
        .configuredWithObject({ style: { overflow: "hidden" } })
        .addedAsSubviewToView(this)

    _expanded  = NO
    _contentView?: UIView
    _contentHeight = 0
    animated = NO

    constructor(elementID?: string) {
        super(elementID)
        this.configureWithObject({
            style: { border: `1px solid ${AppColor.borderLight.stringValue}`,
                     borderRadius: "8px", overflow: "hidden" }
        })
        this._updateChevron()

        // noinspection JSConstantReassignment
        this.headerButton.controlEventTargetAccumulator.PointerUpInside = () => {
            this.expanded = !this._expanded
        }
    }

    get title()  { return this.headerButton.titleLabel.text }
    set title(v) { this.headerButton.titleLabel.text = v    }

    get expanded() { return this._expanded }
    set expanded(v: boolean) {
        if (this._expanded === v) { return }
        this._expanded = v
        this._updateChevron()
        this._performTransition()
        this.setNeedsLayoutUpToRootView()  // tell parents our height changed
    }

    get contentView() { return this._contentView }
    set contentView(view: UIView | undefined) {
        this._contentView?.removeFromSuperview()
        this._contentView = view
        if (view) { view.addedAsSubviewToView(this.contentContainer) }
        this.setNeedsLayout()
    }

    _updateChevron() {
        this.chevronLabel.text = this._expanded ? "▲" : "▼"
    }

    _performTransition() {
        if (!this._contentView) { return }
        const toTranslate = this._expanded ? "translateY(0%)"    : "translateY(-100%)"
        const toHeight    = this._expanded ? `${this._contentHeight}px` : "0px"

        // Set the "from" state instantly so the framework has a start point
        if (this._expanded) {
            this._contentView.style.transform     = "translateY(-100%)"
            this.contentContainer.style.height    = "0px"
        } else {
            this._contentView.style.transform     = "translateY(0%)"
            this.contentContainer.style.height    = `${this._contentHeight}px`
        }

        if (!this.animated) {
            this._contentView.style.transform  = toTranslate
            this.contentContainer.style.height = toHeight
            return
        }

        UIView.animateViewOrViewsWithDurationDelayAndFunction(
            [this._contentView, this.contentContainer],
            AccordionView.animationDuration, 0, "ease",
            () => {
                this._contentView!.style.transform  = toTranslate
                this.contentContainer.style.height  = toHeight
            },
            () => { /* animation complete */ }
        )
    }

    override layoutSubviews() {
        super.layoutSubviews()

        const padding     = this.core.paddingLength
        const bounds      = this.contentBoundsWithInset(0)
        const headerHeight = padding * 3

        this.headerButton.frame = bounds.rectangleWithHeight(headerHeight)
        this.chevronLabel.frame = bounds
            .rectangleWithHeight(headerHeight)
            .rectangleWithWidth(padding * 2, 1)

        if (!this._contentView) {
            this.contentContainer.frame = this.headerButton.frame.rectangleWithHeight(0)
            return
        }

        // Always measure so _contentHeight stays current even when collapsed
        this._contentHeight = this._contentView.intrinsicContentHeight(bounds.width)
        this._contentView.frame = this.contentContainer.contentBounds
            .rectangleWithHeight(this._contentHeight)

        // During layout, set state directly — no transition
        this._contentView.style.transform  = this._expanded ? "translateY(0%)" : "translateY(-100%)"
        this.contentContainer.style.height = this._expanded ? `${this._contentHeight}px` : "0px"
        this.contentContainer.frame = this.headerButton.frame
            .rectangleForNextRow(0, this._expanded ? this._contentHeight : 0)
    }

}
```

Key patterns to note:

- **`setNeedsLayoutUpToRootView()`** — called when `expanded` changes, because the accordion's intrinsic height changes and parent layout must reflow.
- **Setting the "from" state instantly before animating** — UICore's animation system needs a real before/after delta; setting the starting CSS properties without a transition gives the browser a defined starting point.
- **`contentBoundsWithInset(0)`** — gives the bounds of the view relative to its own origin, accounting for any padding or border.

---

## Utilities

### UITimer

A wrapper around `setInterval` with explicit lifecycle management.

```typescript
const timer = new UITimer(1.0 /* seconds */, true /* repeats */, () => {
    console.log("tick")
})
timer.invalidate()
timer.reschedule()
timer.fire()         // fire immediately
```

---

### UIStringFilter & UIKeyValueStringFilter

Off-thread, Web Worker–based substring filtering of large string datasets.

```typescript
const filter = new UIStringFilter()

// Callback style:
filter.filterData(query, data, excluded, identifier, (filtered, filteredIndexes, id) => { ... })

// Promise style:
const { filteredData, filteredIndexes } = await filter.filteredData(query, data)

filter.closeThread()  // release the worker
```

`UIKeyValueStringFilter` filters arrays of objects by a key path value.

---

### UIKeyValueSorter

Sorts arrays of objects by a key path value.

---

### UICoreExtensions

UICore extends native JavaScript prototypes with UIKit-inspired helpers:

**Array**

| Method / Property | Description |
|---|---|
| `firstElement` / `lastElement` | First and last elements |
| `contains(element)` | Includes check |
| `anyMatch(fn)` / `allMatch(fn)` / `noneMatch(fn)` | Predicate checks |
| `removeElement(element)` | Remove by value |
| `removeElementAtIndex(index)` | Remove by index |
| `insertElementAtIndex(index, element)` | Insert at position |
| `replaceElementAtIndex(index, element)` | Replace at position |
| `groupedBy(keyFn)` | Group into dictionary |
| `uniqueMap(keyFn)` | Map with deduplication |
| `copy()` | Shallow copy |
| `arrayByRepeating(n)` | Repeat array `n` times |
| `arrayByTrimmingToLengthIfLonger(max)` | Truncate |
| `summedValue` | Sum of numeric array |
| `max()` / `min()` / `average()` | Numeric aggregates |
| `isEqualToArray(other, keyPath?)` | Deep equality |
| `findAsyncSequential(fn)` | Async sequential find |
| `everyElement` | Proxy that applies a property/method to all elements |

**Number**

| Property / Method | Description |
|---|---|
| `integerValue` | `Math.round(this)` |
| `isANumber` | `!isNaN(this)` |
| `constrainedValue(min, max)` | Clamp |

**String**

| Property | Description |
|---|---|
| `numericalValue` | `parseFloat(this)` |
| `integerValue` | `parseInt(this)` |
| `isAString` | Always `true` |
| `contains(str)` | Substring check |

**Object**

| Method / Property | Description |
|---|---|
| `forEach(fn)` | Iterate key-value pairs |
| `allValues` | Array of values |
| `allKeys` | Array of keys |
| `objectByCopyingValuesRecursivelyFromObject(src)` | Deep merge |

---

## Global Utility Functions

The `css` template tag enables IDE highlighting for injected CSS strings:

```typescript
import { css } from "uicore-ts"

UIView.injectCSS(css`
    .my-button {
        border-radius: 8px;
        font-weight: bold;
    }
`, "my-button-styles")
```

The `@UIComponentView` decorator marks a class as a reusable component, making it available for visual editing in CBEditor (when that layer is included in the application):

```typescript
@UIComponentView
export class MyCard extends UIView { ... }
```

---

## Templates

The following templates should be used as starting points when creating new views or view controllers.

### SomeContentView Template

Use this when you need a standalone `UIView` subclass without a view controller (e.g. a reusable component).

```typescript
import { UIView } from "uicore-ts"


export class SomeContentView extends UIView {


    constructor(elementID?: string) {

        super(elementID)

        // Code for further setup if necessary

    }


    override layoutSubviews() {

        super.layoutSubviews()

        const padding = this.core.paddingLength
        const labelHeight = padding

        const bounds = this.bounds.rectangleWithInset(padding)

    }


}
```

### SomeContentViewController Template

Use this when building a screen managed by a view controller. Copy, rename, and fill in the `routeComponentName` and any subviews.

```typescript
import { UIColor, UIRoute, UITextView, UIView, UIViewController } from "uicore-ts"


export class SomeContentViewController extends UIViewController {

    readonly titleLabel: UITextView = new UITextView(
        this.view.elementID + "TitleLabel",
        UITextView.type.header2
    ).configuredWithObject({
        text: "Screen Title",
        hoverText: "",
        backgroundColor: UIColor.transparentColor
    }).addedAsSubviewToView(this.view)


    constructor(view: UIView) {

        super(view)

        // Code for further setup if necessary

        this.view.configureWithObject({
            backgroundColor: UIColor.whiteColor,
            hoverText: ""
        })

    }


    static override readonly routeComponentName = "somecontent"

    static override readonly ParameterIdentifierName = {}

    override async viewDidAppear() {

    }


    override async viewWillDisappear() {

    }


    override async handleRoute(route: UIRoute) {

        super.handleRoute(route)
        const inquiryComponent = route.componentWithName(SomeContentViewController.routeComponentName)

    }


    override updateViewConstraints() {
        super.updateViewConstraints()
    }


    override updateViewStyles() {
        super.updateViewStyles()
    }


    override viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
    }


    override layoutViewSubviews() {

        super.layoutViewSubviews()

        const padding = this.core.paddingLength
        const labelHeight = padding * 2

        // View bounds
        const bounds = this.view.bounds.rectangleWithInset(padding)

        this.titleLabel.frame = bounds.rectangleWithHeight(labelHeight)

        // Position your subviews here using the UIRectangle layout API

    }

}
```

#### Key conventions

- Subviews are declared as `readonly` class fields and initialised immediately using `.addedAsSubviewToView(this.view)`.
- `configuredWithObject({...})` is used to set initial properties in a single fluent call.
- The `layoutViewSubviews()` method is the single source of truth for all frame calculations.
- `routeComponentName` is the URL hash token for this screen.
- `ParameterIdentifierName` is a string enum of route parameter keys.
