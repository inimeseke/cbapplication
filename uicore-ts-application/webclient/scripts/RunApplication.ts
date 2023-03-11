import { UICore } from "uicore-ts"
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
    
    UICore.main = new UICore("RootView", RootViewController)
    
    removeLoadingView()
    
} catch (exception) {
    
    console.log(exception)
    
    //window.location = "/unsupported";
    
}




