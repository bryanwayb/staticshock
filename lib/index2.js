'use strict';

var path = require('path'),
    fs = require('fs'),
    events = require('events'),
	util = require('util'),
    functions = require('./functions.js'),
    Handler = require('./handler.js');

var defaultOptions = {
    filenames: {
        config: 'config.json',
        controller: 'controller.js',
        ignore: '.ignore'
    }
};

function StaticShock(options) {
    events.call(this);
    this.setOptions(options);
}
util.inherits(StaticShock, events);

StaticShock.prototype.setOptions = function(options, merge) {
    this._options = options = (function recurse(opts, def) {
        if(opts == null) {
            opts = def;
        }
        else {
            if(typeof def === 'object') {
                for(var entry in def) {
                    if(def.hasOwnProperty(entry)) {
                        opts[entry] = recurse(opts[entry], def[entry]);
                    }
                }
            }
        }
        return opts;
    })(options, merge && this._options ? this._options : defaultOptions);
    
    if(options.relative == null) {
        options.relative = options.root;
    }
};

StaticShock.prototype.init = function() {
    if(this._init) {
        return true;
    }

    this._init = false;
    if(!this._options.root || !this._options.out) {
        return false;
    }

    try {
        if(!fs.statSync(this._options.root).isDirectory()) {
            this.log('Root path is not a directory', true);
            return false;
        }
    }
    catch(ex) {
        this.log('Could not read root directory', ex);
        return false;
    }

    var configPath,
        usedConfigPaths = [ ],
        lookupPath = this._options.root;
    while((configPath = this._options.filenames.config)) {
        configPath = path.resolve(lookupPath, configPath);
        
        if(usedConfigPaths.indexOf(configPath) !== -1) {
            break;
        }
        
        lookupPath = path.dirname(configPath);

        var configContents;
        try {
            configContents = fs.readFileSync(configPath);
        }
        catch(ex) {
            break;
        }
        try {
            configContents = JSON.parse(configContents);
        }
        catch(ex) {
            this.log('JSON.parse failed on configuration contents', ex);
            break;
        }
        this.log('Configuration file ' + path.relative(this._options.relative, configPath) + ' loaded');
        this.setOptions(configContents, true);
        usedConfigPaths.push(configPath);
    }
    
    if(this._options.controller && !this.setController(this._options.controller)) {
        return false;
    }
    
    var controllerPath;
    if(this._options.filenames.controller && this.setController((controllerPath = path.resolve(this._options.root, this._options.filenames.controller)), true)) {
        this.log('Controller ' + path.relative(this._options.relative, controllerPath) + ' loaded');
    }
    
    var ignoredPath;
    if(this._options.filenames.ignore && this.setIgnored((ignoredPath = path.resolve(this._options.root, this._options.filenames.ignore)), true)) {
        this.log('Ingore list ' + path.relative(this._options.relative, ignoredPath) + ' loaded');
    }

    this._init = true;
    return true;
};

StaticShock.prototype.setController = function(controller, merge) {
    switch(typeof controller) {
        case 'function':
            try {
                controller = controller(this, new Handler(this._options), this._options);
            }
            catch(ex) {
                this.log('Unable to initialize given controller', ex);
                return false;
            }
            return this.setController(controller, merge);
        case 'string':
            try {
                controller = require(path.isAbsolute(controller) ? controller : path.resolve(path.join(__dirname, '../controllers'), path.basename(controller, '.js') + '.js'));
            }
            catch(ex) {
                return false;
            }
            return this.setController(controller, merge);
    }
    
    if(typeof controller !== 'object') {
        this.log('Given controller must resolve to an object', true);
        return false;
    }
    
    if(merge) {
        if(typeof merge !== 'object') {
            merge = this._controller;
        }
        
        for(var entry in merge) {
            if(!controller.hasOwnProperty(entry) && merge.hasOwnProperty(entry)) {
                controller[entry] = merge[entry];
            }
        }
    }
    
    this._controller = controller;
    
    return true;
}

StaticShock.prototype.setIgnored = function(ignore) {
    var i, len;
    if(typeof ignore === 'string') {
        var contents;
        try {
            contents = fs.readFileSync(ignore);
        }
        catch(ex) {
            return false;
        }
        
        if(!contents) {
            return false;
        }
        
        contents = contents.toString().split('\n');
        len = contents.length;
        for(i = 0; i < len; i++) {
            contents[i] = new RegExp(contents[i].trim());
        }
        return this.setIgnored(contents);
    }
    else {
        this._ignore = [ ];
        if(!ignore) {
            return false;
        }
        
        len = ignore.length;
        for(i = 0; i < len; i++) {
            this._ignore.push(new RegExp(ignore[i]));
        }
    }
    return true;
};

StaticShock.prototype.build = function() {
    if(!this.init()) {
        this.log('Failed initialize build, cannot continue', true);
        return false;
    }
    
    var list;
    
    try {
        list = fs.readdirSync(this._options.root);
    }
    catch(ex) {
        this.log('Error while trying to read directory: ' + this._options.root, ex);
        return false;
    }
    
    if(this._options.clean) {
        this.log('Cleaning out directory');
        try {
            functions.rmdir(this._options.out);
        }
        catch(ex) {
            this.log('Unable to perform clean', ex);
        }
    }
    
    if(list) {
        var len = list.length;
        for(var i = 0; i < len; i++) {
            var filepath = path.join(this._options.root, list[i]);
            try {
                var stat = fs.statSync(filepath);
                if(stat.isFile()) {
                }
                else if(stat.isDirectory()) {
                    var optClone = JSON.parse(JSON.stringify(this._options));
                    optClone.relative = optClone.root;
                    optClone.root = filepath;
                    optClone.out = path.resolve(this._options.out, path.relative(this._options.relative, filepath));
                    var self = this;
                    if(!(new StaticShock(optClone)).on('log', function() {
                        self.log.apply(self, arguments);
                    }).build()) {
                        return false;
                    }
                }
            }
            catch(ex) {
                this.log('Unable to stat ' + path.relative(this._options.relative, filepath), ex);
            }
        }
    }
    
    return true;
};

StaticShock.prototype.log = function(message, error) {
    this.emit('log', message, error);
};

module.exports = function(options) {
    return new StaticShock(options);
};