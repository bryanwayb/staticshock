'use strict';

var fs = require('fs'),
    path = require('path');

var BackslashRegex = /\\/gm;

function mkdir(directory) {
    var sections = directory.split(path.sep),
        current;

    for(var i = 0; i < sections.length; i++) {
        if(current) {
            current = current + path.sep + sections[i];
        }
        else {
            current = sections[i];
        }
        try {
            fs.statSync(current);
        }
        catch(ex) {
            fs.mkdirSync(current);
        }
    }
}

function rmdir(directory) {
    var list;
    try {
        list = fs.readdirSync(directory);
    }
    catch(ex) { }

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
                rmdir(filename);
            }
        }
    }

    try {
        fs.rmdirSync(directory);
    }
    catch(ex) { }
}

function getFilesInDirectory(directory, callback) {
    var list;
    try {
        list = fs.readdirSync(directory);
    }
    catch(ex) { }

    if(!list) {
        return;
    }

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
            callback(filename);
        }
        else if(stat.isDirectory()) {
            getFilesInDirectory(filename, callback);
        }
    }
}

function StaticShock(root, out) {
    this._root = root;
    this._out = out;
    this.Ignore = [ ];
}

StaticShock.prototype.isIgnored = function(file) {
    var len = this.Ignore.length;
    for(var i = 0; i < len; i++) {
        if(this.Ignore[i].test(file.replace(BackslashRegex, '/'))) {
            return true;
        }
    }
    return false;
};

StaticShock.prototype.parseIgnoreList = function(content) {
    this.Ignore = [ ];
    if(content) {
        content = content.toString().split('\n');
        var len = content.length;
        for(var i = 0; i < len; i++) {
            this.Ignore.push(new RegExp(content[i].trim()));
        }
    }
};

StaticShock.prototype.setIgnoreFile = function(file) {
    var content;
    try {
        content = fs.readFileSync(file);
    }
    catch(ex) {
        return false;
    }

    this.parseIgnoreList(content);

    return true;
};

StaticShock.prototype.clean = function() {
    rmdir(this._out);
};

StaticShock.prototype.build = function(rebuild, options) {
    if(rebuild) {
        this.clean();
    }

    var self = this;
    getFilesInDirectory(this._root, function(file) {
        var rel = path.relative(self._root, file);
        if(self.isIgnored(rel)) {
            return;
        }

        mkdir(path.join(self._out, path.dirname(rel)));

        var fileController;
        if(self.Controller && (fileController = self.Controller[path.extname(file).toLowerCase()])) {
            var param = {
                source: file,
                destination: path.join(self._out, rel),
                rootDirectory: self._root,
                debug: options.debug
            };
            var content = fileController(param);
            fs.writeFileSync(param.destination, content);
        }
        else {
            fs.createReadStream(file).pipe(fs.createWriteStream(path.join(self._out, rel)));
        }
    });

    var postBuild;
    if(this.Controller && (postBuild = this.Controller._postBuild)) {
        postBuild(this._out, options);
    }
};

StaticShock.prototype.defaultController = function(name) {
    var exists = false,
        controllerPath = path.join(path.resolve(__dirname, '../controllers'), name + '.js'),
        controller;
    try {
        if(fs.statSync(controllerPath).isFile()) {
            controller = require(controllerPath);
            exists = true;
        }
    } catch(ex) { }

    if(exists) {
        this.Controller = controller;
    }
    return exists;
};

module.exports = function(root, out) {
    return new StaticShock(root, out);
};