/*GRB*
  Gerbera - https://gerbera.io/

  common.js - this file is part of Gerbera.

  Copyright (C) 2018-2022 Gerbera Contributors

  Gerbera is free software; you can redistribute it and/or modify
  it under the terms of the GNU General Public License version 2
  as published by the Free Software Foundation.

  Gerbera is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with Gerbera.  If not, see <http://www.gnu.org/licenses/>.

  $Id$
*/


// Return [a], [ab], [abc] based on the given word
function abcsearch(str, length)
{
	if (!str || !length || str.length < length) return null ;

	var result="[" ;
	for (var x=0; x<length; x++) {
		var ch = mapInitial(str.charAt(x)).toLowerCase() ;
		if (ch.match(/[a-z0-9]/)) {
	            result = result + ch ;
	        }
	}
	result = result + "]" ;

	if (result.length == length+2) return result ;
	else return null ;
}
