import { transformSync } from "esbuild"
import { Application } from "express"
import * as fs from "fs"
import * as path from "path"
import { Server } from "socket.io"
import {
    ClassDeclaration,
    ExpressionStatement,
    Node,
    ObjectLiteralExpression,
    Project,
    PropertyDeclaration,
    SetAccessorDeclaration,
    SourceFile,
    SyntaxKind
} from "ts-morph"
import { IndentStyle } from "typescript"
import "../Extensions"
import Utils from "../Utils"
import {
    CBEditorAnnotatedPropertyDescriptor,
    CBEditorPropertyDescriptor,
    CBEditorPropertyLocation
} from "../webclient/scripts/SocketClientFunctions"
import { RoutesController } from "./RoutesController"
import { SocketController } from "./SocketController"


/// <reference path="../webclient/scripts/SocketClientFunctions.d.ts" />


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
    
    private currentEditingTarget: CBEditorPropertyDescriptor
    private compilerProject: Project
    
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
        
        
        targets.CurrentViewKeyPath = async (message, socketSession, respondWithMessage) => {
            
            await respondWithMessage(this.currentEditingTarget?.runtimeObjectKeyPath)
            
        }
        
        targets.EditorWasClosed = async (message, socketSession, respondWithMessage) => {
            
            this.currentEditingTarget = null
            
            await respondWithMessage(null)
            
        }
        
        targets.AnnotatePropertyDescriptors = async (messageArray, socketSession, respondWithMessage) => {
            
            const sourceFiles = this.webclientProject.getSourceFiles()
            
            const result = messageArray.map(message => {
                return this.annotatePropertyDescriptor(sourceFiles, message)
                
            })
            
            respondWithMessage(result)
            
        }
        
        
        targets.EditProperty = async (message, socketSession, respondWithMessage) => {
            
            try {
                
                this.currentEditingTarget = message
                
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
                
                const viewClass = this.classDeclarationWithName(
                    propertyObject?.getStructure()?.type as string ||
                    propertyObject.getType().getApparentType().getSymbol().getName()
                )
                
                const editableAccessorDeclarations = this.editableAccessorDeclarations(viewClass)
                
                const classPropertyTypeName = propertyObject.getType().compilerType.symbol.getName()
                const targetFile = sourceFiles.find(
                    file => file.getClass(
                        declaration => declaration.getName() == classPropertyTypeName
                    )
                )
                
                const editableProperties = editableAccessorDeclarations.map(setter => {
                    
                    const propertyKeyPath = message.propertyKey + "." + setter.getStructure().name
                    
                    const result = {
                        typeName: setter.getStructure().parameters.firstElement.type as string,
                        path: propertyKeyPath,
                        editingLocation: this.locationOfEditing(
                            resultFile,
                            targetFile,
                            { className: message.className, propertyKeyPath: propertyKeyPath }
                        )
                    }
                    
                    return result
                    
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
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse(exception)
                
                this.currentEditingTarget = undefined
                
            }
            
        }
        
        
        targets.EditingValuesForProperty = async (message, socketSession, respondWithMessage) => {
            
            
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
            
            
            //if (propertyObject) {
            
            const propertyValueClass = classObject //this.propertyValueClass(sourceFiles, propertyObject)
            const subclasses = propertyValueClass.getDerivedClasses()
            
            const classes = [propertyValueClass].concat(subclasses)
            
            
            //let propertyObject = this.propertyObjectForClass(classObject, message.propertyKey.split(".").firstElement)
            
            const result: CBEditorPropertyDescriptor[] = classes.map(
                classDeclaration => classDeclaration.getStaticProperties()
                    .filter(value =>
                        propertyValueClass &&
                        value.getType()?.compilerType?.symbol?.getName() == propertyValueClass?.getName()
                    )
            ).flat().map(value => {
                
                const result: CBEditorPropertyDescriptor = {
                    
                    propertyKey: value.getName(),
                    className: propertyValueClass.getName(),
                    runtimeObjectKeyPath: null
                    
                }
                
                return result
                
            })
            
            var asd = 1
            
            
            //}
            
            
            await respondWithMessage(result)
            
        }
        
        
        targets.JSStringFromTSString = async (message, socketSession, respondWithMessage) => {
            
            try {
                
                const result = transformSync(message).code
                //swc.transformSync(message).code
                
                respondWithMessage(result)
                
            } catch (exception) {
                
                respondWithMessage.sendErrorResponse("")
                
            }
            
        }
        
        
        targets.AllDerivedClassNames = async (message, socketSession, respondWithMessage) => {
            
            const className = message
            
            const sourceFiles = this.webclientProject.getSourceFiles()
            const resultFile = sourceFiles.find(
                (file, index, array) => file.getClass(
                    declaration => declaration.getName() == className
                )
            )
            
            const classObject = resultFile.getClass(className)
            
            const subclasses = classObject.getDerivedClasses()
            //const classes = [classObject].concat(subclasses)
            
            const result = subclasses.map(subclass => subclass.getName())
            
            await respondWithMessage(result)
            
        }
        
        
        targets.SetPropertyClassName = async (message, socketSession, respondWithMessage) => {
            
            
            const sourceFiles = this.webclientProject.getSourceFiles()
            
            const resultFile = sourceFiles.find(
                (file, index, array) => file.getClass(
                    declaration => declaration.getName() == message.className
                )
            )
            
            sourceFiles.removeElement(resultFile)
            
            const fileText = resultFile.getText()
            
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
            
            const targetObjectClassDeclaration = targetFile.getClass(classPropertyTypeName)
            const keyPathComponents = message.propertyKeyPath.split(".")
            let targetObjectClassPropertyObject = this.setAccessorForClassAndKey(
                targetObjectClassDeclaration,
                keyPathComponents.lastElement
            )
            
            var locationOfEditedValue: CBEditorPropertyLocation
            
            // let propertyReferenceLocations: {
            //     fileName: string;
            //     start: { column: number; lineNumber: number };
            //     className: string;
            //     end: { column: number; lineNumber: number }
            // }[]
            
            if (propertyObject) {
                
                const initializerNewExpression = propertyObject.getInitializer()
                    .getDescendantsOfKind(SyntaxKind.NewExpression).lastElement
                
                initializerNewExpression.setExpression(message.valueString)
                
                propertyObject.set({ type: message.valueString })
                
                classObject.getSourceFile().fixMissingImports()
                
                classObject.getSourceFile().organizeImports()
                
            }
            
            
            // const result = await socketSession.socketClient.EditProperty({
            //     propertyKey: message.propertyKeyPath,
            //     className: message.className
            // })
            
            const newFileContent = resultFile.getText()
            
            if (message.saveChanges) {
                
                fs.watch(
                    "webclient/compiledScripts/webclient.js",
                    (event, filename) => {
                        
                        // eventCount = eventCount + 1
                        //
                        // console.log(event + " " + filename)
                        //
                        
                        // if (eventCount == 2) {
                        //fs.unwatchFile("webclient/compiledScripts/webclient.js")
                        
                        respondWithMessage({
                            
                            location: locationOfEditedValue,
                            fileContent: fileText,
                            newFileContent: newFileContent
                            
                        })
                        
                        // }
                        
                    }
                )
                
                await this.webclientProject.save()
                
                this.reloadEditorProject()
                
            }
            else {
                
                resultFile.replaceText([0, resultFile.getEnd()], newFileContent)
                
                await respondWithMessage({
                    
                    location: locationOfEditedValue,
                    fileContent: fileText,
                    newFileContent: newFileContent
                    
                })
                
            }
            //this.reloadEditorProject()
            
            
        }
        
        
        targets.SetPropertyValue = async (message, socketSession, respondWithMessage) => {
            
            
            const sourceFiles = this.webclientProject.getSourceFiles()
            
            const resultFile = sourceFiles.find(
                (file, index, array) => file.getClass(
                    declaration => declaration.getName() == message.className
                )
            )
            
            sourceFiles.removeElement(resultFile)
            
            const fileText = resultFile.getText()
            
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
            
            const targetObjectClassDeclaration = targetFile.getClass(classPropertyTypeName)
            const keyPathComponents = message.propertyKeyPath.split(".")
            let targetObjectClassPropertyObject = this.setAccessorForClassAndKey(
                targetObjectClassDeclaration,
                keyPathComponents.lastElement
            )
            
            var locationOfEditedValue: CBEditorPropertyLocation
            
            // let propertyReferenceLocations: {
            //     fileName: string;
            //     start: { column: number; lineNumber: number };
            //     className: string;
            //     end: { column: number; lineNumber: number }
            // }[]
            
            if (propertyObject) {
                
                const propertyReferences = targetObjectClassPropertyObject?.findReferencesAsNodes()?.filter(
                    reference => reference.getSourceFile() == classObject.getSourceFile()
                ) ?? []
                
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
                
                locationOfEditedValue = this.locationOfNode(
                    assignmentObject?.right?.replaceWithText(valueString)
                )
                
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
                
                
                const targetObjectConstructorAssignmentReference = targetObjectConstructorAssignmentReferences.firstElement ||
                    propertyObject.getInitializer()?.getFirstChild(
                        node => node.getText() == propertyObject.getNameNode().getText()
                    )
                
                
                if ((targetObjectConstructorAssignmentReference || propertyObject.hasInitializer()) &&
                    !assignmentObject) {
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
                                targetObjectConstructorAssignmentReference?.getFirstAncestorByKind(SyntaxKind.BinaryExpression)
                                    ?.getRight()
                            )
                        )?.getFirstAncestorByKind(SyntaxKind.CallExpression) ||
                        UIObjectClass.getMethod(
                            method => method.getName() == "configureWithObject"
                        ).findReferencesAsNodes().find(
                            reference => this.isNodeContainedInNode(
                                reference,
                                targetObjectConstructorAssignmentReference?.getFirstAncestor(
                                    node => node.getText().contains(keyPathComponents[0] + ".configureWithObject")
                                )
                            )
                        )?.getFirstAncestorByKind(SyntaxKind.CallExpression) ||
                        UIObjectClass.getMethod(
                            method => method.getName() == "configuredWithObject"
                        ).findReferencesAsNodes().find(
                            reference => this.isNodeContainedInNode(
                                reference,
                                propertyObject.getInitializer()
                            )
                        )?.getFirstAncestorByKind(SyntaxKind.CallExpression)
                    
                    const configurationObject = configurationMethodCallReference?.getArguments()?.[0] as ObjectLiteralExpression
                    
                    if (configurationObject) {
                        
                        const propertyAssignment = configurationObject.getChildrenOfKind(SyntaxKind.PropertyAssignment)
                            .find(assignment => assignment.getChildren()[0].getText() == keyPathComponents.lastElement)
                        
                        if (propertyAssignment) {
                            
                            const propertyAssignmentValue = propertyAssignment.getChildren()[2]
                            
                            locationOfEditedValue = this.locationOfNode(
                                propertyAssignmentValue.replaceWithText(valueString)
                            )
                            
                            
                        }
                        else {
                            
                            
                            configurationObject.addPropertyAssignment({
                                name: keyPathComponents.lastElement,
                                initializer: valueString
                            })
                            
                            locationOfEditedValue = this.locationOfNode(
                                configurationObject.getProperty(keyPathComponents.lastElement)
                            )
                            
                            
                        }
                        
                        
                    }
                    else {
                        
                        // Add configuration to targetObjectConstructorAssignmentReference
                        const right = targetObjectConstructorAssignmentReference?.getFirstAncestorByKind(SyntaxKind.BinaryExpression)
                            ?.getRight() ?? propertyObject.getInitializer()
                        const newNode = right.replaceWithText(
                            right.getText() + ".configuredWithObject({\n" +
                            keyPathComponents.lastElement + ": " + valueString + "\n})"
                        )
                        newNode.formatText()
                        
                        locationOfEditedValue = this.locationOfNode(newNode)
                        
                    }
                    
                    
                }
                else if (!assignmentObject) {
                    
                    var asdasd = 1
                    
                    // Add value assignment in constructor
                    
                    // classConstructor.addStatements(
                    //     "\n" + classConstructor.getChildIndentationText() +
                    //     "this." + message.propertyKeyPath + " = " + "new UIColor(\"" + message.valueString + "\")"
                    // ).firstElement.formatText()
                    
                    const newStatement = classConstructor.addStatements(
                        "\n" + classConstructor.getChildIndentationText() +
                        "this." + keyPathComponents.firstElement + ".configureWithObject({\n" +
                        keyPathComponents.lastElement + ": " + valueString + "\n})"
                    ).firstElement
                    newStatement.formatText()
                    
                    classConstructor.getSourceFile().fixMissingImports()
                    
                    locationOfEditedValue = this.locationOfNode(
                        newStatement.getFirstChildByKind(SyntaxKind.BinaryExpression).getRight()
                    )
                    
                    
                }
                
                
            }
            
            
            // const result = await socketSession.socketClient.EditProperty({
            //     propertyKey: message.propertyKeyPath,
            //     className: message.className
            // })
            
            const newFileContent = resultFile.getText()
            
            if (message.saveChanges) {
                
                await this.webclientProject.save()
                
            }
            else {
                
                resultFile.replaceText([0, resultFile.getEnd()], newFileContent)
                
            }
            
            await respondWithMessage({
                
                location: locationOfEditedValue,
                fileContent: fileText,
                newFileContent: newFileContent
                
            })
            //this.reloadEditorProject()
            
            
        }
        
        
        targets.AddSubview = async (message, socketSession, respondWithMessage) => {
            
            
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
            const propertyReferences = propertyObject?.findReferencesAsNodes()?.filter(
                reference => reference.getSourceFile() == classObject.getSourceFile()
            ) ?? []
            
            const propertyReferenceLocations = propertyReferences.map(reference => {
                
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
            
            if (propertyObject) {
                
                respondWithMessage.sendErrorResponse(
                    "Property withe name " + message.propertyKey + " is already present in class " + message.className
                )
                
                return
                
            }
            
            respondWithMessage.sendIntermediateResponse("Adding property " +
                message.className +
                "_" +
                message.propertyKey)
            
            propertyObject = classObject.addProperty({
                name: message.propertyKey,
                initializer: "new UIView().addedAsSubviewToView(this.view)"
            })
            // .configuredWithObject({ backgroundColor: UIColor.redColor })
            
            
            propertyObject.setOrder(classObject.getConstructors()[0].getChildIndex())
            
            // Set frame for the view in the layout method
            
            const layoutMethod = classObject.getMethods()
                .find(method => ["layoutViewSubviews", "layoutSubviews"].contains(method.getName()))
            
            const superCall = layoutMethod.getStatements().find(statement => statement.getText().startsWith("super"))
            
            const otherFrameStatement = layoutMethod.getDescendantsOfKind(SyntaxKind.BinaryExpression)
                .filter(value => value.getOperatorToken().getText() == "=")
                .reverse()
                .find(
                    (statement, index, array) => statement.getLeft().getText().endsWith("frame"))
            
            // layoutMethod.getDescendantStatements().reverse().find(statement => statement.getText().contains("frame ="))
            
            layoutMethod.addStatements(
                "this." + propertyObject.getName() + ".frame = " + otherFrameStatement.getLeft().getText() +
                ".rectangleForNextRow(" +
                "\npadding, " +
                "\n[this." + propertyObject.getName() + ".intrinsicContentHeight(" +
                otherFrameStatement.getLeft().getText() + ".width" +
                "), padding].max()" +
                "\n)"
            )
            
            layoutMethod.formatText({ indentStyle: IndentStyle.Block })
            
            await resultFile.save()
            
            // return
            
            
            const viewClass = this.classDeclarationWithName(propertyObject?.getStructure()?.type as string)
            
            const editableAccessorDeclarations = this.editableAccessorDeclarations(viewClass)
            
            const classPropertyTypeName = propertyObject.getType().compilerType.symbol.getName()
            const targetFile = sourceFiles.find(
                file => file.getClass(
                    declaration => declaration.getName() == classPropertyTypeName
                )
            )
            
            const editableProperties = editableAccessorDeclarations.map(setter => {
                
                const propertyKeyPath = message.propertyKey + "." + setter.getStructure().name
                
                const result = {
                    typeName: setter.getStructure().parameters.firstElement.type as string,
                    path: propertyKeyPath,
                    editingLocation: this.locationOfEditing(
                        resultFile,
                        targetFile,
                        { className: message.className, propertyKeyPath: propertyKeyPath }
                    )
                }
                
                return result
                
            }).uniqueElementsOnlyWithFunction(property => property.path)
            
            const runtimeObjectKeyPathComponents = this.currentEditingTarget.runtimeObjectKeyPath.split(".")
            runtimeObjectKeyPathComponents.lastElement = message.propertyKey
            this.currentEditingTarget = {
                propertyKey: message.propertyKey,
                className: message.className,
                runtimeObjectKeyPath: runtimeObjectKeyPathComponents.join(".")
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
                propertyReferenceLocations: propertyReferenceLocations,
                editableProperties: editableProperties
            })
            
        }
        
        
        targets.RemoveSubview = async (message, socketSession, respondWithMessage) => {
            
            
            const viewController = this.classDeclarationWithName(message.className)
            const property = viewController.getProperty(message.propertyKey)
            const referenceNodes = property.findReferencesAsNodes()
            
            const referenceExpressions: ExpressionStatement[] = referenceNodes.map(
                value => value.getFirstAncestorByKind(SyntaxKind.ExpressionStatement)
            ).filter(value => value).uniqueElementsOnlyWithFunction(value => value.getText())
            
            const referenceBinaryExpressions = referenceExpressions.map(
                value => value.getFirstDescendantByKind(SyntaxKind.BinaryExpression)
            ).filter(value => value?.getLeft()?.getText()?.contains(message.propertyKey + ".frame"))
            
            referenceBinaryExpressions.forEach(value => {
                
                value.getFirstAncestorByKind(SyntaxKind.ExpressionStatement)?.remove()
                
            })
            
            property.remove()
            
            await viewController.getSourceFile().save()
            
            this.currentEditingTarget.propertyKey = "view"
            
            var asd = 1
            
            respondWithMessage(true)
            
            
        }
        
        
        targets.AddNewViewController = async (message, socketSession, respondWithMessage) => {
            
            
            const newClassName: string = message.className
            
            const UIRootViewController = this.classDeclarationWithName("UIRootViewController")
            
            const sourceFiles = this.webclientProject.getSourceFiles()
            const rootViewControllerFile = sourceFiles.find(
                (file, index, array) => file.getClass(declaration =>
                    declaration.getName() != UIRootViewController.getName() &&
                    this.isClassKindOfReferenceClass(declaration, UIRootViewController)
                )
            )
            
            const SomeContentViewController = this.classDeclarationWithName("SomeContentViewController")
            
            const newClassFile = this.webclientProject.createSourceFile(
                path.join(path.dirname(rootViewControllerFile.getFilePath()), newClassName + ".ts"),
                SomeContentViewController.getSourceFile()
                    .getFullText()
                    .replaceAll("SomeContentViewController", newClassName)
            )
            
            // Change the route component name
            
            const newClass = newClassFile.getClass(newClassName)
            
            const routeComponentNameProperty = newClass.getStaticProperty("routeComponentName")
            
            const componentName = newClassName.toLowerCase().replace("viewcontroller", "")
            
            routeComponentNameProperty.set({ initializer: "\"" + componentName + "\"" })
            
            
            // Register the class in the RootViewController
            
            const classNameLowercased = newClassName.slice(0, 1).toLowerCase() + newClassName.slice(1)
            
            const rootViewControllerClass = rootViewControllerFile.getClasses()[0]
            const contentViewControllersProperty = rootViewControllerClass.getProperty("contentViewControllers")
            contentViewControllersProperty.getInitializer()
                .asKind(SyntaxKind.ObjectLiteralExpression)
                .addPropertyAssignment({
                    name: classNameLowercased,
                    initializer: "this.lazyViewControllerObjectWithClass(" + newClassName + ")"
                })
            
            rootViewControllerFile.addImportDeclaration(
                {
                    moduleSpecifier: path.join(newClassFile.getDirectoryPath(), newClassName),
                    namedImports: [newClassName]
                }
            )
            
            //rootViewControllerFile.fixMissingImports()
            
            // Change the title
            
            const UIObjectClass = sourceFiles.find(
                file => file.getClass(
                    declaration => declaration.getName() == "UIObject"
                )
            ).getClass(declaration => declaration.getName() == "UIObject")
            
            const titleLabelPropertyName = "titleLabel"
            const titleLabelPropertyDeclaration = newClass.getProperty(titleLabelPropertyName)
            const configurationMethodCallReference = UIObjectClass.getMethod(
                method => method.getName() == "configuredWithObject"
            ).findReferencesAsNodes().find(
                reference => this.isNodeContainedInNode(
                    reference,
                    titleLabelPropertyDeclaration.getInitializer()
                )
            )?.getFirstAncestorByKind(SyntaxKind.CallExpression)
            const configurationObject = configurationMethodCallReference?.getArguments()?.[0] as ObjectLiteralExpression
            
            if (configurationObject) {
                const propertyAssignment = configurationObject.getChildrenOfKind(SyntaxKind.PropertyAssignment)
                    .find(assignment => assignment.getChildren()[0].getText() == "text")
                if (propertyAssignment) {
                    const propertyAssignmentValue = propertyAssignment.getChildren()[2]
                    propertyAssignmentValue.replaceWithText("\"" + newClassName + "\"")
                }
                else {
                    configurationObject.addPropertyAssignment({
                        name: "text",
                        initializer: newClassName
                    })
                }
            }
            
            
            await newClassFile.save()
            await rootViewControllerFile.save()
            
            let compiledCodeFileContents: string
            
            try {
                
                compiledCodeFileContents = transformSync(newClassFile.getFullText()).code
                
            } catch (exception) {
                
                console.log(exception)
                console.log(newClassFile.getFullText())
                
            }
            
            this.currentEditingTarget = {
                className: newClassName,
                propertyKey: "view",
                runtimeObjectKeyPath: "contentViewController.view"
            }
            
            await respondWithMessage({
                
                codeFileContents: newClassFile.getFullText(),
                compiledCodeFileContents: compiledCodeFileContents,
                componentName: componentName
                
            })
            
            
        }
        
        
        targets.DeleteViewController = async (message, socketSession, respondWithMessage) => {
            
            const UIRootViewController = this.classDeclarationWithName("UIRootViewController")
            
            const viewController = this.classDeclarationWithName(message.className)
            
            // viewController.findReferences().forEach((value, index, array) => {
            //
            //
            //
            //     value.getDefinition()
            //
            // })
            
            const sourceFiles = this.webclientProject.getSourceFiles()
            const rootViewControllerFile = sourceFiles.find(
                (file, index, array) => file.getClass(declaration =>
                    declaration.getName() != UIRootViewController.getName() &&
                    this.isClassKindOfReferenceClass(declaration, UIRootViewController)
                )
            )
            
            // Unregister the class in the RootViewController
            
            const classNameLowercased = message.className.slice(0, 1).toLowerCase() + message.className.slice(1)
            
            const rootViewControllerClass = rootViewControllerFile.getClasses()[0]
            const contentViewControllersProperty = rootViewControllerClass.getProperty("contentViewControllers")
            contentViewControllersProperty.getInitializer()
                .asKind(SyntaxKind.ObjectLiteralExpression)
                .getProperty(classNameLowercased).remove()
            
            rootViewControllerFile.organizeImports()
            await this.webclientProject.save()
            fs.unlinkSync(viewController.getSourceFile().getFilePath())
            
            this.reloadEditorProject()
            
            await respondWithMessage(true)
            
        }
        
        
        targets.SaveFile = async (message, socketSession, respondWithMessage) => {
            
            
            const sourceFiles = this.webclientProject.getSourceFiles()
            const resultFile = sourceFiles.find(
                (file, index, array) => file.getClass(
                    declaration => declaration.getName() == message.className
                )
            )
            
            resultFile.replaceText([0, resultFile.getEnd()], message.valueString)
            
            
            await this.webclientProject.save()
            
            await respondWithMessage(resultFile.getText())
            
            
        }
        
        
        targets.ReloadEditorFiles = async (message, socketSession, respondWithMessage) => {
            this.reloadEditorProject()
            await respondWithMessage(null)
        }
        
        
    }
    
    
    private locationOfEditing(
        resultFile: SourceFile,
        targetFile: SourceFile,
        message: { className: string; propertyKeyPath: string }
    ): CBEditorPropertyLocation {
        
        
        const fileText = resultFile.getText()
        
        const classObject = resultFile.getClass(message.className)
        let propertyObject = this.propertyObjectForClass(
            classObject,
            message.propertyKeyPath.split(".").firstElement
        )
        
        const classPropertyTypeName = propertyObject.getType().compilerType.symbol.getName()
        
        const targetObjectClassDeclaration = targetFile.getClass(classPropertyTypeName)
        const keyPathComponents = message.propertyKeyPath.split(".")
        let targetObjectClassPropertyObject = this.setAccessorForClassAndKey(
            targetObjectClassDeclaration,
            keyPathComponents.lastElement
        )
        
        let locationOfEditedValue: CBEditorPropertyLocation | undefined
        
        // let propertyReferenceLocations: {
        //     fileName: string;
        //     start: { column: number; lineNumber: number };
        //     className: string;
        //     end: { column: number; lineNumber: number }
        // }[]
        
        if (propertyObject) {
            
            const propertyReferences = targetObjectClassPropertyObject?.findReferencesAsNodes()?.filter(
                reference => reference.getSourceFile() == classObject.getSourceFile()
            ) ?? []
            
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
            
            locationOfEditedValue = this.locationOfNode(
                assignmentObject?.right
            )
            
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
            
            
            const targetObjectConstructorAssignmentReference = targetObjectConstructorAssignmentReferences.firstElement ||
                propertyObject.getInitializer()?.getFirstChild(
                    node => node.getText() == propertyObject.getNameNode().getText()
                )
            
            
            if ((targetObjectConstructorAssignmentReference || propertyObject.hasInitializer()) && !assignmentObject) {
                
                const sourceFiles = this.webclientProject.getSourceFiles()
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
                            targetObjectConstructorAssignmentReference?.getFirstAncestorByKind(SyntaxKind.BinaryExpression)
                                ?.getRight()
                        )
                    )?.getFirstAncestorByKind(SyntaxKind.CallExpression) ||
                    UIObjectClass.getMethod(
                        method => method.getName() == "configureWithObject"
                    ).findReferencesAsNodes().find(
                        reference => this.isNodeContainedInNode(
                            reference,
                            targetObjectConstructorAssignmentReference?.getFirstAncestor(
                                node => node.getText().contains(keyPathComponents[0] + ".configureWithObject")
                            )
                        )
                    )?.getFirstAncestorByKind(SyntaxKind.CallExpression) ||
                    UIObjectClass.getMethod(
                        method => method.getName() == "configuredWithObject"
                    ).findReferencesAsNodes().find(
                        reference => this.isNodeContainedInNode(
                            reference,
                            propertyObject.getInitializer()
                        )
                    )?.getFirstAncestorByKind(SyntaxKind.CallExpression)
                
                const configurationObject = configurationMethodCallReference?.getArguments()?.[0] as ObjectLiteralExpression
                
                if (configurationObject) {
                    
                    const propertyAssignment = configurationObject.getChildrenOfKind(SyntaxKind.PropertyAssignment)
                        .find(assignment => assignment.getChildren()[0].getText() == keyPathComponents.lastElement)
                    
                    if (propertyAssignment) {
                        
                        const propertyAssignmentValue = propertyAssignment.getChildren()[2]
                        
                        locationOfEditedValue = this.locationOfNode(
                            propertyAssignmentValue
                        )
                        
                        
                    }
                    
                    
                }
                else {
                    
                    // Add configuration to targetObjectConstructorAssignmentReference
                    const right = targetObjectConstructorAssignmentReference
                        ?.getFirstAncestorByKind(SyntaxKind.BinaryExpression)
                        ?.getRight()
                    locationOfEditedValue = this.locationOfNode(right)
                    
                }
                
                var asdasdasdasdasdasdasdasd = 1
                
            }
            
            
        }
        
        
        return locationOfEditedValue
        
    }
    
    private locationOfNode(newNode: Node) {
        
        if (!newNode) {
            
            return undefined
            
        }
        
        const classObject = newNode.getFirstAncestorByKind(SyntaxKind.ClassDeclaration)
        
        return {
            className: classObject.getName(),
            start: {
                lineNumber: newNode.getStartLineNumber(),
                column: newNode.getStart() - newNode.getStartLinePos()
            },
            end: {
                lineNumber: newNode.getEndLineNumber(),
                column: newNode.getEnd() - newNode.getStartLinePos() + 1
            }
        }
        
    }
    
    private propertyValueClass(sourceFiles: SourceFile[], propertyObject: PropertyDeclaration) {
        
        let propertyValueClass: ClassDeclaration
        sourceFiles.find(
            (file, index, array) => file.getClass(
                declaration => {
                    const result = declaration.getName() == propertyObject.getStructure().type
                    if (result) {
                        propertyValueClass = declaration
                    }
                    return result
                }
            )
        )
        
        return propertyValueClass
        
    }
    
    private setAccessorForClassAndKey(classObject: ClassDeclaration, key: string) {
        
        if (!classObject) {
            return undefined
        }
        
        return classObject?.getSetAccessor(
            value => value.getName() == key
        ) || this.setAccessorForClassAndKey(classObject.getBaseClass(), key)
        
    }
    
    private valueStringForPropertyAndMessageValue(
        targetObjectClassPropertyObject: SetAccessorDeclaration,
        valueString: string
    ) {
        
        let result = valueString
        
        if (targetObjectClassPropertyObject?.getType()?.compilerType?.symbol?.getName() == "UIColor") {
            
            result = "new UIColor(\"" + valueString + "\")"
            
            if (valueString.trim().startsWith("[") && valueString.trim().endsWith("]")) {
                
                result = valueString.trim().substring(1, valueString.length - 1)
                
            }
            
        }
        
        // @ts-ignore
        if (targetObjectClassPropertyObject?.getType()?.compilerType?.intrinsicName == "string") {
            
            result = "\"" + valueString + "\""
            
        }
        
        return result
        
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
        
        if (!viewClass) {
            return []
        }
        
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
            
            return
            
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
                    propertyKey: propertyDescriptor.propertyKey,
                    runtimeObjectKeyPath: propertyDescriptor.runtimeObjectKeyPath
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
