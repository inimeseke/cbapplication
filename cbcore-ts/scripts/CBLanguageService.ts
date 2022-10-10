import {
    FIRST_OR_NIL,
    IS,
    IS_DEFINED,
    IS_NOT,
    nil,
    UICore,
    UILanguageService,
    UILocalizedTextObject,
    UIRoute,
    UIView
} from "uicore-ts"
import { CBCore } from "./CBCore"
import { CBLocalizedTextObject } from "./CBDataInterfaces"


export interface ParticularLanguageValues {
    
    [x: string]: string
    
    topBarTitle: string;
    selectLanguageTitle: string;
    languageNameShort: string;
    leftBarTitle: string;
    languageName: string
    
}


export interface LanguageValues {
    
    [x: string]: ParticularLanguageValues
    
    en: ParticularLanguageValues
    est: ParticularLanguageValues
    
}


export class CBLanguageService implements UILanguageService {
    
    static _currentLanguageKey: string
    
    static languageValues: LanguageValues = {
        
        en: {
            
            languageName: "English",
            languageNameShort: "ENG",
            
            topBarTitle: "UICore application",
            
            selectLanguageTitle: "Select language",
            leftBarTitle: "Title"
            
            
        },
        est: {
            
            languageName: "Eesti keel",
            languageNameShort: "EST",
            
            topBarTitle: "UICore rakendus",
            
            selectLanguageTitle: "Vali keel",
            leftBarTitle: "Pealkiri"
            
            
        }
        
        
        
        
    }
    
    static languages = JSON.parse(JSON.stringify(CBLanguageService.languageValues))
    
    static useStoredLanguageValues(values = {}) {
    
        const result = JSON.parse(JSON.stringify(CBLanguageService.languageValues))
            .objectByCopyingValuesRecursivelyFromObject(
                values) as any
        
        if (JSON.stringify(result) != JSON.stringify(CBLanguageService.languages)) {
    
            CBLanguageService.languages = result
    
            CBLanguageService.broadcastLanguageChangeEvent()
            
        }
        
    }
    
    
    static broadcastLanguageChangeEvent(view?: UIView) {
    
        view = view as any || CBCore.sharedInstance.viewCores.everyElement.rootViewController.view.rootView as any
        
        view.broadcastEventInSubtree({
            name: UIView.broadcastEventName.LanguageChanged,
            parameters: {}
        })
        
    }
    
    static get defaultLanguageKey() {
        
        // @ts-ignore
        return (CBCoreInitializerObject.defaultLanguageKey || "en")
        
    }
    
    static get currentLanguageKey() {
        
        if (!CBLanguageService._currentLanguageKey) {
            
            CBLanguageService.updateCurrentLanguageKey()
            
        }
        
        return CBLanguageService._currentLanguageKey
        
    }
    
    updateCurrentLanguageKey() {
        
        CBLanguageService.updateCurrentLanguageKey()
        
    }
    
    static updateCurrentLanguageKey(route = UIRoute.currentRoute) {
        
        let result = route.componentWithName("settings").parameters.language
        
        if (IS_NOT(result)) {
            
            result = CBLanguageService.defaultLanguageKey
            
        }
        
        const isChanged = (result != CBLanguageService._currentLanguageKey)
        
        CBLanguageService._currentLanguageKey = result
        
        if (isChanged) {
            
            CBCore.sharedInstance.languageKey = result
            
            CBLanguageService.broadcastLanguageChangeEvent()
            
        }
        
    }
    
    get currentLanguageKey() {
        
        const result = CBLanguageService.currentLanguageKey
        
        return result
        
    }
    
    
    
    static stringForKey(
        key: string,
        languageKey: string,
        defaultString: string,
        parameters?: { [x: string]: string | UILocalizedTextObject; }
    ) {
        
        var result
        
        if (IS(key) && CBLanguageService.languages[languageKey] &&
            IS_DEFINED(CBLanguageService.languages[languageKey][key])) {
            
            result = CBLanguageService.languages[languageKey][key]
            
        }
        else {
            
            result = defaultString
            
        }
        
        if (IS(parameters)) {
            
            const parameterKeys = Object.keys(parameters)
            
            parameterKeys.forEach(function (key, index, array) {
                
                const keyString = "%" + key + "%"
                
                const parameter = parameters[key]
                
                var parameterString
                
                if (parameter instanceof Object) {
                    
                    parameterString = UICore.languageService.stringForCurrentLanguage(parameter as UILocalizedTextObject)
                    
                }
                else {
                    
                    parameterString = parameter
                    
                }
                
                
                result = result.replace(new RegExp(keyString, "g"), parameterString)
                
            })
            
        }
        
        return result
        
    }
    
    stringForKey(
        key: string,
        languageKey: string,
        defaultString: string,
        parameters?: { [x: string]: string | UILocalizedTextObject; }
    ) {
        
        
        return CBLanguageService.stringForKey(key, languageKey, defaultString, parameters)
        
        
    }
    
    
    static localizedTextObjectForKey(
        key: string,
        defaultString = key,
        parameters?: { [x: string]: string | UILocalizedTextObject; }
    ) {
        
        const result = {}
        
        CBLanguageService.languages.forEach(function (languageObject, languageKey) {
            
            result[languageKey] = CBLanguageService.stringForKey(key, languageKey, defaultString, parameters)
            
        })
        
        return result
        
    }
    
    localizedTextObjectForKey(
        key: string,
        defaultString?: string,
        parameters?: { [x: string]: string | UILocalizedTextObject; }
    ) {
        
        const result = CBLanguageService.localizedTextObjectForKey(key, defaultString, parameters)
        
        return result
        
    }
    
    
    static localizedTextObjectForText(text: string) {
        
        if (IS_NOT(text)) {
            
            return nil
            
        }
        
        const result = {
            
            [CBLanguageService.defaultLanguageKey]: text
            
        }
        
        return result
        
    }
    
    localizedTextObjectForText(text: string) {
        
        const result = CBLanguageService.localizedTextObjectForText(text)
        
        return result
        
    }
    
    
    static stringForCurrentLanguage(localizedTextObject: CBLocalizedTextObject | string) {
        
        if (!CBLanguageService || !localizedTextObject) {
            
            const asd = 1
            
        }
        
        if (localizedTextObject === "" + localizedTextObject) {
            
            return localizedTextObject
            
        }
        
        localizedTextObject = FIRST_OR_NIL(localizedTextObject)
        
        var result = localizedTextObject[CBLanguageService.currentLanguageKey]
        
        if (IS_NOT(result)) {
            
            result = localizedTextObject[CBLanguageService.defaultLanguageKey]
            
        }
        
        if (IS_NOT(result)) {
            
            result = localizedTextObject["en"]
            
        }
        
        if (IS_NOT(result)) {
            
            result = ""
            
        }
        
        return result
        
    }
    
    stringForCurrentLanguage(localizedTextObject: CBLocalizedTextObject) {
        
        return CBLanguageService.stringForCurrentLanguage(localizedTextObject)
        
    }
    
    
    
    
}


UICore.languageService = CBLanguageService



























