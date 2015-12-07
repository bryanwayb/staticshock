var fs = require('fs'),
	path = require('path');

module.exports = {
	rmdir: function rmdir(directory) {
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
};