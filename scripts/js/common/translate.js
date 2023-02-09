/*GRB*
  Gerbera - https://gerbera.io/

  translate.js - this file is part of Gerbera.

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

//
// Stub functions for now - to be replaced by a javascript translate
// function, or by a builtin function (so the rest of gerbera also
// benefits).
//
// The function needs to load language files from a config.xml folder
// and have this configured / tailored by a selected-language attribute
//

function _translate(x, t)
{
    return x ;
}

function tr(x)
{
    return _translate(x, "system") ;
}

function tr_genre(x)
{
    return _translate(x, "genre") ;
}
