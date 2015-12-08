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
    },
    mergeObjects: function mergeObjects(dest, source) {
        for(var property in source) {
            if(source.hasOwnProperty(property)) {
                var propertyWithoutChar = property.slice(1);
    
                if(property[0] === '!') {
                    if(propertyWithoutChar[0] !== '!') {
                        if(property in dest) {
                            throw Error('Both source and destination keys for \'' + propertyWithoutChar + '\' have been marked as important. Cannot continue with merge.');
                        }
                        else if(('~' + propertyWithoutChar) in dest) {
                            delete dest['~' + propertyWithoutChar];
                        }
    
                        dest[propertyWithoutChar] = source[property];
                        continue;
                    }
                    else {
                        property = propertyWithoutChar;
                    }
                }
    
                if(property[0] === '~') {
                    var important = (('!' + propertyWithoutChar) in dest);
                    if(propertyWithoutChar !== '~' && !important) {
                        if(!(property in dest) && !(propertyWithoutChar in dest)) {
                            dest[propertyWithoutChar] = source[property];
                        }
                        continue;
                    }
    
                    if(important) {
                        delete dest['!' + propertyWithoutChar];
                    }
    
                    property = propertyWithoutChar;
                }
    
                // If we made it this far we can go ahead and make do normal merge processing.
                if(!(('!' + property) in dest)) {
                    if(typeof source[property] === 'string') {
                        if(dest[property] && typeof dest[property] !== 'string') {
                            throw Error('Mismatched types for keys \'' + property + '\', expected a string');
                        }
                        else if(!(property in dest)) {
                            dest[property] = '';
                        }
                        dest[property] = dest[property] + source[property];
                    }
                    else if(source[property].constructor === Array) {
                        if(dest[property] && dest[property].constructor !== Array) {
                            throw Error('Mismatched types for keys \'' + property + '\', expected an array');
                        }
                        else if(!(property in dest)) {
                            dest[property] = [];
                        }
    
                        var len = source[property].length;
                        for(var i = 0; i < len; i++) {
                            if(dest[property].indexOf(source[property]) === -1) {
                                dest[property].push(source[property]);
                            }
                        }
                    }
                    else if(property in dest) {
                        if(typeof source[property] !== typeof dest[property]) {
                            throw Error('Mismatched types for keys \'' + property + '\', expected an array');
                        }
                        else {
                            mergeObjects(dest[property], source[property]);
                        }
                    }
                    else {
                        dest[property] = source[property];
                    }
                }
            }
        }
    
        for(var destProperty in dest) {
            if(dest.hasOwnProperty(destProperty)) {
                if(destProperty[0] === '!' && destProperty[1] !== '!') {
                    dest[destProperty.slice(1)] = dest[destProperty];
                    delete dest[destProperty];
                }
            }
        }
    }
};