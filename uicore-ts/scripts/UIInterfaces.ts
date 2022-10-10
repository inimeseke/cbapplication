export interface UILanguageService {
    
    updateCurrentLanguageKey(): void;
    
    currentLanguageKey: string;
    
    stringForKey(
        key: string,
        languageName: string,
        defaultString: string,
        parameters?: { [x: string]: string | UILocalizedTextObject; }
    ): string;
    
    stringForCurrentLanguage(localizedTextObject: UILocalizedTextObject): string;
    
    
}


export interface UILocalizedTextObject {
    
    [key: string]: string;
    
}
