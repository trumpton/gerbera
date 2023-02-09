/*GRB*
  Gerbera - https://gerbera.io/

  layout-audio-structured/import-audio.js - this file is part of Gerbera.

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

print ("IMPORT: layout-audio-structured/import-audio.js loaded") ;

// Virtual folders which split collections into alphabetic groups.
// Example for box type 9 to create a list of artist folders:
//
// --all--
// -0-9-
// -ABCDE-
//    A
//    B
//    C
//    ...
// -FGHIJ-
// -KLMNO-
// -PQRS-
// -T-           <-- tends to be big
// -UVWXYZ-
// -^&#'!-
function abcbox(stringtobox, boxtype, divchar) {
    var boxReplace = stringFromConfig('/import/scripting/virtual-layout/structured-layout/attribute::skip-chars', '');
    if (boxReplace !== '') {
        stringtobox = stringtobox.replace(RegExp('^[' + boxReplace + ']', 'i'), "");
    }
    // get ascii value of first character
    var firstChar = mapInitial(stringtobox.charAt(0));
    var intchar = firstChar.charCodeAt(0);
    // check for numbers
    if ( (intchar >= 48) && (intchar <= 57) )
    {
        return divchar + '0-9' + divchar;
    }
    // check for other characters
    if ( !((intchar >= 65) && (intchar <= 90)) )
    {
        return divchar + '^\&#\'' + divchar;
    }
    // all other characters are letters
    var boxwidth;
    // definition of box types, adjust to your own needs
    // as a start: the number is the same as the number of boxes, evenly spaced ... more or less.
    switch (boxtype)
    {
    case 1:
        boxwidth = new Array();
        boxwidth[0] = 26;                             // one large box of 26 letters
        break;
    case 2:
        boxwidth = new Array(13,13);              // two boxes of 13 letters
        break;
    case 3:
        boxwidth = new Array(8,9,9);              // and so on ...
        break;
    case 4:
        boxwidth = new Array(7,6,7,6);
        break;
    case 5:
        boxwidth = new Array(5,5,5,6,5);
        break;
    case 6:
        boxwidth = new Array(4,5,4,4,5,4);
        break;
    case 7:
        boxwidth = new Array(4,3,4,4,4,3,4);
        break;
    case 9:
        boxwidth = new Array(5,5,5,4,1,6);        // When T is a large box...
        break;
    case 13:
        boxwidth = new Array(2,2,2,2,2,2,2,2,2,2,2,2,2);
        break;
    case 26:
        boxwidth = new Array(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1);
        break;
    default:
        boxwidth = new Array(5,5,5,6,5);
        break;
    }

    // check for a total of 26 characters for all boxes
    var charttl = 0;
    for (var cb = 0; cb < boxwidth.length; cb++) {
        charttl = charttl + boxwidth[cb];
    }
    if (charttl != 26) {
        print("Error in box-definition, length is " + charttl + ". Check the file common.js" );
        // maybe an exit call here to stop processing the media ??
        return "???";
    }

    // declaration of some variables
    var boxnum = 0;                         // boxnumber start
    var sc = 65;                            // first ascii character (corresponds to 'A')
    var ec = sc + boxwidth[boxnum] - 1;     // last character of first box

    // loop that will define first and last character of the right box
    while (intchar > ec)
    {
        boxnum++;                         // next boxnumber
        sc = ec + 1;                      // next startchar
        ec = sc + boxwidth[boxnum] - 1;   // next endchar
    }

    // construction of output string
    var output = divchar;
    for (var i = sc; i <= ec; i++) {
        output = output + String.fromCharCode(i);
    }
    output = output + divchar;
    return output;
}

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

// doc-map-add-audio-structured-start
function addAudio(obj) {
    // first gather data
    var title = obj.title;
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
    if (obj.metaData[M_ALBUM] && obj.metaData[M_ALBUM][0]) {
        album = obj.metaData[M_ALBUM][0];
        desc = desc + ', ' + album;
    }

    if (desc) {
        desc = desc + ', ';
    }

    desc = desc + title;

    var date = '-Unknown-';
    var decade = '-Unknown-';
    if (obj.metaData[M_DATE] && obj.metaData[M_DATE][0]) {
        date = getYear(obj.metaData[M_DATE][0]);
        obj.metaData[M_UPNP_DATE] = [ date ];
        desc = desc + ', ' + date;
        decade = date.substring(0,3) + '0 - ' + String(10 * (parseInt(date.substring(0,3))) + 9) ;
    }

    var genre = 'Unknown';
    if (obj.metaData[M_GENRE] && obj.metaData[M_GENRE][0]) {
        genre = mapGenre(obj.metaData[M_GENRE][0]);
        desc = desc + ', ' + genre;
    }

    var description = '';
    if (!obj.metaData[M_DESCRIPTION] || !obj.metaData[M_DESCRIPTION][0]) {
        obj.metaData[M_DESCRIPTION] = [ desc ];
    } else {
        description = obj.metaData[M_DESCRIPTION][0];
    }

// uncomment this if you want to have track numbers in front of the title
// in album view

/*
    var track = '';
    if (obj.trackNumber > 0) {
        track = '' + obj.trackNumber;
        if (trackNumber < 10)
        {
            track = '0' + track;
        }
        track = track + ' ';
    }
*/
    // comment the following line out if you uncomment the stuff above  :)
    var track = '';


    // Album

    // Extra code for correct display of albums with various artists (usually collections)
    var tracktitle = track + title;
    var album_artist = album + ' - ' + artist.join(' / ');
    if (description) {
        if (description.toUpperCase() === 'VARIOUS') {
            album_artist = album + ' - Various';
            tracktitle = tracktitle + ' - ' + artist.join(' / ');
        }
    }

    const boxConfig = {
        album: intFromConfig('/import/scripting/virtual-layout/structured-layout/attribute::album-box', 6),
        artist: intFromConfig('/import/scripting/virtual-layout/structured-layout/attribute::artist-box', 9),
        genre: intFromConfig('/import/scripting/virtual-layout/structured-layout/attribute::genre-box', 6),
        track: intFromConfig('/import/scripting/virtual-layout/structured-layout/attribute::track-box', 6),
        divChar: stringFromConfig('/import/scripting/virtual-layout/structured-layout/attribute::div-char', '-'),
    };
    boxConfig.singleLetterBoxSize = 2 * boxConfig.divChar.length + 1;

    const chain = {
        allArtists: { title: '-Artist-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER, metaData: [] },
        allGenres: { title: '-Genre-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allAlbums: { title: '-Album-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allTracks: { title: '-Track-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allYears: { title: '-Year-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allFull: { title: 'All - full name', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        abc: { title: abcbox(album, boxConfig.album, boxConfig.divChar), objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        init: { title: mapInitial(album.charAt(0)), objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        artist: { title: artist[0], objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_ARTIST, metaData: [], res: obj.res, aux: obj.aux, refID: obj.id },
        album_artist: { title: album_artist, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_ALBUM, metaData: [], res: obj.res, aux: obj.aux, refID: obj.id },
        album: { title: album, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_ALBUM, metaData: [], res: obj.res, aux: obj.aux, refID: obj.id },
        entryAll: { title: '-all-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        genre: { title: genre, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_GENRE, metaData: [], res: obj.res, aux: obj.aux, refID: obj.id },
        decade: { title: decade, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        date: { title: date, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER }
    };

    chain.allArtists.metaData[M_CONTENT_CLASS] = [ UPNP_CLASS_AUDIO_ITEM ];
    chain.album.metaData[M_ARTIST] = [ album_artist ];
    chain.album.metaData[M_ALBUMARTIST] = [ album_artist ];
    chain.album.metaData[M_GENRE] = [ genre ];
    chain.album.metaData[M_DATE] = obj.metaData[M_DATE];
    chain.album.metaData[M_UPNP_DATE] = obj.metaData[M_UPNP_DATE];
    chain.album.metaData[M_ALBUM] = [ album ];
    chain.artist.metaData[M_ARTIST] = artist;
    chain.artist.metaData[M_ALBUMARTIST] = artist;
    chain.album_artist.metaData[M_ARTIST] = [ album_artist ];
    chain.album_artist.metaData[M_ALBUMARTIST] = [ album_artist ];
    var isSingleCharBox = boxConfig.singleLetterBoxSize >= chain.abc.title.length;

    obj.title = tracktitle;
    var container = addContainerTree(isSingleCharBox ? [chain.allAlbums, chain.abc, chain.album_artist] : [chain.allAlbums, chain.abc, chain.init, chain.album_artist]);
    addCdsObject(obj, container);

    container = addContainerTree([chain.allAlbums, chain.abc, chain.entryAll, chain.album_artist]);
    addCdsObject(obj, container);

    chain.entryAll.title = '--all--';
    container = addContainerTree([chain.allAlbums, chain.entryAll, chain.album_artist]);
    addCdsObject(obj, container);

    // Artist
    obj.title = title + ' (' + album + ', ' + date + ')';
    const artCnt = artist.length;
    var i;
    for (i = 0; i < artCnt; i++) {
        chain.artist.title = artist[i];
        chain.artist.searchable = true;
        container = addContainerTree([chain.allArtists, chain.entryAll, chain.artist]);
        addCdsObject(obj, container);
    }
    chain.artist.searchable = false;

    for (i = 0; i < artCnt; i++) {
        chain.abc.title = abcbox(artist[i], boxConfig.artist, boxConfig.divChar);
        isSingleCharBox = boxConfig.singleLetterBoxSize >= chain.abc.title.length;
        chain.entryAll.title = '-all-';
        container = addContainerTree([chain.allArtists, chain.abc, chain.entryAll, chain.artist]);
        addCdsObject(obj, container);
    }

    obj.title = title + ' (' + album + ', ' + date + ')';
    for (i = 0; i < artCnt; i++) {
        chain.init.title = mapInitial(artist[i].charAt(0));
        chain.entryAll.upnpclass = UPNP_CLASS_CONTAINER_MUSIC_ARTIST;
        container = addContainerTree(isSingleCharBox ? [chain.allArtists, chain.abc, chain.artist, chain.entryAll] : [chain.allArtists, chain.abc, chain.init, chain.artist, chain.entryAll]);
        addCdsObject(obj, container);
    }

    obj.title = tracktitle;
    chain.album.title = album + ' (' + date + ')';
    chain.album.searchable = true;
    container = addContainerTree(isSingleCharBox ? [chain.allArtists, chain.abc, chain.artist, chain.album] : [chain.allArtists, chain.abc, chain.init, chain.artist, chain.album]);
    addCdsObject(obj, container);
    chain.album.searchable = false;

    // Genre

    obj.title = title + ' - ' + artist_full;
    chain.entryAll.title = '--all--';
    chain.entryAll.upnpclass = UPNP_CLASS_CONTAINER_MUSIC_GENRE;
    if (obj.metaData[M_GENRE]) {
        for (var oneGenre in obj.metaData[M_GENRE]) {
            chain.genre.title = obj.metaData[M_GENRE][oneGenre];
            chain.genre.metaData[M_GENRE] = [ oneGenre ];
            container = addContainerTree([chain.allGenres, chain.genre, chain.entryAll]);
            addCdsObject(obj, container);
        }
    }

    for (i = 0; i < artCnt; i++) {
        chain.abc.title = abcbox(artist[i], boxConfig.genre, boxConfig.divChar);
        isSingleCharBox = boxConfig.singleLetterBoxSize >= chain.abc.title.length;
        chain.album_artist.searchable = true;
        if (obj.metaData[M_GENRE]) {
            for (var oneGenre in obj.metaData[M_GENRE]) {
                chain.genre.title = obj.metaData[M_GENRE][oneGenre];
                chain.genre.metaData[M_GENRE] = [ oneGenre ];
                container = addContainerTree(isSingleCharBox ? [chain.allGenres, chain.genre, chain.abc, chain.album_artist] : [chain.allGenres, chain.genre, chain.abc, chain.init, chain.album_artist]);
                addCdsObject(obj, container);
            }
        }
    }
    chain.album_artist.searchable = false;
        

    // Tracks

    obj.title = title + ' - ' + artist.join(' / ') + ' (' + album + ', ' + date + ')';
    chain.abc.title = abcbox(title, boxConfig.track, boxConfig.divChar);
    isSingleCharBox = boxConfig.singleLetterBoxSize >= chain.abc.title.length;
    chain.init.title = mapInitial(title.charAt(0));
    chain.init.upnpclass = UPNP_CLASS_CONTAINER_MUSIC_ARTIST;
    container = addContainerTree(isSingleCharBox ? [chain.allTracks, chain.abc] : [chain.allTracks, chain.abc, chain.init]);
    addCdsObject(obj, container);

    obj.title = title + ' - ' + artist_full;
    chain.entryAll.upnpclass = UPNP_CLASS_CONTAINER;
    container = addContainerTree([chain.allTracks, chain.entryAll]);
    addCdsObject(obj, container);

    // Sort years into decades

    chain.entryAll.title = '-all-';
    container = addContainerTree([chain.allYears, chain.decade, chain.entryAll]);
    addCdsObject(obj, container);

    chain.entryAll.upnpclass = UPNP_CLASS_CONTAINER_MUSIC_ARTIST;
    container = addContainerTree([chain.allYears, chain.decade, chain.date, chain.entryAll]);
    addCdsObject(obj, container);

    obj.title = tracktitle;
    chain.album.title = album;
    chain.album.searchable = true;
    container = addContainerTree([chain.allYears, chain.decade, chain.date, chain.artist, chain.album]);
    addCdsObject(obj, container);
}
// doc-map-add-audio-structured-end


