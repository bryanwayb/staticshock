'use strict';

var fs = require('fs'),
	path = require('path');

module.exports = {
    rmdir: function rmdir(directory, delRoot) {
        var list;
        try {
            list = fs.readdirSync(directory);
        }
        catch(ex) {
            return false;
        }

        if(list) {
            for(var li = 0; li < list.length; li++) {
                var stat,
                filename = path.join(directory, list[li]);
                try {
                    stat = fs.statSync(filename);
                }
                catch(ex) { }

                if(!stat) {
                    continue;
                }

                if(stat.isFile()) {
                    fs.unlinkSync(filename);
                }
                else if(stat.isDirectory()) {
                    rmdir(filename, true);
                }
            }
        }

        if(delRoot) {
            try {
                fs.rmdirSync(directory);
            }
            catch(ex) {
                return false;
            }
        }

        return true;
    },
    mkdir: function(directory) {
        var sections = directory.split(path.sep),
            current;

        for(var i = 0; i < sections.length; i++) {
            if(current) {
                if(current.slice(current.length - 1) === path.sep) {
                    current += sections[i];
                }
                else {
                    current = current + path.sep + sections[i];
                }
            }
            else {
                current = sections[i];
                if(process.platform !== 'win32' && current.length === 0) {
                    current = path.sep + current; // Set root to / for *nix
                }
            }
            try {
                fs.statSync(current);
            }
            catch(ex) {
                fs.mkdirSync(current);
            }
        }
    }
};