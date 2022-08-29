import { CBDropdownData, LanguagesData, SocketClientFunction, SocketClientNoMessageFunction } from "cbcore-ts"


declare module "cbcore-ts" {
    
    interface SocketClientInterface {
        
        PerformAction: SocketClientNoMessageFunction<void>;
        PerformActionAndRetrieveData: SocketClientNoMessageFunction<boolean>;
        PerformActionAndRetrieveDataWithParameters: SocketClientFunction<string, boolean>;
        
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




