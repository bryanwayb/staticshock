var DocumentTypes = {
	JSON: 0,
	Text: 1
};

var ServerTypes = {
	Apache22: 'apache2.2',
	Apache24: 'apache2.4'
};

var ConfigFileName = { };
ConfigFileName[ServerTypes.Apache22] = '.htaccess';
ConfigFileName[ServerTypes.Apache24] = '.htaccess';

var ServerConfigTypes = { };
ServerConfigTypes[ServerTypes.Apache22] = DocumentTypes.Text;
ServerConfigTypes[ServerTypes.Apache24] = DocumentTypes.Text;

var ServerNonRootConfig = { };
ServerNonRootConfig[ServerTypes.Apache22] = true;
ServerNonRootConfig[ServerTypes.Apache24] = true;

module.exports = {
	DocumentTypes: DocumentTypes,
	ServerConfigTypes: ServerConfigTypes,
	ConfigFileName: ConfigFileName,
	ServerTypes: ServerTypes,
	ServerNonRootConfig: ServerNonRootConfig
};