'use strict';

var path = require('path'),
    fs = require('fs'),
    events = require('events'),
	util = require('util');

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
        this.log('Configuration file "' + path.relative(this._options.root, configPath) + '" loaded');
        this.setOptions(configContents, true);
        usedConfigPaths.push(configPath);
    }
    
    if(this._options.controller && !this.setController(this._options.controller)) {
        return false;
    }
    
    if(this._options.filenames.controller && this.setController(path.resolve(this._options.root, this._options.filenames.controller), true)) {
        // TODO Log controller loaded
    }

    this._init = true;
    return true;
};

StaticShock.prototype.setController = function(controller, merge) {
    switch(typeof controller) {
        case 'function':
            try {
                controller = controller(this._options);
            }
            catch(ex) {
                // TODO Log error
                return false;
            }
            return this.setController(controller, merge);
        case 'string':
            try {
                controller = require(path.isAbsolute(controller) ? controller : path.resolve(path.join(__dirname, '../controllers'), path.basename(controller, '.js') + '.js'));
            }
            catch(ex) {
                // TODO Log error
                return false;
            }
            return this.setController(controller, merge);
    }
    
    if(typeof controller !== 'object') {
        // Log error
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

StaticShock.prototype.build = function() {
    if(!this.init()) {
        console.log('failed init');
        return false;
    }
    console.log(this);
};

StaticShock.prototype.log = function(message, error) {
    this.emit('log', message, error);
};

module.exports = function(options) {
    return new StaticShock(options);
};