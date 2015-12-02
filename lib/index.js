'use strict';

var jshtml = require('js-html'),
    fs = require('fs'),
    path = require('path'),
    os = require('os');

var fsRoot = (os.platform === 'win32') ? process.cwd().split(path.sep)[0] : '/';

function mkdir(directory) {
    var sections = directory.split(path.sep);
    var current = path.isAbsolute(directory) ? fsRoot : '';

    for(var si = 0; si < sections.length; si++) {
        current = path.join(current, sections[si]);
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
    catch(ex) {
        console.warn('Could not read ' + directory);
    }

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
    this._ignoreList = [ ];

    try {
        var ignoreFileContent = fs.readFileSync(path.join(root, './.ignore'));
        if(ignoreFileContent) {
            ignoreFileContent = ignoreFileContent.toString().split('\n');
            for(var i = 0; i < ignoreFileContent.length; i++) {
                this._ignoreList.push(new RegExp(ignoreFileContent[i]));
            }
        }
    }
    catch(ex) { } // No .ignore file
}

StaticShock.prototype.isIgnored = function(file) {
    for(var i = 0; i < this._ignoreList.length; i++) {
        if(this._ignoreList[i].test(file)) {
            return true;
        }
    }
    return false;
};

StaticShock.prototype.controller = function(jshtml, file) {
    var script = jshtml.script();
    script.setScriptFile(file);
    return script;
};

StaticShock.prototype.setController = function(file) {
    try {
        this.controller = require(file);
    }
    catch(ex) {
        return false;
    }
    return true;
};

StaticShock.prototype.build = function() {
    rmdir(this._out);

    var self = this;
    getFilesInDirectory(this._root, function(file) {
        var rel = path.relative(self._root, file);
        if(self.isIgnored(rel)) {
            return;
        }

        mkdir(path.join(self._out, path.dirname(rel)));
        if(path.extname(file) === '.jshtml') {
            var script = self.controller(jshtml, file);
            if(script) {
                fs.writeFileSync(path.join(self._out, path.dirname(rel), path.basename(rel, '.jshtml') + '.html'), script.render());
            }
        }
        else {
            fs.createReadStream(file).pipe(fs.createWriteStream(path.join(self._out, rel)));
        }
    });
};

module.exports = function(root, out) {
    return new StaticShock(root, out);
};