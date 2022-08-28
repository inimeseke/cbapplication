export interface UILanguageService {
    
    updateCurrentLanguageKey();
    
    currentLanguageKey: string;
    
    stringForKey(
        key: string,
        languageName: string,
        defaultString: string,
        parameters: { [x: string]: string | UILocalizedTextObject; }
    ): string | undefined;
    
    stringForCurrentLanguage(localizedTextObject: UILocalizedTextObject);
    
    
    
}


export interface UILocalizedTextObject {
    
    [key: string]: string;
    
}
