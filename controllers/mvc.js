'use strict';

var path = require('path'),
    jshtml = require('js-html'),
    fs = require('fs'),
    minify = require('html-minifier').minify,
    uglifyjs = require('uglifyjs'),
    CleanCSS = require('clean-css'),
    less = require('less');

function renderPartial(dir, partial, global, parent) {
    var file = path.resolve(dir, partial);
    var child = { };
    var script = jshtml.script({
        context: {
            jshtml: jshtml,
            controller: {
                partial: function(partial) {
                    return renderPartial(path.dirname(file), partial, global, child).render();
                }
            },
            global: global,
            parent: parent,
            child: child
        },
        syntaxCheck: true,
        format: true,
        mangle: true,
        optimize: true,
        minify: true,
        isolate: true
    });
    script.setScriptFile(file);
    return script;
}

var docsDir = path.resolve(__dirname, '../docs/mvc'),
    htmlMinifyOptions = {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true,
        useShortDoctype: true,
        minifyJS: true,
        minifyCSS: true
    };
var serverPostBuild = {
    apache2: function(out) {
        fs.createReadStream(path.join(docsDir, '.htaccess')).pipe(fs.createWriteStream(path.join(out, '.htaccess')));
    }
};

module.exports = {
    _postBuild: function(outputDirectory, options) {
        if(options) {
            var serverFunc = serverPostBuild[options.server || 'apache2'];
            if(serverFunc) {
                serverFunc(outputDirectory);
            }
        }
    },
    '.jshtml': function(params) {
        params.destination = path.join(path.dirname(params.destination), path.basename(params.destination, '.jshtml') + '.html');
        var parentContext = {
            layout: path.resolve(params.rootDirectory, './views/private/_layout.jshtml'),
            rendered: ''
        };

        var globalContext = { };
        parentContext.rendered = renderPartial(__dirname, params.source, globalContext, parentContext).render();

        var ret = renderPartial(__dirname, parentContext.layout, globalContext, parentContext).render();
        if(!params.debug) {
            ret = minify(ret, htmlMinifyOptions);
        }

        return ret;
    },
    '.html': function(params) {
        var ret = fs.readFileSync(params.source).toString();
        if(!params.debug) {
            ret = minify(ret, htmlMinifyOptions);
        }
        return ret;
    },
    '.htm': function(params) {
        this['.html'](params);
    },
    '.js': function(params) {
        var ret = fs.readFileSync(params.source).toString();
        if(!params.debug) {
            var ast = uglifyjs.parse(ret);
            ast.figure_out_scope();
            ret = ast.transform(uglifyjs.Compressor()).print_to_string();
        }
        return ret;
    },
    '.css': function(params) {
        var ret = fs.readFileSync(params.source).toString();
        if(!params.debug) {
            ret = new CleanCSS().minify(ret).styles;
        }
        return ret;
    },
    '.less': function(params) {
        var ret;
        less.render((ret = fs.readFileSync(params.source).toString()), {
            paths: [ path.dirname(params.source) ],
            filename: params.source,
            compress: !params.debug
        }, function(e, output) {
            if(!e) {
                ret = output.css;
                params.destination = path.join(path.dirname(params.destination), path.basename(params.destination, '.less') + '.css');
            }
        });
        return ret;
    }
};