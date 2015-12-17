'use strict';

var path = require('path'),
    fs = require('fs'),
    events = require('events'),
	util = require('util'),
    functions = require('./functions.js'),
    Handler = require('./handler.js'),
    colors = require('colors');

var defaultOptions = {
    filenames: {
        config: 'config.json',
        controller: 'controller.js',
        ignore: '.ignore'
    },
    isRoot: true
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

    if(options.relativeRoot == null) {
        options.relativeRoot = options.root;
    }
    
    if(options.relativeOut == null) {
        options.relativeOut = options.out;
    }

    if(options.ignored == null) {
        options.ignored = [ ];
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
        this.log(colors.green('[LOAD]  ') + path.relative(this._options.relativeRoot, configPath) + ' configuration file loaded');
        this.setOptions(configContents, true);
        usedConfigPaths.push(configPath);
    }

    this._parentController = this._controller;
    if(this._options.controller && !this.setController(this._options.controller)) {
        return false;
    }

    var controllerPath;
    if(this._options.filenames.controller && this.setController((controllerPath = path.resolve(this._options.root, this._options.filenames.controller)), true)) {
        this.log(colors.green('[LOAD]  ') + path.relative(this._options.relativeRoot, controllerPath) + ' controller file loaded');
    }

    var ignoredPath;
    if(this._options.filenames.ignore && this.setIgnored((ignoredPath = path.resolve(this._options.root, this._options.filenames.ignore)), true)) {
        this.log(colors.green('[LOAD]  ') + path.relative(this._options.relativeRoot, ignoredPath) + ' file ignore list loaded');
    }

    this._init = true;
    return true;
};

StaticShock.prototype.setController = function(controller, merge) {
    switch(typeof controller) {
        case 'function':
            try {
                controller = controller(this, new Handler(this._options), this._options, this._parentController);
            }
            catch(ex) {
                this.log('Unable to initialize given controller', ex);
                return false;
            }
            return this.setController(controller, merge);
        case 'string':
            try {
                if(/[\\\/]/.test(controller)) {
                    controller = require(controller);
                }
                else {
                    controller = require(path.resolve(__dirname, path.join('../controllers', controller, 'index.js')));
                }
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
};

StaticShock.prototype.setIgnored = function(ignore) {
    var i, len;
    if(typeof ignore === 'string') {
        var contents;
        try {
            contents = fs.readFileSync(ignore).toString().trim();
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
            contents[i] = contents[i].trim();
        }
        return this.setIgnored(contents);
    }
    else {
        if(!ignore) {
            return false;
        }

        len = ignore.length;
        for(i = 0; i < len; i++) {
            this._options.ignored.push(ignore[i]);
        }
    }
    return true;
};

StaticShock.prototype.buildFile = function(file) {
    if(!this._buildFileTree) {
        this._buildFileTree = [ ];
    }
    this._buildFileTree.push(file);

    var relativePath = path.relative(this._options.relativeRoot, file),
        controllerFunction = this._controller[path.extname(relativePath).toLowerCase()];

    var data = {
        content: fs.readFileSync(file).toString(),
        output: path.join(this._options.out, path.relative(this._options.root, file)),
        source: file,
        root: this._options.root
    };
    
    if(this._controller && this._controller.PreBuildFile) {
        this._controller.PreBuildFile(data);
    }
    
    // Shift file step output for each level
    var padding = '',
        len = this._buildFileTree.length;
    for(var i = 0; i < len; i++) {
        padding += ' ';
    }
    if(len) {
        padding += '-> '
    }

    if(controllerFunction) {
        var error,
            logString = padding + colors.cyan('[BUILD] ') + relativePath,
            originalOutput = data.output;
        try {
            controllerFunction(data);
        }
        catch(ex) {
            error = ex;
        }
        
        if(originalOutput !== data.output) {
            logString += ' <-> ' + path.relative(this._options.relativeOut, data.output);
        }
        
        this.log(logString);
        
        if(error) {
            throw error;
        }
    }
    else {
        this.log(padding + colors.magenta('[COPY]  ') + relativePath);
    }
    
    if(this._controller && this._controller.PostBuildFile) {
        this._controller.PostBuildFile(data);
    }

    this._buildFileTree.pop();

    return data;
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
        try {
            if(this._controller && this._controller.PreClean) {
                this._controller.PreClean();
            }
            if(functions.rmdir(this._options.out)) {
                this.log(colors.yellow('[CLEAN] ') + 'Cleaned output directory');
                if(this._controller && this._controller.PostClean) {
                    this._controller.PostClean();
                }
            }
        }
        catch(ex) {
            this.log('Unable to perform clean', ex);
            return false;
        }
    }

    if(this._controller && this._controller.PreBuild) {
        this._controller.PreBuild();
    }

    if(list) {
        var len = list.length;
        for(var i = 0; i < len; i++) {
            var filepath = path.join(this._options.root, list[i]),
                relativePath = path.relative(this._options.relativeRoot, filepath);

            if(this._options.ignored) {
                var ignoreLen = this._options.ignored.length,
                shouldSkip = false;
                for(var o = 0; o < ignoreLen; o++) {
                    if((new RegExp(this._options.ignored[o])).test(relativePath.replace(/\\/gm, '/'))) {
                        shouldSkip = true;
                        break;
                    }
                }
                if(shouldSkip) {
                    this.log(colors.white('[SKIP]  ') + relativePath);
                    continue;
                }
            }

            functions.mkdir(this._options.out);

            try {
                var stat = fs.statSync(filepath);
                if(stat.isFile()) {
                    var data = this.buildFile(filepath);
                    fs.writeFileSync(data.output, data.content);
                }
                else if(stat.isDirectory()) {
                    var optClone = JSON.parse(JSON.stringify(this._options));
                    optClone.root = filepath;
                    optClone.out = path.join(optClone.out, path.basename(filepath));
                    optClone.isRoot = false;
                    optClone.controller = this._controller;
                    if(!(new StaticShock(optClone)).on('log', this.log.bind(this)).build()) {
                        return false;
                    }
                }
            }
            catch(ex) {
                this.log('Error processing ' + path.relative(this._options.relativeRoot, filepath), ex);
            }
        }
    }

    if(this._controller && this._controller.PostBuild) {
        this._controller.PostBuild();
    }

    return true;
};

StaticShock.prototype.log = function(message, error) {
    this.emit('log', message, error);
};

module.exports = function(options) {
    return new StaticShock(options);
};