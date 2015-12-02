'use strict';

var path = require('path');

function renderPartial(jshtml, dir, partial, global, parent) {
    var file = path.resolve(dir, partial);
    var child = { };
    var script = jshtml.script({
        context: {
            jshtml: jshtml,
            controller: {
                partial: function(partial) {
                    return renderPartial(jshtml, path.dirname(file), partial, global, child).render();
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

module.exports = function(jshtml, file) {
    var parentContext = {
        layout: './views/private/_layout.jshtml',
        rendered: ''
    };
    var globalContext = { };
    var partial = renderPartial(jshtml, __dirname, file, globalContext, parentContext);
    parentContext.rendered = partial.render();
    return renderPartial(jshtml, __dirname, parentContext.layout, globalContext, parentContext);
};