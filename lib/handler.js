'use strict';

var htmlMinify = require('html-minifier').minify,
    CleanCSS = require('clean-css'),
    uglifyjs = require('uglifyjs'),
    less = require('less');

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
}

Handler.prototype.HTML = function(html) {
    if(!this._htmlMinify) {
        html = htmlMinify(html, this._htmlMinify);
    }
    return html;
};

Handler.prototype.CSS = function(css) {
    if(!this._options.optimize) {
        css = new CleanCSS().minify(css).styles;
    }
    return css;
};

Handler.prototype.JS = function(js) {
    if(this._options.optimize) {
        var ast = uglifyjs.parse(js);
        ast.figure_out_scope();
        js = ast.transform(uglifyjs.Compressor()).print_to_string();
    }
    return js;
};

Handler.prototype.LESS = function(input) {
    less.render(input, {
        compress: !this._options.optimize
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