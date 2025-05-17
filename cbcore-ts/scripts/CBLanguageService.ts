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
    
    static currentClassObject = CBLanguageService
    
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
    
    static languages = JSON.parse(JSON.stringify(this.languageValues))
    
    static useStoredLanguageValues(values = {}) {
        
        const result = JSON.parse(JSON.stringify(this.languageValues))
            .objectByCopyingValuesRecursivelyFromObject(
                values) as any
        
        if (JSON.stringify(result) != JSON.stringify(this.languages)) {
            
            this.languages = result
            
            this.broadcastLanguageChangeEvent()
            
        }
        
    }
    
    
    static broadcastLanguageChangeEvent(view?: UIView) {
        
        view = view as any || CBCore.sharedInstance.viewCores.everyElement.rootViewController.view.rootView as any
        
        view?.broadcastEventInSubtree({
            name: UIView.broadcastEventName.LanguageChanged,
            parameters: {}
        })
        
    }
    
    static get defaultLanguageKey() {
        
        // @ts-ignore
        return (CBCoreInitializerObject.defaultLanguageKey || "en")
        
    }
    
    static get currentLanguageKey() {
        
        if (!this._currentLanguageKey) {
            
            this.updateCurrentLanguageKey()
            
        }
        
        return this._currentLanguageKey
        
    }
    
    updateCurrentLanguageKey() {
        
        CBLanguageService.currentClassObject.updateCurrentLanguageKey()
        
    }
    
    static updateCurrentLanguageKey(route = UIRoute.currentRoute) {
        
        let result = route.componentWithName("settings")?.parameters?.language
        
        if (IS_NOT(result)) {
            
            result = this.defaultLanguageKey
            
        }
        
        const isChanged = (result != this._currentLanguageKey)
        
        this._currentLanguageKey = result
        
        if (isChanged) {
            
            CBCore.sharedInstance.languageKey = result
            
            this.broadcastLanguageChangeEvent()
            
        }
        
    }
    
    get currentLanguageKey() {
        
        const result = CBLanguageService.currentClassObject.currentLanguageKey
        
        return result
        
    }
    
    
    static stringForKey(
        key: string,
        languageKey: string,
        defaultString: string,
        parameters?: { [x: string]: string | UILocalizedTextObject; }
    ) {
        
        var result: string
        
        if (IS(key) && this.languages[languageKey] &&
            IS_DEFINED(this.languages[languageKey][key])) {
            
            result = this.languages[languageKey][key]
            
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
        
        
        return CBLanguageService.currentClassObject.stringForKey(key, languageKey, defaultString, parameters)
        
        
    }
    
    
    static localizedTextObjectForKey(
        key: string,
        defaultString = key,
        parameters?: { [x: string]: string | UILocalizedTextObject; }
    ) {
        
        const result = {}
        
        this.languages.forEach((languageObject: any, languageKey: string) => {
            
            // @ts-ignore
            result[languageKey] = this.stringForKey(key, languageKey, defaultString, parameters)
            
        })
        
        return result
        
    }
    
    localizedTextObjectForKey(
        key: string,
        defaultString?: string,
        parameters?: { [x: string]: string | UILocalizedTextObject; }
    ) {
        
        const result = CBLanguageService.currentClassObject.localizedTextObjectForKey(key, defaultString, parameters)
        
        return result
        
    }
    
    
    static localizedTextObjectForText(text: string) {
        
        if (IS_NOT(text)) {
            
            return nil
            
        }
        
        const result = {
            
            [this.defaultLanguageKey]: text
            
        }
        
        return result
        
    }
    
    localizedTextObjectForText(text: string) {
        
        const result = CBLanguageService.currentClassObject.localizedTextObjectForText(text)
        
        return result
        
    }
    
    
    static stringForCurrentLanguage(localizedTextObject: CBLocalizedTextObject | string) {
        
        if (localizedTextObject === "" + localizedTextObject) {
            
            return localizedTextObject
            
        }
        
        localizedTextObject = FIRST_OR_NIL(localizedTextObject)
        
        // @ts-ignore
        let result: string = localizedTextObject[this.currentLanguageKey]
        
        if (IS_NOT(result)) {
            
            // @ts-ignore
            result = localizedTextObject[this.defaultLanguageKey]
            
        }
        
        if (IS_NOT(result)) {
            
            // @ts-ignore
            result = localizedTextObject["en"]
            
        }
        
        if (IS_NOT(result)) {
            
            result = ""
            
        }
        
        return result
        
    }
    
    stringForCurrentLanguage(localizedTextObject: CBLocalizedTextObject) {
        
        return CBLanguageService.currentClassObject.stringForCurrentLanguage(localizedTextObject)
        
    }
    
    
}


UICore.languageService = CBLanguageService



























