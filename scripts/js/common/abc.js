/*GRB*
  Gerbera - https://gerbera.io/

  abc.js - this file is part of Gerbera.

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

// Return [abc], [def] etc. 
function abc(str) {

  if (!str) {
    return "" ;
  }

  switch (mapInitial(str.charAt(0)).toLowerCase()) {
  case "0": case "1": case "2": case "3": case "4":
  case "5": case "6": case "7": case "8": case "9":
      return "[0-9]"; break;
  case "a": case "b": case "c":
      return "[abc]"; break;
  case "d": case "e": case "f":
      return "[def]"; break;
  case "g": case "h": case "i":
      return "[ghi]"; break;
  case "j": case "k": case "l":
      return "[jkl]"; break;
  case "m": case "n": case "o":
      return "[mno]"; break;
  case "p": case "q": case "r":
      return "[pqr]"; break;
  case "s": case "t": case "u":
      return "[stu]"; break;
  case "v": case "w": case "x":
      return "[vwx]"; break;
  case "y": case "z": default:
      return "[yz!]"; break;
  }

}
