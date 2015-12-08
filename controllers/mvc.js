'use strict';

var path = require('path'),
	jshtml = require('js-html');

module.exports = function(instance, handler, options) {
    return {
        PostBuild: function() {
            if(options.isRoot) {
                handler.MergeFiles(handler.Enums.ServerConfigTypes[options.server], path.resolve(__dirname, '../docs/mvc/' + handler.Enums.ConfigFileName[options.server]), path.join(options.root, handler.Enums.ConfigFileName[options.server]), path.join(options.out, handler.Enums.ConfigFileName[options.server]));
            }
        },
        '.html': function(param) {
            param.content = handler.HTML(param.content);
        },
        '.htm': function(param) {
            param.content = handler.HTML(param.content);
        },
        '.css': function(param) {
            param.content = handler.CSS(param.content);
        },
        '.js': function(param) {
            param.content = handler.JS(param.content);
        },
        '.less': function(param) {
            param.content = handler.LESS(param.content);
            param.output = path.join(path.dirname(param.output), path.basename(param.output, '.less') + '.css');
        },
        '.jshtml': function(param) {
            var viewContext = {
                layout: path.resolve(options.relative, './views/private/_layout.jshtml'),
                rendered: ''
            };

            var opts = {
                context: {
                    controller: {
                        partial: function(partial) {
                            return instance.buildFile(path.resolve(path.dirname(param.source), partial)).content;
                        }
                    },
                    view: viewContext
                },
                filename: param.output,
                syntaxCheck: true,
                format: true,
                mangle: true,
                optimize: true,
                minify: true,
                isolate: true
            };

            var script = jshtml.script(param.content, opts);
            if(instance._buildFileTree.length <= 1) {
                viewContext.rendered = script.render();
                script = jshtml.script(opts);

                script.setScriptFile(viewContext.layout);
                opts.context.controller.partial = function(partial) {
                    return instance.buildFile(path.resolve(path.dirname(viewContext.layout), partial)).content;
                };
                opts.filename = viewContext.layout;
            }
            param.content = handler.HTML(script.render());
            param.output = path.join(path.dirname(param.output), path.basename(param.output, '.jshtml') + '.html');
        }
    };
};