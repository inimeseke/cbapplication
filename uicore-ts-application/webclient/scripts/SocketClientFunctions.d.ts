import { CBDropdownData, LanguagesData, SocketClientFunction, SocketClientNoMessageFunction } from "cbcore-ts"


declare module "cbcore-ts" {
    
    interface SocketClientInterface {
    
        PerformAction: SocketClientNoMessageFunction<void>;
        PerformActionAndRetrieveData: SocketClientNoMessageFunction<boolean>;
        PerformActionAndRetrieveDataWithParameters: SocketClientFunction<string, boolean>;
    
        // CBEditor controller
    
        EditProperty: SocketClientFunction<{ className: string, propertyKey: string }, { codeFileContents: string, path: string, referencedFiles: { codeFileContents: string, path: string }[] }>;
    
    
        // Internal settings controller
    
        AreCBInternalSettingsAvailableForCurrentUser: SocketClientNoMessageFunction<boolean>
    
        RetrieveLanguageData: SocketClientNoMessageFunction<LanguagesData>;
        DeleteLanguageWithKey: SocketClientFunction<string, LanguagesData>;
        SaveLanguagesData: SocketClientFunction<LanguagesData, LanguagesData>;
    
        RetrieveDropdownCodes: SocketClientNoMessageFunction<string[]>;
        DeleteDropdownDataForCode: SocketClientFunction<string, null>;
        RetrieveDropdownDataForCode: SocketClientFunction<string, CBDropdownData<any>>;
        SaveDropdownData: SocketClientFunction<CBDropdownData<any>, CBDropdownData<any>>;
    
    }
    
}

// declare module "uicore-ts" {
//
//     // @ts-ignore
//     var nil: undefined
//
// }





