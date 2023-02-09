/*GRB*
  Gerbera - https://gerbera.io/

  import-trailer.js - this file is part of Gerbera.

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

print ("IMPORT: import-trailer.js loaded") ;

// doc-add-trailer-begin
function addTrailer(obj) {
    const chain = {
        trailerRoot: { title: 'Online Services', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        appleTrailers: { title: 'Apple Trailers', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allTrailers: { title: 'All Trailers', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },

        allGenres: { title: 'Genres', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        genre: { title: 'Unknown', objectType: OBJECT_TYPE_CONTAINER, searchable: true, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_GENRE, metaData: [] },

        relDate: { title: 'Release Date', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        postDate: { title: 'Post Date', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER, metaData: [] },
        date: { title: 'Unbekannt', objectType: OBJECT_TYPE_CONTAINER, searchable: true, upnpclass: UPNP_CLASS_CONTAINER, metaData: [] }
    };
    // First we will add the item to the 'All Trailers' container, so
    // that we get a nice long playlist:

    addCdsObject(obj, addContainerTree([chain.trailerRoot , chain.appleTrailers, chain.allTrailers]));

    // We also want to sort the trailers by genre, however we need to
    // take some extra care here: the genre property here is a comma
    // separated value list, so one trailer can have several matching
    // genres that will be returned as one string. We will split that
    // string and create individual genre containers.

    if (obj.metaData[M_GENRE] && obj.metaData[M_GENRE][0]) {
        var genre = obj.metaData[M_GENRE][0];

        // A genre string "Science Fiction, Thriller" will be split to
        // "Science Fiction" and "Thriller" respectively.

        const genres = genre.split(', ');
        for (var i = 0; i < genres.length; i++) {
            chain.genre.title = genres[i];
            chain.genre.metaData[M_GENRE] = [ genres[i] ];
            addCdsObject(obj, addContainerTree([chain.trailerRoot , chain.appleTrailers, chain.allGenres, chain.genre]));
        }
    }

    // The release date is offered in a YYYY-MM-DD format, we won't do
    // too much extra checking regading validity, however we only want
    // to group the trailers by year and month:

    if (obj.metaData[M_DATE] && obj.metaData[M_DATE][0]) {
        var reldate = obj.metaData[M_DATE][0];
        if (reldate.length >= 7) {
            chain.date.title = reldate.slice(0, 7);
            chain.date.metaData[M_DATE] = [ reldate.slice(0, 7) ];
            chain.date.metaData[M_UPNP_DATE] = [ reldate.slice(0, 7) ];
            addCdsObject(obj, addContainerTree([chain.trailerRoot , chain.appleTrailers, chain.relDate, chain.date]));
        }
    }

    // We also want to group the trailers by the date when they were
    // originally posted, the post date is available via the aux
    // array. Similar to the release date, we will cut off the day and
    // create our containres in the YYYY-MM format.

    var postdate = obj.aux[APPLE_TRAILERS_AUXDATA_POST_DATE];
    if (postdate && postdate.length >= 7) {
        chain.date.title = postdate.slice(0, 7);
        chain.date.metaData[M_DATE] = [ postdate.slice(0, 7) ];
        chain.date.metaData[M_UPNP_DATE] = [ postdate.slice(0, 7) ];
        addCdsObject(obj, addContainerTree([chain.trailerRoot , chain.appleTrailers, chain.postDate, chain.date]));
    }
}
// doc-add-trailer-end
