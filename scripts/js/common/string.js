////////////////////////////////////////
// String Manipulation Functions

// doc-map-initial-begin
function mapInitial(firstChar) {
    firstChar = firstChar.toUpperCase();
    // map character to latin version
    const charTable = [
        ["ÄÁÀÂÆààáâãäåæ", "A"],
        ["Çç", "C"],
        ["Ðð", "D"],
        ["ÉÈÊÈÉÊËèéêë", "E"],
        ["ÍÌÎÏìíîï", "I"],
        ["Ññ", "N"],
        ["ÕÖÓÒÔØòóôõöøœ", "O"],
        ["Š", "S"],
        ["ÜÚÙÛùúûü", "U"],
        ["Ýýÿ", "Y"],
        ["Žž", "Z"],
    ];
    for (var idx = 0; idx < charTable.length; idx++) {
        var re = new RegExp('[' + charTable[idx][0] + ']', 'i');
        var match = re.exec(firstChar);
        if (match) {
            firstChar = charTable[idx][1];
            break;
        }
    }
    return firstChar;
}
// doc-map-initial-end


// Capitalise a string
function capitalise(str)
{
	if (!str) return "" ;
	str = str.trim() ;
	if (str.length==0) return "" ;
	str = str.substring(0,1).toUpperCase() ;
	if (str.length>1) str = str + str.substr(2).toLowerCase() ;
	return str ;
}

// Split string into words and trim
function getparts(string)
{
  var parts = [] ;

  // TODO: collapse double spaces or remove empty parts
  parts = string.split(' ') ;
  for (var x=0; x<parts.length; x++) {
	parts[x] = parts[x].trim() ;
  }
  return parts ;
}
