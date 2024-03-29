import { CBLanguageService, LanguageValues } from "cbcore-ts"
import { UICore } from "uicore-ts"


export class LanguageService extends CBLanguageService {
    
    static override languageValues: LanguageValues = {
        
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
    
    
}


UICore.languageService = LanguageService



























