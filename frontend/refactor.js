const { Project } = require("ts-morph");
const fs = require("fs");
const path = require("path");

async function run() {
    const project = new Project({
        tsConfigFilePath: "./tsconfig.json",
    });

    console.log("Loaded project...");

    const rootDir = process.cwd();

    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    // 1. Move features/* to components/*
    const featuresDir = project.getDirectory("features");
    if (featuresDir) {
        for (const dir of featuresDir.getDirectories()) {
            const baseName = dir.getBaseName();
            let newName = baseName.split('-').map(capitalize).join('');
            if (newName === 'Ui') newName = 'UI';
            if (newName === 'Cms') newName = 'CMS';
            
            console.log(`Moving feature ${baseName} to components/${newName}`);
            dir.move(path.join(rootDir, "components", newName));
        }
        for (const file of featuresDir.getSourceFiles()) {
            file.move(path.join(rootDir, "components", file.getBaseName()), { overwrite: true });
        }
    }

    // 2. Move components/site/* to components/common/
    const siteDir = project.getDirectory("components/site");
    if (siteDir) {
        console.log(`Moving components/site to components/common`);
        siteDir.move(path.join(rootDir, "components/common"));
    }

    // 3. Move backend integration directories to api/
    const apiDirs = [
        "auth", "catalog", "checkout", "cms", "collections", 
        "commerce", "commissions", "messaging", "payments", 
        "security", "services", "shipping", "storage", "admin"
    ];

    for (const dirName of apiDirs) {
        const dir = project.getDirectory(dirName);
        if (dir) {
            console.log(`Moving ${dirName} to api/${dirName}`);
            dir.move(path.join(rootDir, "api", dirName));
        }
    }

    // 4. Move config/ to src/config/
    const configDir = project.getDirectory("config");
    if (configDir) {
        console.log(`Moving config to src/config`);
        configDir.move(path.join(rootDir, "src/config"));
    }

    // 5. Move types/ to src/types/
    const typesDir = project.getDirectory("types");
    if (typesDir) {
        console.log(`Moving types to src/types`);
        for (const file of typesDir.getSourceFiles()) {
            file.move(path.join(rootDir, "src/types", file.getBaseName()), { overwrite: true });
        }
    }

    // 6. Relocate app/chatgpt-auth.ts
    const chatgptAuth = project.getSourceFile("app/chatgpt-auth.ts");
    if (chatgptAuth) {
        console.log(`Moving app/chatgpt-auth.ts to api/chatgpt-auth.ts`);
        chatgptAuth.move(path.join(rootDir, "api/chatgpt-auth.ts"), { overwrite: true });
    }

    console.log("Saving changes...");
    await project.save();

    console.log("Done refactoring with ts-morph.");
}

run().catch(console.error);
