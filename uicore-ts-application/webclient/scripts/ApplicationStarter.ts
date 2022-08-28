import { UICore } from "uicore-ts"
import { RootViewController } from "./RootViewController"


try {
    
    // @ts-ignore
    const languageKey = (localStorage.getItem("CBLanguageKey") || CBCoreInitializerObject.defaultLanguageKey || "en").replace(
        "\"",
        ""
    ).replace("\"", "")
    
    const loadingLabelElement = document.getElementById("LoadingLabel")
    
    const loadingTextObject = { "en": "Loading." }
    
    loadingLabelElement.innerHTML = (loadingTextObject[languageKey] || loadingTextObject["en"])
    
    UICore.main = new UICore("RootView", RootViewController)
    
    const loadingViewElement = document.getElementById("LoadingView")
    const rootViewElement = document.getElementById("RootView")
    rootViewElement.removeChild(loadingViewElement)
    
} catch (exception) {
    
    console.log(exception)
    
    //window.location = "/unsupported";
    
}





