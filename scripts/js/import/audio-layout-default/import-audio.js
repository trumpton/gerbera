/*GRB*
  Gerbera - https://gerbera.io/

  import-audio.js - this file is part of Gerbera.

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

print ("IMPORT: import-audio.js loaded") ;

// doc-add-audio-begin
function addAudio(obj) {
    // Note the difference between obj.title and obj.metaData[M_TITLE] -
    // while object.title will originally be set to the file name,
    // obj.metaData[M_TITLE] will contain the parsed title - in this
    // particular example the ID3 title of an MP3.
    var title = obj.title;

    // First we will gather all the metadata that is provided by our
    // object, of course it is possible that some fields are empty -
    // we will have to check that to make sure that we handle this
    // case correctly.
    if (obj.metaData[M_TITLE] && obj.metaData[M_TITLE][0]) {
        title = obj.metaData[M_TITLE][0];
    }

    var desc = '';
    var artist = [ 'Unknown' ];
    var artist_full = null;
    if (obj.metaData[M_ARTIST] && obj.metaData[M_ARTIST][0]) {
        artist = obj.metaData[M_ARTIST];
        artist_full = artist.join(' / ');
        desc = artist_full;
    }

    var album = 'Unknown';
    var album_full = null;
    if (obj.metaData[M_ALBUM] && obj.metaData[M_ALBUM][0]) {
        album = obj.metaData[M_ALBUM][0];
        desc = desc + ', ' + album;
        album_full = album;
    }

    if (desc) {
        desc = desc + ', ';
    }
    desc = desc + title;

    var date = 'Unknown';
    if (obj.metaData[M_DATE] && obj.metaData[M_DATE][0]) {
        date = getYear(obj.metaData[M_DATE][0]);
        obj.metaData[M_UPNP_DATE] = [ date ];
        desc = desc + ', ' + date;
    }

    var genre = 'Unknown';
    if (obj.metaData[M_GENRE] && obj.metaData[M_GENRE][0]) {
        genre = mapGenre(obj.metaData[M_GENRE].join(' '));
        desc = desc + ', ' + genre;
    }

    if (!obj.metaData[M_DESCRIPTION] || !obj.metaData[M_DESCRIPTION][0]) {
        obj.description = desc;
    }

    var composer = 'None';
    if (obj.metaData[M_COMPOSER] && obj.metaData[M_COMPOSER][0]) {
        composer = obj.metaData[M_COMPOSER].join(' / ');
    }

/*
    var conductor = 'None';
    if (obj.metaData[M_CONDUCTOR] && obj.metaData[M_CONDUCTOR][0]) {
        conductor = obj.metaData[M_CONDUCTOR].join(' / ');
    }

    var orchestra = 'None';
    if (obj.metaData[M_ORCHESTRA] && obj.metaData[M_ORCHESTRA][0]) {
        orchestra = obj.metaData[M_ORCHESTRA].join(' / ');
    }
*/
    // uncomment this if you want to have track numbers in front of the title
    // in album view
/*
    var track = '';
    if (obj.trackNumber > 0) {
        track = trackNumber;
        if (track.length == 1) {
            track = '0' + track;
        }
        track = track + ' ';
    }
*/
    // comment the following line out if you uncomment the stuff above  :)
    var track = '';

// uncomment this if you want to have channel numbers in front of the title
/*
    var channels = obj.res[R_NRAUDIOCHANNELS];
    if (channels) {
        if (channels === "1") {
            track = track + '[MONO]';
        } else if (channels === "2") {
            track = track + '[STEREO]';
        } else {
            track = track + '[MULTI]';
        }
    }
*/

    // We finally gathered all data that we need, so let's create a
    // nice layout for our audio files.

    obj.title = title;

    // The UPnP class argument to addCdsObject() is optional, if it is
    // not supplied the default UPnP class will be used. However, it
    // is suggested to correctly set UPnP classes of containers and
    // objects - this information may be used by some renderers to
    // identify the type of the container and present the content in a
    // different manner.

    // Remember, the server will sort all items by ID3 track if the
    // container class is set to UPNP_CLASS_CONTAINER_MUSIC_ALBUM.

    const chain = {
        audio: { title: 'Audio', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER, metaData: [] },
        allAudio: { title: 'All Audio', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allArtists: { title: 'Artists', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allGenres: { title: 'Genres', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allAlbums: { title: 'Albums', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allYears: { title: 'Year', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allComposers: { title: 'Composers', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allSongs: { title: 'All Songs', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allFull: { title: 'All - full name', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        artist: { searchable: false, title: artist[0], objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_ARTIST, metaData: [], res: obj.res, aux: obj.aux, refID: obj.id },
        album: { searchable: false, title: album, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_ALBUM, metaData: [], res: obj.res, aux: obj.aux, refID: obj.id },
        genre: { title: genre, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_GENRE, metaData: [], res: obj.res, aux: obj.aux, refID: obj.id },
        year: { title: date, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER, metaData: [], res: obj.res, aux: obj.aux, refID: obj.id },
        composer: { title: composer, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_COMPOSER, metaData: [], res: obj.res, aux: obj.aux, refID: obj.id },
    };

    chain.audio.metaData[M_CONTENT_CLASS] = [ UPNP_CLASS_AUDIO_ITEM ];
    chain.album.metaData[M_ARTIST] = artist;
    chain.album.metaData[M_ALBUMARTIST] = artist;
    chain.album.metaData[M_GENRE] = [ genre ];
    chain.album.metaData[M_DATE] = obj.metaData[M_DATE];
    chain.album.metaData[M_UPNP_DATE] = obj.metaData[M_UPNP_DATE];
    chain.album.metaData[M_ALBUM] = [ album ];
    chain.artist.metaData[M_ARTIST] = artist;
    chain.artist.metaData[M_ALBUMARTIST] = artist;
    chain.genre.metaData[M_GENRE] = [ genre ];
    chain.year.metaData[M_DATE] = [ date ];
    chain.year.metaData[M_UPNP_DATE] = [ date ];
    chain.composer.metaData[M_COMPOSER] = [ composer ];

    var container = addContainerTree([chain.audio, chain.allAudio]);
    addCdsObject(obj, container);

    container = addContainerTree([chain.audio, chain.allArtists, chain.artist, chain.allSongs]);
    addCdsObject(obj, container);

    var temp = '';
    if (artist_full) {
        temp = artist_full;
    }

    if (album_full) {
        temp = temp + ' - ' + album_full + ' - ';
    } else {
        temp = temp + ' - ';
    }

    obj.title = temp + title;
    container = addContainerTree([chain.audio, chain.allFull]);
    addCdsObject(obj, container);

    const artCnt = artist.length;
    var i;
    for (i = 0; i < artCnt; i++) {
        chain.artist.title = artist[i];
        container = addContainerTree([chain.audio, chain.allArtists, chain.artist, chain.allFull]);
        addCdsObject(obj, container);
    }

    obj.title = track + title;
    for (i = 0; i < artCnt; i++) {
        chain.artist.title = artist[i];
        chain.artist.searchable = true;
        container = addContainerTree([chain.audio, chain.allArtists, chain.artist, chain.album]);
        addCdsObject(obj, container);
    }

    chain.album.searchable = true;
    container = addContainerTree([chain.audio, chain.allAlbums, chain.album]);
    obj.title = track + title;
    addCdsObject(obj, container);

    chain.genre.searchable = true;
    if (obj.metaData[M_GENRE]) {
        for (var oneGenre in obj.metaData[M_GENRE]) {
            chain.genre.title = obj.metaData[M_GENRE][oneGenre];
            chain.genre.metaData[M_GENRE] = [ oneGenre ];
            container = addContainerTree([chain.audio, chain.allGenres, chain.genre]);
            addCdsObject(obj, container);
        }
    }

    container = addContainerTree([chain.audio, chain.allYears, chain.year]);
    addCdsObject(obj, container);

    container = addContainerTree([chain.audio, chain.allComposers, chain.composer]);
    addCdsObject(obj, container);
}
// doc-add-audio-end
