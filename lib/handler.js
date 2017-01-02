'use strict';

var htmlMinify = require('html-minifier').minify,
    CleanCSS = require('clean-css'),
    uglifyjs = require('uglifyjs'),
    less = require('less'),
    enums = require('./enums.js'),
    fs = require('fs'),
    functions = require('./functions.js');

function Handler(options) {
    this._options = options || { };
    if(options.optimize) {
        this._htmlMinify = {
            removeComments: true,
            collapseWhitespace: true,
            removeAttributeQuotes: true,
            useShortDoctype: true,
            minifyJS: true,
            minifyCSS: true
        };
    }
    this.Enums = enums;
    this.Functions = functions;
	this._fileCache = {};
}

Handler.prototype.MergeFiles = function(filetype, source, merge, destination) {
    var sourceContent, mergeContent;
    try {
        sourceContent = fs.readFileSync(source);
    }
    catch(ex) { }

    try {
        mergeContent = fs.readFileSync(merge);
    }
    catch(ex) { }

    var ret;
    if(sourceContent == null && mergeContent == null) {
        return;
    }
    else if(sourceContent == null) {
        ret = mergeContent;
    }
    else if(mergeContent == null) {
        ret = sourceContent;
    }
    else {
        if(filetype === enums.DocumentTypes.Text) {
            ret = sourceContent + '\n' + mergeContent;
        }
        else if(filetype === enums.DocumentTypes.JSON) {
            ret = JSON.parse(sourceContent);
            functions.mergeObjects(ret, JSON.parse(mergeContent));
            ret = JSON.stringify(ret);
        }
    }
    fs.writeFileSync(destination, ret);
};

Handler.prototype.HTML = function(html) {
    if(this._htmlMinify) {
		if(this._fileCache[html] == null) {
			this._fileCache[html] = htmlMinify(html, this._htmlMinify);
		}
		html = this._fileCache[html];
    }
    return html;
};

Handler.prototype.CSS = function(css) {
    if(this._options.optimize) {
		if(this._fileCache[css] == null) {
			this._fileCache[css] = new CleanCSS().minify(css).styles;
		}
		css = this._fileCache[css];
    }
    return css;
};

Handler.prototype.JS = function(js) {
    if(this._options.optimize) {
		if(this._fileCache[js] == null) {
			var ast = uglifyjs.parse(js.toString());
			ast.figure_out_scope();
			ast.compute_char_frequency();
			ast.mangle_names();
			var stream = uglifyjs.OutputStream({
				beautify: false
			});
			ast.print(stream);
			this._fileCache[js] = stream.toString();
		}
		js = this._fileCache[js];
    }
    return js;
};

Handler.prototype.LESS = function(input, path) {
    less.render(input.toString(), {
        filename: path
    }, function(e, output) {
        if(!e) {
            input = output.css;
        }
        else {
            throw e;
        }
    });
    return input;
};

module.exports = Handler;
