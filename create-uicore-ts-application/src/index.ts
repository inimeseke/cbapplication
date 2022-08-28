#!/usr/bin/env node

import { execSync } from "child_process"
import { magenta } from "colorette"
import * as fs from "fs"
import * as https from "https"
import inquirer from "inquirer"
import * as Path from "path"


export async function run() {
    
    console.log(magenta("Hello World"))
    
    const makeANewApplication = "Make a new application"
    const makeANewViewController = "Make a new view controller"
    const makeANewView = "Make a new view"
    
    const currentPurpose = await inquirer.prompt([
        {
            type: "list",
            name: "a",
            message: "What do you want to do?",
            choices: [makeANewApplication, makeANewViewController, makeANewView]
        }
    ])
    
    console.log(currentPurpose)
    
    if (currentPurpose.a == makeANewApplication) {
        
        const defaultProjectName = "ui-core-application"
        
        const answers = await inquirer.prompt([
            {
                type: "input",
                name: "projectName",
                message: "Enter project name.",
                default: defaultProjectName
            }
        ])
        
        const projectName = answers.projectName
        
        execSync("mkdir " + projectName, {
            
            // we need this so node will print the command output
            stdio: [0, 1, 2],
            // path to where you want to save the file
            cwd: Path.resolve()
            
        })
        
        execSync("git clone https://github.com/inimeseke/UICoreApplication.git " + projectName, {
            
            // we need this so node will print the command output
            stdio: [0, 1, 2],
            // path to where you want to save the file
            cwd: Path.resolve()
            
        })
        
        if (projectName != defaultProjectName) {
            
            const data = fs.readFileSync(Path.join(projectName, "package.json"), "utf-8")
            const newValue = data.replace(new RegExp(defaultProjectName, "g"), projectName)
            fs.writeFileSync(Path.join(projectName, "package.json"), newValue, "utf-8")
            
        }
        
        
    }
    
    if (currentPurpose.a == makeANewViewController) {
        
        const answers = await inquirer.prompt([
            {
                type: "input",
                name: "className",
                message: "Enter class name.",
                default: "SomeContentViewController"
            }
        ])
        
        const className = answers.className
        
        const filePath = Path.join(Path.resolve(), className + ".ts")
        
        const file = fs.createWriteStream(filePath)
        const request = https.get(
            "https://raw.githubusercontent.com/inimeseke/UICoreApplication/master/webclient/scripts/SomeContentViewController.ts",
            function (response) {
                
                response.pipe(file)
                
                // after download completed close filestream
                file.on("finish", () => {
                    
                    file.close()
                    console.log("Download Completed")
                    
                    const data = fs.readFileSync(filePath, "utf-8")
                    const newValue = data.replace(new RegExp("SomeContentViewController", "g"), className)
                    fs.writeFileSync(filePath, newValue, "utf-8")
                    
                })
                
            }
        )
        
        
        
        
        
    }
    
    
    if (currentPurpose.a == makeANewView) {
        
        const answers = await inquirer.prompt([
            {
                type: "input",
                name: "className",
                message: "Enter class name.",
                default: "SomeContentView"
            }
        ])
        
        const className = answers.className
        
        const filePath = Path.join(Path.resolve(), className + ".ts")
        
        const file = fs.createWriteStream(filePath)
        const request = https.get(
            "https://raw.githubusercontent.com/inimeseke/UICoreApplication/master/webclient/scripts/SomeContentView.ts",
            function (response) {
                
                response.pipe(file)
                
                // after download completed close filestream
                file.on("finish", () => {
                    
                    file.close()
                    console.log("Download Completed")
                    
                    const data = fs.readFileSync(filePath, "utf-8")
                    const newValue = data.replace(new RegExp("SomeContentView", "g"), className)
                    fs.writeFileSync(filePath, newValue, "utf-8")
                    
                })
                
            }
        )
        
        
        
    }
    
    
    
}


run()
