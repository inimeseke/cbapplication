import { IS, UICore, UIRoute } from "uicore-ts"
import { EditorViewController } from "./EditorViewController"
import { RootViewController } from "./RootViewController"


function setLoadingLabelTextIfNeeded() {
    // @ts-ignore
    const languageKey = (localStorage.getItem("CBLanguageKey") || CBCoreInitializerObject.defaultLanguageKey || "en").replace(
        "\"",
        ""
    ).replace("\"", "")
    
    const loadingLabelElement = document.getElementById("LoadingLabel")
    if (loadingLabelElement) {
        const loadingTextObject: Record<string, string> = { "en": "Loading." }
        loadingLabelElement.innerHTML = (loadingTextObject[languageKey] || loadingTextObject["en"])
    }
}


function removeLoadingView() {
    
    const loadingViewElement = document.getElementById("LoadingView")
    const rootViewElement = document.getElementById("RootView")
    
    if (rootViewElement && loadingViewElement) {
        rootViewElement.removeChild(loadingViewElement)
    }
    
}


try {
    
    setLoadingLabelTextIfNeeded()
    
    const editorControllerComponent = UIRoute.currentRoute.componentWithName(EditorViewController.routeComponentName)
    
    if (IS(editorControllerComponent)) {
        
        UICore.main = new UICore("RootView", EditorViewController)
        
        // @ts-ignore
        window.editorViewController = UICore.main.rootViewController
        
    }
    else {
        
        UICore.main = new UICore("RootView", RootViewController)
        
    }
    
    removeLoadingView()
    
} catch (exception) {
    
    console.log(exception)
    
    //window.location = "/unsupported";
    
}




