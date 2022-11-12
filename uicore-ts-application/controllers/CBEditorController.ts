import { Application } from "express"
import * as path from "path"
import { Server } from "socket.io"
import {
    ClassDeclaration,
    Node,
    ObjectLiteralExpression,
    Project,
    PropertyDeclaration, SetAccessorDeclaration,
    SourceFile,
    SyntaxKind
} from "ts-morph"
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
                    return {
                        codeFileContents: file.getFullText(),
                        path: file.getFilePath().replace(path.join(process.cwd(), "webclient") + "/", "")
                    }
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
        
            const viewClass = this.classDeclarationWithName(propertyObject.getStructure().type as string)
            const editableAccessorDeclarations = this.editableAccessorDeclarations(viewClass)
            const editableProperties = editableAccessorDeclarations.map(setter => {
                return {
                    typeName: setter.getStructure().parameters.firstElement.type as string,
                    path: message.propertyKey + "." + setter.getStructure().name
                }
            }).uniqueElementsOnlyWithFunction(property => property.path)
        
        
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
                propertyReferenceLocations: propertyReferenceLocations,
                editableProperties: editableProperties
            })
        
        }
    
    
        targets.SetPropertyValue = async (message, socketSession, respondWithMessage) => {
        
        
            const sourceFiles = this.webclientProject.getSourceFiles()
            const resultFile = sourceFiles.find(
                (file, index, array) => file.getClass(
                    declaration => declaration.getName() == message.className
                )
            )
        
            sourceFiles.removeElement(resultFile)
        
            const classObject = resultFile.getClass(message.className)
            let propertyObject = this.propertyObjectForClass(
                classObject,
                message.propertyKeyPath.split(".").firstElement
            )
        
            const classPropertyTypeName = propertyObject.getType().compilerType.symbol.getName()
        
            const targetFile = sourceFiles.find(
                file => file.getClass(
                    declaration => declaration.getName() == classPropertyTypeName
                )
            )
        
            sourceFiles.removeElement(targetFile)
        
            const targetObjectClassObject = targetFile.getClass(classPropertyTypeName)
            const keyPathComponents = message.propertyKeyPath.split(".")
            let targetObjectClassPropertyObject = targetObjectClassObject.getSetAccessor(
                value => value.getName() == keyPathComponents.lastElement
            )
        
            let propertyReferenceLocations: {
                fileName: string;
                start: { column: number; lineNumber: number };
                className: string;
                end: { column: number; lineNumber: number }
            }[]
        
            if (propertyObject) {
            
                const propertyReferences = targetObjectClassPropertyObject.findReferencesAsNodes().filter(
                    reference => reference.getSourceFile() == classObject.getSourceFile()
                )
            
                let valueString = this.valueStringForPropertyAndMessageValue(
                    targetObjectClassPropertyObject,
                    message.valueString
                )
            
                const propertyReferenceDescriptors = propertyReferences.map(reference => {
                
                    const binaryExpression = reference.getFirstAncestorByKind(SyntaxKind.BinaryExpression)
                    const isAssignment = (binaryExpression?.getOperatorToken()?.getText() == "=")
                    const isSimpleAssignment = true
                    const isInConstructor = binaryExpression?.getFirstAncestorByKind(SyntaxKind.Constructor) && true
                    const left = binaryExpression?.getLeft()
                    const right = binaryExpression?.getRight()
                    const isBeingAssignedTo = Utils.IS(reference.getFirstAncestor(node => node == left))
                    const childrenOfKind = left?.getChildrenOfKind(SyntaxKind.PropertyAccessExpression)
                
                    return {
                        binaryExpression,
                        isInConstructor,
                        isAssignment,
                        left,
                        right,
                        isBeingAssignedTo,
                        childrenOfKind,
                        reference,
                        isSimpleAssignment
                    }
                
                })
                // Find existing value assignment in constructor and assign value
            
                const assignmentObject = propertyReferenceDescriptors.find(
                    referenceDescriptor => (
                        referenceDescriptor.isAssignment &&
                        referenceDescriptor.isBeingAssignedTo &&
                        referenceDescriptor.isInConstructor
                    )
                )
            
                assignmentObject?.right?.replaceWithText(valueString)
            
            
                // Find parent object initializer in constructor or declaration and assign value
            
                // through configuredWithObject
            
                const classConstructor = classObject.getConstructors()[0]
            
                const targetObjectPropertyReferences = propertyObject.findReferencesAsNodes().filter(
                    reference => reference.getSourceFile() == classObject.getSourceFile()
                )
            
            
                const targetObjectConstructorReferences = targetObjectPropertyReferences.filter(
                    reference => this.isNodeContainedInNode(
                        reference,
                        classConstructor
                    )
                )
                const targetObjectConstructorAssignmentReferences = targetObjectConstructorReferences.filter(reference => {
                
                    const binaryExpression = reference.getFirstAncestorByKind(SyntaxKind.BinaryExpression)
                    const leftReferenceText = binaryExpression?.getLeft()?.getText()
                
                    const callExpression = reference.getFirstAncestorByKind(SyntaxKind.CallExpression)
                    const isConfiguration = callExpression?.getExpression()?.getText()?.endsWith("configureWithObject")
                
                    return (leftReferenceText == "this." + keyPathComponents.firstElement &&
                        binaryExpression?.getOperatorToken()?.getText() == "=" && this.isNodeContainedInNode(
                            reference,
                            binaryExpression?.getLeft()
                        )) || isConfiguration
                
                })
            
            
                const targetObjectConstructorAssignmentReference = targetObjectConstructorAssignmentReferences.firstElement
            
            
                if (targetObjectConstructorAssignmentReference && !assignmentObject) {
                    const UIObjectClass = sourceFiles.find(
                        file => file.getClass(
                            declaration => declaration.getName() == "UIObject"
                        )
                    ).getClass(declaration => declaration.getName() == "UIObject")
                
                    const configurationMethodCallReference = UIObjectClass.getMethod(
                            method => method.getName() == "configuredWithObject"
                        ).findReferencesAsNodes().find(
                            reference => this.isNodeContainedInNode(
                                reference,
                                targetObjectConstructorAssignmentReference.getFirstAncestorByKind(SyntaxKind.BinaryExpression)
                                    ?.getRight()
                            )
                        )?.getFirstAncestorByKind(SyntaxKind.CallExpression) ||
                        UIObjectClass.getMethod(
                            method => method.getName() == "configureWithObject"
                        ).findReferencesAsNodes().find(
                            reference => this.isNodeContainedInNode(
                                reference,
                                targetObjectConstructorAssignmentReference.getFirstAncestor((node) => node.getText()
                                    .contains("configureWithObject"))
                            )
                        )?.getFirstAncestorByKind(SyntaxKind.CallExpression)
                
                    const configurationObject = configurationMethodCallReference?.getArguments()?.[0] as ObjectLiteralExpression
                
                    if (configurationObject) {
                    
                        const propertyAssignment = configurationObject.getChildrenOfKind(SyntaxKind.PropertyAssignment)
                            .find(assignment => assignment.getChildren()[0].getText() == keyPathComponents.lastElement)
                    
                        if (propertyAssignment) {
                        
                            const propertyAssignmentValue = propertyAssignment.getChildren()[2]
                        
                            propertyAssignmentValue.replaceWithText(valueString)
                        
                        
                        }
                        else {
                        
                        
                            configurationObject.addPropertyAssignment({
                                name: keyPathComponents.lastElement,
                                initializer: valueString
                            })
                        
                        }
                    
                    
                    }
                    else {
                    
                        // Add configuration to targetObjectConstructorAssignmentReference
                        const right = targetObjectConstructorAssignmentReference.getFirstAncestorByKind(SyntaxKind.BinaryExpression)
                            .getRight()
                        const newNode = right.replaceWithText(
                            right.getText() + ".configuredWithObject({\n" +
                            keyPathComponents.lastElement + ": " + valueString + "\n})"
                        )
                        newNode.formatText()
                    
                    }
                
                
                    var asdasdasdasdasdasdasdasd = 1
                
                
                }
                else if (!assignmentObject) {
                
                    var asdasd = 1
                
                    // Add value assignment in constructor
                
                    // classConstructor.addStatements(
                    //     "\n" + classConstructor.getChildIndentationText() +
                    //     "this." + message.propertyKeyPath + " = " + "new UIColor(\"" + message.valueString + "\")"
                    // ).firstElement.formatText()
                
                    classConstructor.addStatements(
                        "\n" + classConstructor.getChildIndentationText() +
                        "this." + keyPathComponents.firstElement + ".configureWithObject({\n" +
                        keyPathComponents.lastElement + ": " + valueString + "\n})"
                    ).firstElement.formatText()
                
                
                }
            
            
            }
        
            // const result = await socketSession.socketClient.EditProperty({
            //     propertyKey: message.propertyKeyPath,
            //     className: message.className
            // })
        
            await this.webclientProject.save()
            this.reloadEditorProject()
        
            await respondWithMessage(null)
        
        }
    
    
        targets.ReloadEditorFiles = async (message, socketSession, respondWithMessage) => {
            this.reloadEditorProject()
            await respondWithMessage()
        }
    
    
    }
    
    
    private valueStringForPropertyAndMessageValue(
        targetObjectClassPropertyObject: SetAccessorDeclaration,
        valueString
    ) {
        
        if (targetObjectClassPropertyObject?.getType()?.compilerType?.symbol?.getName() == "UIColor") {
            valueString = "new UIColor(\"" + valueString + "\")"
        }
        
        return valueString
        
    }
    
    private reloadEditorProject() {
        this.webclientProject = new Project({
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
        
        this.webclientProject.addSourceFilesAtPaths([
            "webclient/node_modules/uicore-ts/**/*.ts",
            "webclient/node_modules/cbcore-ts/**/*.ts"
        ])
    }
    
    private isNodeContainedInNode(node: Node, parentNode: Node) {
        const parent = node?.getParent()
        return (parent && parent == parentNode) || (parent && this.isNodeContainedInNode(parent, parentNode))
    }
    
    private editableAccessorDeclarations(viewClass: ClassDeclaration) {
        
        const colorReferenceClass = this.classDeclarationWithName("UIColor")
        
        let result = viewClass.getSetAccessors().filter(
            propertyAccessor => ["string", "number"].contains(
                propertyAccessor.getStructure().parameters.firstElement.type as string
            ) || this.isClassKindOfReferenceClass(
                this.classDeclarationWithName(propertyAccessor.getStructure().parameters.firstElement.type as string),
                colorReferenceClass
            )
        )
        
        
        const baseClass = viewClass.getBaseClass()
        if (baseClass) {
            result = result.concat(this.editableAccessorDeclarations(baseClass))
        }
        
        return result
        
    }
    
    private isClassKindOfReferenceClass(
        classDeclaration: ClassDeclaration,
        referenceClassDeclaration: ClassDeclaration
    ) {
        return classDeclaration && (
            classDeclaration.getName() == referenceClassDeclaration.getName() || this.isClassKindOfReferenceClass(
                classDeclaration.getBaseClass(),
                referenceClassDeclaration
            )
        )
    }
    
    private classDeclarationWithName(className: string) {
        
        const sourceFiles = this.webclientProject.getSourceFiles()
        return sourceFiles.find(
            (file, index, array) => file.getClass(
                declaration => declaration.getName() == className
            )
        )?.getClass(className)
        
    }
    
    private annotatePropertyDescriptor(sourceFiles: SourceFile[], propertyDescriptor: CBEditorPropertyDescriptor) {
        
        const resultFile = sourceFiles.find(
            file => file.getClass(
                declaration => declaration.getName() == propertyDescriptor.className
            )
        )
        
        //sourceFiles.removeElement(resultFile)
        
        if (!resultFile) {
            
            var asd = 1
            
            
        }
        
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
