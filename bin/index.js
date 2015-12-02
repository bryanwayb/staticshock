#! /usr/bin/env node
'use strict';

var helpout = require('helpout'),
	npmPackage = require('../package.json'),
	path = require('path'),
    staticshock = require('../lib/index.js');

var args = require('minimist')(process.argv.slice(2));

if(args.v || args.version) {
    process.stdout.write(helpout.version(npmPackage));
}

if(args.h || args.help || (process.argv.length <= 2)) {
    process.stdout.write(helpout.help({
        npmPackage: npmPackage,
        usage: [
            '[root directory] [output directory]'
        ],
        sections: {
            Options: {
                options: {
                    '-c, --clean': 'Cleans the build output directory (does not perform build)',
                    '-r, --rebuild': 'Performs a clean before building instead of building over the current output directory contents',
                    '--controller': 'Sets a controller to use for build generation. This will override use of a custom controller',
                    '--server': 'Passes a server to build for to the build controller',
                    '--debug': 'Tells the controller to build with debugging in mind',
                    '-v, --version': 'Prints the version/author info in the output header',
                    '-h, --help': 'Prints this help information'
                }
            }
        }
    }));
    process.exit();
}

if(!args._ || args._.length === 0) {
    console.log('Missing root directory. Try --help for usage instructions');
    process.exit();
}

var cwd = process.cwd(),
	root = path.resolve(cwd, args._[0]),
	out = path.resolve(cwd, args._[1] || cwd);

var ss = staticshock(root, out);
if(!ss.setIgnoreFile(path.join(root, '.ignore'))) {
    console.warn('Continuing without .ignore');
}

if(args.controller) {
    if(!ss.defaultController(args.controller)) {
        console.error('Unable to load controller \'' + args.controller + '\'');
        process.exit(1);
    }
}
else {
    try {
        ss.Controller = require(path.join(root, '.controller.js'));
    }
    catch(ex) {
        console.warn('Continuing without .controller.js');
    }
}

if(args.c || args.clean) {
    ss.clean();
}
else {
    ss.build(args.r || args.rebuild, {
        server: args.server,
        debug: args.debug
    });
}