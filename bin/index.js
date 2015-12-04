#! /usr/bin/env node
'use strict';

var helpout = require('helpout'),
	npmPackage = require('../package.json'),
	path = require('path'),
    staticshock = require('../lib/index2.js');

var args = require('minimist')(process.argv.slice(2));

if(args.v || args.version) {
    process.stdout.write(helpout.version(npmPackage));
}

if(args.h || args.help) {
    process.stdout.write(helpout.help({
        npmPackage: npmPackage,
        usage: [
            '[options]'
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
}
else {
    var cwd = process.cwd();
    staticshock({
        root: path.resolve(cwd, args.root || cwd),
        out: path.resolve(cwd, args.out || 'build')
    }).on('log', function(message, error) {
        console.log(message);
    }).build();
}