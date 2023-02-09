/*GRB*
  Gerbera - https://gerbera.io/

  config.js - this file is part of Gerbera.

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

// doc-map-int-config-begin
function intFromConfig(entry, defValue) {
    if (entry in config) {
        var value = config[entry];
        return parseInt(value.toString());
    }
    return defValue;
}
// doc-map-int-config-end

// doc-map-string-config-begin
function stringFromConfig(entry, defValue) {
    if (entry in config) {
        var value = config[entry];
        return value.toString();
    }
    return defValue;
}
// doc-map-string-config-end

