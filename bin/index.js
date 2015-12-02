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
                    '-v, --version': 'Prints the version/author info in the output header',
                    '-h, --help': 'Prints this help information.'
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
ss.setController(path.join(root, '.controller.js'));
ss.build();