import {
    CBDropdownData,
    LanguagesData,
    SocketClientFunction,
    SocketClientNoMessageFunction
} from "cbcore-ts"


export interface CBEditorAnnotatedPropertyDescriptor {
    className: string
    propertyKey: string
    isDeclaredInClassFile: boolean
    isReferencedInClassFile: boolean
    isInNodeModules: boolean
    isInDeclarationFile: boolean
    superclassPropertyDescriptor?: CBEditorAnnotatedPropertyDescriptor
}


export interface CBEditorPropertyDescriptor {
    
    className: string
    propertyKeyPath: string
    
    runtimeObjectKeyPath: string
    
}


export interface CBEditorPropertyValueDescriptor {
    
    className: string
    propertyKeyPath: string
    valueString: string
    
    saveChanges: boolean
    
}


export interface CBEditorClassFileDescriptor {
    
    className: string
    valueString: string
    
}


interface CBEditorPropertyLocation {
    className: string
    start: { lineNumber: number, column: number }
    end: { lineNumber: number, column: number }
}


export interface CBEditorPropertyReferenceLocation {
    fileName: string
    className: string
    start: { lineNumber: number, column: number }
    end: { lineNumber: number, column: number }
}


type CBEditorPropertyDeclarationType = "field" | "property"


interface CBEditorEditablePropertyDescriptor {
    
    typeName: string
    path: string
    editingLocation: CBEditorPropertyLocation
    declarationType: CBEditorPropertyDeclarationType
    valueOptions: string[]
    
}


export interface CBEditorEditingDescriptor {
    
    codeFileContents: string
    path: string
    referencedFiles: { codeFileContents: string, path: string }[]
    propertyLocation: CBEditorPropertyLocation
    propertyReferenceLocations: CBEditorPropertyReferenceLocation[]
    editableProperties: CBEditorEditablePropertyDescriptor[]
    
}

export interface CBApplicationSocketClientInterface {

    
    PerformAction: SocketClientNoMessageFunction<void>;
    PerformActionAndRetrieveData: SocketClientNoMessageFunction<boolean>;
    PerformActionAndRetrieveDataWithParameters: SocketClientFunction<string, boolean>;
    
    // CBEditor controller
    
    CurrentViewKeyPath: SocketClientNoMessageFunction<string>
    EditorWasClosed: SocketClientNoMessageFunction<void>
    
    AnnotatePropertyDescriptors: SocketClientFunction<CBEditorPropertyDescriptor[],
        CBEditorAnnotatedPropertyDescriptor[]>
    EditProperty: SocketClientFunction<CBEditorPropertyDescriptor,
        CBEditorEditingDescriptor>
    EditingValuesForProperty: SocketClientFunction<CBEditorPropertyDescriptor,
        CBEditorPropertyDescriptor[]>
    
    JSStringFromTSString: SocketClientFunction<string, string>
    
    AllDerivedClassNames: SocketClientFunction<string, string[]>
    
    SetPropertyClassName: SocketClientFunction<CBEditorPropertyValueDescriptor,
        { location: CBEditorPropertyLocation, fileContent: string, newFileContent: string }>
    
    SetPropertyValue: SocketClientFunction<CBEditorPropertyValueDescriptor,
        { location: CBEditorPropertyLocation, fileContent: string, newFileContent: string }>
    
    AddSubview: SocketClientFunction<CBEditorPropertyDescriptor,
        CBEditorEditingDescriptor>
    RemoveSubview: SocketClientFunction<CBEditorPropertyDescriptor,
        boolean>
    
    AddNewViewController: SocketClientFunction<{ className: string },
        { codeFileContents: string, compiledCodeFileContents: string, componentName: string }>
    DeleteViewController: SocketClientFunction<{ className: string, deleteFile: boolean }, boolean>
    
    SaveFile: SocketClientFunction<CBEditorClassFileDescriptor, string>
    
    ReloadEditorFiles: SocketClientNoMessageFunction<void>
    
    
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


declare module "cbcore-ts" {
    
    export interface SocketClientInterface extends CBApplicationSocketClientInterface {
    
        // Not putting anything here actually
        // The extended interface has all the functions
    
    }
    
}

// declare module "uicore-ts" {
//
//     // @ts-ignore
//     var nil: undefined
//
// }





