#!/usr/bin/env node
import { execSync } from "child_process";
import { magenta } from "colorette";
import * as fs from "fs";
import * as https from "https";
import inquirer from "inquirer";
import * as Path from "path";
export async function run() {
    console.log(magenta("Hello World"));
    const makeANewApplication = "Make a new application";
    const makeANewViewController = "Make a new view controller";
    const makeANewView = "Make a new view";
    const currentPurpose = await inquirer.prompt([
        {
            type: "list",
            name: "a",
            message: "What do you want to do?",
            choices: [makeANewApplication, makeANewViewController, makeANewView]
        }
    ]);
    console.log(currentPurpose);
    if (currentPurpose.a == makeANewApplication) {
        const defaultProjectName = "ui-core-application";
        const answers = await inquirer.prompt([
            {
                type: "input",
                name: "projectName",
                message: "Enter project name.",
                default: defaultProjectName
            }
        ]);
        const projectName = answers.projectName;
        execSync("mkdir " + projectName, {
            // we need this so node will print the command output
            stdio: [0, 1, 2],
            // path to where you want to save the file
            cwd: Path.resolve()
        });
        execSync("git clone https://github.com/inimeseke/UICoreApplication.git " + projectName, {
            // we need this so node will print the command output
            stdio: [0, 1, 2],
            // path to where you want to save the file
            cwd: Path.resolve()
        });
        if (projectName != defaultProjectName) {
            const data = fs.readFileSync(Path.join(projectName, "package.json"), "utf-8");
            const newValue = data.replace(new RegExp(defaultProjectName, "g"), projectName);
            fs.writeFileSync(Path.join(projectName, "package.json"), newValue, "utf-8");
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
        ]);
        const className = answers.className;
        const filePath = Path.join(Path.resolve(), className + ".ts");
        const file = fs.createWriteStream(filePath);
        const request = https.get("https://raw.githubusercontent.com/inimeseke/UICoreApplication/master/webclient/scripts/SomeContentViewController.ts", function (response) {
            response.pipe(file);
            // after download completed close filestream
            file.on("finish", () => {
                file.close();
                console.log("Download Completed");
                const data = fs.readFileSync(filePath, "utf-8");
                const newValue = data.replace(new RegExp("SomeContentViewController", "g"), className);
                fs.writeFileSync(filePath, newValue, "utf-8");
            });
        });
    }
    if (currentPurpose.a == makeANewView) {
        const answers = await inquirer.prompt([
            {
                type: "input",
                name: "className",
                message: "Enter class name.",
                default: "SomeContentView"
            }
        ]);
        const className = answers.className;
        const filePath = Path.join(Path.resolve(), className + ".ts");
        const file = fs.createWriteStream(filePath);
        const request = https.get("https://raw.githubusercontent.com/inimeseke/UICoreApplication/master/webclient/scripts/SomeContentView.ts", function (response) {
            response.pipe(file);
            // after download completed close filestream
            file.on("finish", () => {
                file.close();
                console.log("Download Completed");
                const data = fs.readFileSync(filePath, "utf-8");
                const newValue = data.replace(new RegExp("SomeContentView", "g"), className);
                fs.writeFileSync(filePath, newValue, "utf-8");
            });
        });
    }
}
run();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUVBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDeEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUNuQyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUM5QixPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUE7QUFDL0IsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUE7QUFHNUIsTUFBTSxDQUFDLEtBQUssVUFBVSxHQUFHO0lBRXJCLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUE7SUFFbkMsTUFBTSxtQkFBbUIsR0FBRyx3QkFBd0IsQ0FBQTtJQUNwRCxNQUFNLHNCQUFzQixHQUFHLDRCQUE0QixDQUFBO0lBQzNELE1BQU0sWUFBWSxHQUFHLGlCQUFpQixDQUFBO0lBRXRDLE1BQU0sY0FBYyxHQUFHLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUN6QztZQUNJLElBQUksRUFBRSxNQUFNO1lBQ1osSUFBSSxFQUFFLEdBQUc7WUFDVCxPQUFPLEVBQUUseUJBQXlCO1lBQ2xDLE9BQU8sRUFBRSxDQUFDLG1CQUFtQixFQUFFLHNCQUFzQixFQUFFLFlBQVksQ0FBQztTQUN2RTtLQUNKLENBQUMsQ0FBQTtJQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7SUFFM0IsSUFBSSxjQUFjLENBQUMsQ0FBQyxJQUFJLG1CQUFtQixFQUFFO1FBRXpDLE1BQU0sa0JBQWtCLEdBQUcscUJBQXFCLENBQUE7UUFFaEQsTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQ2xDO2dCQUNJLElBQUksRUFBRSxPQUFPO2dCQUNiLElB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