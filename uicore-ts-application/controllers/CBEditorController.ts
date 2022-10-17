import { Application } from "express"
import * as path from "path"
import { Server } from "socket.io"
import { ClassDeclaration, Project, PropertyDeclaration, SourceFile, SyntaxKind } from "ts-morph"
import "../Extensions"
import Utils from "../Utils"
import {
    CBEditorAnnotatedPropertyDescriptor,
    CBEditorPropertyDescriptor
} from "../webclient/scripts/SocketClientFunctions"
import { RoutesController } from "./RoutesController"
import { SocketController } from "./SocketController"


export class CBEditorController extends RoutesController {
    
    private static _instance: CBEditorController
    
    webclientProject = new Project({
        tsConfigFilePath: "webclient/tsconfig.json"
        // resolutionHost: (moduleResolutionHost, getCompilerOptions) => {
        //     return {
        //         resolveModuleNames: (moduleNames, containingFile) => {
        //             const compilerOptions = getCompilerOptions();
        //             const resolvedModules: ts.ResolvedModule[] = [];
        //
        //             for (const moduleName of moduleNames.map(removeTsExtension)) {
        //                 const result = ts.resolveModuleName(moduleName, containingFile, compilerOptions, moduleResolutionHost);
        //                 if (result.resolvedModule)
        //                     resolvedModules.push(result.resolvedModule);
        //             }
        //
        //             return resolvedModules;
        //         },
        //     };
        //
        //     function removeTsExtension(moduleName: string) {
        //         if (moduleName.slice(-3).toLowerCase() === ".ts")
        //             return moduleName.slice(0, -3);
        //         return moduleName;
        //     }
        // }
    })
    
    public registerRoutes() {
        
        const targets = SocketController.sharedInstance.messageTargets
    
        targets.PerformAction = (message, socketSession, respondWithMessage) => respondWithMessage(null)
    
        targets.PerformActionAndRetrieveData = (message, socketSession, respondWithMessage) => respondWithMessage(true)
    
        targets.PerformActionAndRetrieveDataWithParameters = async (message, socketSession, respondWithMessage) => {
        
            await respondWithMessage(message == "Autopood")
        
        }
    
        this.webclientProject.addSourceFilesAtPaths([
            "webclient/node_modules/uicore-ts/**/*.ts",
            "webclient/node_modules/cbcore-ts/**/*.ts"
        ])
    
        targets.AnnotatePropertyDescriptors = async (messageArray, socketSession, respondWithMessage) => {
        
            const sourceFiles = this.webclientProject.getSourceFiles()
        
            const result = messageArray.map(message => {
                return this.annotatePropertyDescriptor(sourceFiles, message)
            
            })
        
            respondWithMessage(result)
        
        }
    
    
        targets.EditProperty = async (message, socketSession, respondWithMessage) => {
        
        
            const sourceFiles = this.webclientProject.getSourceFiles()
            const resultFile = sourceFiles.find(
                (file, index, array) => file.getClass(
                    declaration => declaration.getName() == message.className
                )
            )
            
            sourceFiles.removeElement(resultFile)
            
            const referencedFiles = sourceFiles.map(
                (file) => {
    
                    const result = {
                        codeFileContents: file.getFullText(),
                        path: file.getFilePath().replace(path.join(process.cwd(), "webclient") + "/", "")
                    }
    
                    return result
    
                }
            )
        
            const classObject = resultFile.getClass(message.className)
            let propertyObject = this.propertyObjectForClass(classObject, message.propertyKey)
            let propertyReferenceLocations: {
                fileName: string;
                start: { column: number; lineNumber: number };
                className: string;
                end: { column: number; lineNumber: number }
            }[]
        
            if (propertyObject) {
                const propertyReferences = propertyObject.findReferencesAsNodes().filter(
                    reference => reference.getSourceFile() == classObject.getSourceFile()
                )
                propertyReferenceLocations = propertyReferences.map(reference => {
                
                    return {
                        fileName: reference.getSourceFile().getBaseName(),
                        className: reference.getFirstAncestorByKind(SyntaxKind.ClassDeclaration)?.getName?.() ?? "",
                        start: {
                            lineNumber: reference.getStartLineNumber(),
                            column: reference.getStart() - reference.getStartLinePos()
                        },
                        end: {
                            lineNumber: reference.getEndLineNumber(),
                            column: reference.getEnd() - reference.getStartLinePos() + 1
                        }
                    }
                
                })
            
            }
        
            await respondWithMessage({
                codeFileContents: resultFile.getFullText(),
                path: resultFile.getFilePath().replace(path.join(process.cwd(), "webclient") + "/", ""),
                referencedFiles: referencedFiles,
                propertyLocation: Utils.IF(propertyObject)(() => {
                
                    return {
                        className: propertyObject.getParent().getName(),
                        start: {
                            lineNumber: propertyObject.getNameNode().getStartLineNumber(),
                            column: propertyObject.getNameNode().getStart() - propertyObject.getNameNode()
                                .getStartLinePos() + 1
                        },
                        end: {
                            lineNumber: propertyObject.getNameNode().getEndLineNumber(),
                            column: propertyObject.getNameNode().getEnd() - propertyObject.getNameNode()
                                .getStartLinePos() + 1
                        }
                    }
                
                }).ELSE(() => undefined),
                propertyReferenceLocations: propertyReferenceLocations
            })
        
        }
    
    
    }
    
    
    private annotatePropertyDescriptor(sourceFiles: SourceFile[], propertyDescriptor: CBEditorPropertyDescriptor) {
        
        const resultFile = sourceFiles.find(
            file => file.getClass(
                declaration => declaration.getName() == propertyDescriptor.className
            )
        )
        
        sourceFiles.removeElement(resultFile)
        
        const classObject = resultFile.getClass(propertyDescriptor.className)
        const propertyObject = this.propertyObjectForClass(classObject, propertyDescriptor.propertyKey)
        
        const propertyReferences = propertyObject?.findReferencesAsNodes()?.filter(
            reference => reference.getSourceFile() == classObject.getSourceFile()
        ) ?? []
        
        const result: CBEditorAnnotatedPropertyDescriptor = {
            
            className: propertyDescriptor.className,
            propertyKey: propertyDescriptor.propertyKey,
            isDeclaredInClassFile: propertyObject?.getFirstAncestorByKind(SyntaxKind.ClassDeclaration) == classObject,
            isReferencedInClassFile: propertyReferences.length > 0,
            isInNodeModules: classObject.getSourceFile().isInNodeModules(),
            isInDeclarationFile: classObject.getSourceFile().isDeclarationFile(),
            superclassPropertyDescriptor: Utils.IF(classObject.getBaseClass())(() => this.annotatePropertyDescriptor(
                sourceFiles,
                {
                    className: classObject.getBaseClass().getName(),
                    propertyKey: propertyDescriptor.propertyKey
                }
            )).ELSE(() => undefined)
            
            
        }
        
        return result
        
    }
    
    propertyObjectForClass(classObject: ClassDeclaration, propertyName: string): PropertyDeclaration {
        
        if (!classObject) {
            return null
        }
        
        return classObject.getProperty(propertyName) || this.propertyObjectForClass(
            classObject.getBaseClass(),
            propertyName
        )
        
    }
    
    
    public static get sharedInstance() {
        return this._instance
    }
    
    // noinspection TypeScriptUMDGlobal,JSDeprecatedSymbols
    public static Instance(expressApp: Application, socketIO: Server) {
        return this._instance || (this._instance = new this(expressApp, socketIO))
    }
    
}
