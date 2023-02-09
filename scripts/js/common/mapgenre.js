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

function mapGenre(genre) {
    const genreConfig = config['/import/scripting/virtual-layout/genre-map/genre'];
    if (genreConfig) {
        const genreNames = Object.getOwnPropertyNames(genreConfig);
        for (var idx = 0; idx < genreNames.length; idx++) {
            var re = new RegExp('(' + genreNames[idx] + ')', 'i');
            var match = re.exec(genre);
            if (match) {
                genre = genreConfig[genreNames[idx]];
                break;
            }
        }
    }
    return genre;
}
