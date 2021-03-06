"use strict";

// Base Yeoman generator
const Generator = require('yeoman-generator');

// filesystem
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const paramCase = require('param-case');

// importing utilities
const util = require('../../lib/util.js');

module.exports = class extends Generator {

    constructor(args, opts) {
        super(args, opts);
    }

    // Initialisation geenerator
    initializing() {

    }

    // Prompt for user input for Custom Generator
    prompting() {

    }

    // adds additonal editor support in this case CSS Comb
    configuring() {

    }


    writing() {}

    install() {

        const manifest = util.getComponentManifest(this);

        if (!manifest) {
            return;
        }

        const angularSolutionName = this.options['solutionName'];
        const angularCliOptionsRaw = this.options['angularCliOptions'].split(' ');
        const angularSolutionPath = this.destinationPath(`../${angularSolutionName}`);
        const spfxSolutionName = this.options['solutionName'] + '-spfx';

        let angularCliOptions = [];
        angularCliOptions.push('new');
        angularCliOptions.push(angularSolutionName);
        angularCliOptions.push(...angularCliOptionsRaw);

        // ORIGINAL: this.spawnCommandSync(`ng new ${angularSolutionName} ${angularCliOptions}`, angularCliOptions, {cwd: path.dirname(angularSolutionPath)});
        this.spawnCommandSync('ng', angularCliOptions, {
            cwd: path.dirname(angularSolutionPath)
        });

        const generateComponentOptions = [];
        generateComponentOptions.push('generate');
        generateComponentOptions.push('component');
        generateComponentOptions.push(manifest.componentClassName);
        generateComponentOptions.push('--viewEncapsulation=Emulated');
        generateComponentOptions.push('--entry-component=true');

        // ORIGINAME this.spawnCommandSync(`ng generate component ${manifest.componentClassName} -v Native --entry-component`, [], {cwd: angularSolutionPath});
        this.spawnCommandSync('ng', generateComponentOptions, {
            cwd: angularSolutionPath
        });

        const pkg = JSON.parse(
            fs.readFileSync(
                path.join(angularSolutionPath, 'package.json'), 'utf-8')
        );

        pkg.scripts['bundle'] = 'ng build --prod --output-hashing none && node elements-build.js';
        pkg.scripts['bundle-only'] = 'node elements-build.js';
        pkg.scripts['watch-ng'] = 'ng build --output-hashing none --watch';
        pkg.scripts['watch-out'] = 'npm-watch bundle-only';
        pkg.scripts['watch-spfx'] = `cd ../${spfxSolutionName} && gulp serve`;
        pkg.scripts['watch'] = 'concurrently "npm:watch-ng" "npm:watch-out" "npm:watch-spfx"';

        pkg.watch = pkg.watch || {};
        pkg.watch['bundle-only'] = {
            patterns: [
                "dist"
            ],
            extensions: "js",
            ignore: "**/bundle.js",
            delay: 500,
            runOnChangeOnly: true
        };

        pkg.dependencies['concat'] = '^1.0.3';
        pkg.dependencies['@webcomponents/custom-elements'] = '^1.2.0';
        pkg.dependencies['@webcomponents/webcomponentsjs'] = '^2.1.2';

        pkg.devDependencies = pkg.devDependencies || {};
        pkg.devDependencies['concurrently'] = '^4.1.0';
        pkg.devDependencies['glob'] = '^7.1.3';
        pkg.devDependencies['npm-watch'] = '^0.6.0';

        fs.writeFileSync(
            path.join(angularSolutionPath, 'package.json'),
            JSON.stringify(pkg, null, 2));

        const ejsInject = {
            angularSolutionName: angularSolutionName,
            angularSolutionNameKebabCase: paramCase(angularSolutionName),
            componentClassName: manifest.componentClassName,
            componentClassNameKebabCase: paramCase(manifest.componentClassName),
            spfxSolutionName: angularSolutionName + '-spfx',
            spfxSolutionNameKebabCase: paramCase(angularSolutionName)
        };

        util.deployTemplatesToPath(this, ejsInject, this.templatePath('./angular'), angularSolutionPath);


        fs.appendFileSync(
            path.join(angularSolutionPath, 'src/polyfills.ts'),
            `import '@webcomponents/custom-elements/src/native-shim';\r\n`
        );

        const files = glob.sync(path.join(angularSolutionPath, 'src/app/app.component.*'));

        for (let file of files) {
            fs.unlinkSync(file);
        }

        // Unlink style sheet from component
        const componentStyleSheet = manifest.componentMainFile.replace('.ts', '.module.scss');
        if (fs.existsSync(componentStyleSheet)) {

            fs.unlinkSync(manifest.componentMainFile.replace('.ts', '.module.scss'));

        }

        // Update add templates
        util.deployTemplates(this, ejsInject);

        // finally run install
        if (!this.options.SpfxOptions['testrun']) {

            const polyfills = this.fs.read(
                this.templatePath('angular/src/polyfills.ts'),
                'utf-8');

            fs.writeFileSync(
                path.join(angularSolutionPath, 'src/polyfills.ts'),
                polyfills
            )

            const browserslist = this.fs.read(
                this.templatePath('angular/src/browserslist'),
                'utf-8');

            fs.writeFileSync(
                path.join(angularSolutionPath, 'src/browserslist'),
                browserslist
            )

            this.spawnCommandSync('ng', ['add', '@angular/elements'], {
                cwd: angularSolutionPath
            });

            this.spawnCommandSync('npm', ['install'], {
                cwd: angularSolutionPath
            });

            this.spawnCommandSync('npm', ['run', 'bundle'], {
                cwd: angularSolutionPath
            });

            this.spawnCommand('npm', ['install', `../${angularSolutionName}`], {
                cwd: angularSolutionPath + '-spfx'
            })

        }

        // run SPFx install
        util.runInstall(this);

        // Ensure src/ext path exists
        if (!fs.existsSync(this.destinationPath('src/ext')))
            fs.mkdirSync(this.destinationPath('src/ext'));
    }

    // Run installer normally time to say goodbye
    // If yarn is installed yarn will be used
    end() {

    }

}
