//
// gerbera import file, modified to provide more flexibility
//

function addAudio(obj) {
    var desc = "";
    var artist_full;
    var album_full;
    
    // first gather data
    var title = obj.meta[M_TITLE];
    if (!title) {
	title = obj.title;
    }

    print("ADBG: " + JSON.stringify(obj)) ;
    
    var artist = obj.meta[M_ARTIST];
    if (!artist) {
	artist = tr("Unknown");
	artist_full = null;
    } else {
	artist = artist ;
	desc = artist_full;
	artist_full = artist ;
    }
    
    var album = obj.meta[M_ALBUM];
    if (!album) {
	album = tr("Unknown");
	album_full = null;
    } else {
	album = album ;
	desc = desc + ", " + album;
	album_full = album;
    }
    
    if (desc) {
	desc = desc + ", ";
    }
    desc = desc + title;
    
    var year = obj.meta[M_DATE];
    var decade = tr("Unknown") ;
    if (!year) {
	year = tr("Unknown");
    } else {
	year = getYear(year);
	if (year.length>3) {
	    decade = year.charAt(2) + "0s" ;
	}
	desc = desc + ", " + year;
    }
    
    var genre = obj.meta[M_GENRE];
    if (!genre) {
	genre = tr("Unknown");
    } else {
	genre = tr_genre(genre) ;
	desc = desc + ", " + genre;
    }
    
    var description = obj.meta[M_DESCRIPTION];
    if (!description) {
	obj.meta[M_DESCRIPTION] = desc;
    }
    
    var track = obj.meta[M_TRACKNUMBER];
    
    if (!track) {
	track = "000";
    } else {
	var j;
	for (j = 3 - track.length; j > 0; j--) {
	    track = "0" + track;
	}
    }
    
    obj.title = title ;
    obj.artist = artist ;
    
    var objwithtrackno = copyObject(obj) ;
    objwithtrackno.title = track + " - " + title ;
    objwithtrackno.meta[M_TITLE] = objwithtrackno.title ;
    
    var objwithartist = copyObject(obj) ;
    objwithartist.title = artist + " - " + track + " - " + title ;
    objwithartist.meta[M_TITLE] = objwithartist.title ;
    
    var objwithalbum = copyObject(obj) ;
    objwithalbum.title = album + " - " + track + " - " + title ;
    objwithalbum.meta[M_TITLE] = objwithalbum.title ;
    
    var chain ;
    
    //////////////////////////////////
    // Get Folder Labels and Flags

    var grouplabel = tr("Music") ;
    var albumlabel = tr("Album") ;
    var allalbumslabel = tr("- All Albums -") ;
    var artistlabel = tr("Artist") ;
    var allartistslabel = tr("- All Artists -") ;
    var tracklabel = tr("Track") ;
    var alltrackslabel = tr("- All Tracks -") ;
    var includeyear = true ;
    var includeyearexpand = true ;
    var includegenre = true ;
    
    //////////////////////////////////
    // Containers
    
    const chain = {
	
	// Generic

	All: { title: tr('- All -'),
	       objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
	Search: { title: tr('- Search -'),
		  objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
	// Audio Group

	GroupLabel: { title: grouplabel,
		      objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
	// Year
	
        YearLabel: { title: tr('Year'),
		     objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
	Decade: { title: decade,
		  objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
        TrackYear: { title: year,
		     objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
	// Genre

	GenreLabel: { title: tr('Genre'),
		      objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
        TrackGenre: { title: tr(genre),
		      objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
	// Album / Volume
	
	AlbumLabel: { title: albumlabel,
		      objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
	AllAlbumsLabel: { title: '- ' + tr(allalbumslabel) + ' -',
			  objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
	AlbumTitle: { title: album,
		      objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
	AlbumTitleArtist: { title: album + " (" + artist + ")",
			    objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
	AlbumABC: { title: abc(album),
		    objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
	// Artist / Author

	ArtistLabel: { title: artistlabel,
		       objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
	AllArtistsLabel: { title: '- ' + tr(allartistslabel) + ' -',
			   objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
	ArtistName: { title: artist,
		      objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
	ArtistNameAlbum: { title: artist + " - " + album,
			   objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
	
	ArtistABC: { title: abc(artist),
		     objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },

	// Track
	AllTracksLabel: { title: '- ' + tr(alltrackslabel) + ' -',
			  objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER }
	
    };
    
    //////////////////////////////////
    // Years
    
    var container ;

    if (includeyear) {
	addCdsObject(obj, addContainerTree([chain.GroupLabel, chain.YearLabel, chain.All, chain.TrackYear]))  ;
	addCdsObject(obj, addContainerTree([chain.GroupLabel, chain.YearLabel, chain.Decade, chain.All])) ;
	addCdsObject(obj, addContainerTree([chain.GroupLabel, chain.YearLabel, chain.Decade, chain.TrackYear])) ;
	if (includeyearexpand) {
	    addCdsObject(objwithalbum, addContainerTree([chain.GroupLabel, chain.YearLabel, chain.Decade,
							 chain.ArtistLabel, chain.ArtistName])) ;
	}
    }
    
    //////////////////////////////////
    // Albums / Volume
    
    var albumparts = getparts(album) ;
    
    for (var x=0 ; x<albumparts.length; x++) {
	
	// Include entries of at least 3 characters long, which contain valid characters in the search
	var as1 = abcsearch(albumparts[x],1) ;
	var as2 = abcsearch(albumparts[x],2) ;
	var as3 = abcsearch(albumparts[x],3) ;

	if (albumparts[x].length>=3 && as1 && as2 && as3) {

	    var searchchain = {
		AlbumSearchA: { title: as1, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
		AlbumSearchAB: { title: as2, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
		AlbumSearchABC: { title: as3, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER }
	    } 

	    // GroupLabel/Album/Search/[a]/[ab]/[abc]/AlbumTitle
	    addCdsObject(objwithtrackno, addContainerTree([chain.GroupLabel, chain.AlbumLabel, chain.Search,
							   searchchain.AlbumSearchA, searchchain.AlbumSearchAB,
							   searchchain.AlbumSearchABC, chain.AlbumTitleArtist])) ;

	    // GroupLabel/Genre/TrackGenre/Album/Search/[a]/[ab]/[abc]/AlbumTitle
	    if (includegenre) {
		addCdsObject(objwithtrackno, addContainerTree([chain.GroupLabel, chain.GenreLabel, chain.TrackGenre,
							       chain.AlbumLabel, chain.Search,
							       searchchain.AlbumSearchA, searchchain.AlbumSearchAB,
							       searchchain.AlbumSearchABC, chain.AlbumTitleArtist])) ;
	    }

	}
	
    }

    // GroupLabel/Album/AllAlbums/AlbumTitleArtist
    addCdsObject(objwithtrackno, addContainerTree([chain.GroupLabel, chain.AlbumLabel,
						   chain.AllAlbumsLabel, chain.AlbumTitleArtist]))  ;
    
    // GroupLabel/Album/[abc]/AlbumTitleArtist
    addCdsObject(objwithtrackno, addContainerTree([chain.GroupLabel, chain.AlbumLabel, chain.AlbumABC, chain.AlbumTitleArtist]))  ;
    
    // GroupLabel/Genre/TrackGenre/Album/AllAlbums/AlbumTitleArtist
    if (includegenre) {
	addCdsObject(objwithtrackno, addContainerTree([chain.GroupLabel, chain.GenreLabel, chain.TrackGenre,
						       chain.AlbumLabel, chain.AllAlbumsLabel, chain.AlbumTitleArtist]))  ;
    }
    
    // GroupLabel/Genre/TrackGenre/Album/[abc]/AlbumTitleArtist
    if (includegenre) {
	addCdsObject(objwithtrackno, addContainerTree([chain.GroupLabel, chain.GenreLabel, chain.TrackGenre,
						       chain.AlbumLabel, chain.AlbumABC, chain.AlbumTitleArtist]))  ;
    }
    
    //////////////////////////////////
    // Artist / Author
    
    var artistparts = getparts(artist) ;
    
    for (var x=0 ; x<artistparts.length; x++) {
	
	// Include entries of at least 3 characters long, which contain valid characters in the search
	var as1 = abcsearch(artistparts[x],1) ;
	var as2 = abcsearch(artistparts[x],2) ;
	var as3 = abcsearch(artistparts[x],3) ;
	
	if (artistparts[x].length>=3 && as1 && as2 && as3) {
	    var searchchain = {
		ArtistSearchA: { title: as1, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
		ArtistSearchAB: { title: as2, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
		ArtistSearchABC: { title: as3, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER }
	    } 
    
	    // GroupLabel/Artist/Search/[a]/[ab]/[abc]/ArtistName/AllArtists
  	    addCdsObject(objwithalbum, addContainerTree([chain.GroupLabel, chain.ArtistLabel, chain.Search,
							 searchchain.ArtistSearchA, searchchain.ArtistSearchAB,
							 searchchain.ArtistSearchABC, chain.ArtistName, chain.AllArtistsLabel])) ;
	    
	    // GroupLabel/Artist/Search/[a]/[ab]/[abc]/ArtistName/Album/AlbumName
  	    addCdsObject(objwithtrackno, addContainerTree([chain.GroupLabel, chain.ArtistLabel, chain.Search,
							   searchchain.ArtistSearchA, searchchain.ArtistSearchAB,
							   searchchain.ArtistSearchABC, chain.ArtistName,
							   chain.AlbumLabel, chain.AlbumTitle])) ;

	    // GroupLabel/Genre/TrackGenre/Artist/Search/[a]/[ab]/[abc]/ArtistName/AllTracks
	    if (includegenre) {
		addCdsObject(objwithalbum, addContainerTree([chain.GroupLabel, chain.GenreLabel, chain.TrackGenre,
							     chain.ArtistLabel, chain.Search,
							     searchchain.ArtistSearchA, searchchain.ArtistSearchAB,
							     searchchain.ArtistSearchABC, chain.ArtistName,
							     chain.AllTrackssLabel])) ;
	    }
	    
	    // GroupLabel/Genre/TrackGenre/Artist/Search/[a]/[ab]/[abc]/ArtistName/Album/AlbumName
  	    if (includegenre) {
		addCdsObject(objwithalbum, addContainerTree([chain.GroupLabel, chain.GenreLabel, chain.TrackGenre,
							     chain.ArtistLabel, chain.Search,
							     searchchain.ArtistSearchA, searchchain.ArtistSearchAB,
							     searchchain.ArtistSearchABC, chain.ArtistName,
							     chain.AlbumLabel, chain.AlbumTitle])) ;
	    }
	    
	}

	// GroupLabel/Artist/AllArtists/ArtistName/AllTracks
	addCdsObject(objwithalbum, addContainerTree([chain.GroupLabel, chain.ArtistLabel, chain.AllArtistsLabel,
						     chain.ArtistName, chain.AllTracksLabel]))  ;
	
	// GroupLabel/Artist/AllArtists/ArtistName/Album/AlbumTitle
	addCdsObject(objwithtrackno, addContainerTree([chain.GroupLabel, chain.ArtistLabel, chain.AllArtists,
						       chain.ArtistName, chain.AlbumLabel, chain.AlbumTitle]))  ;
	
	// GroupLabel/Artist/[abc]/ArtistName/AllTracks
	addCdsObject(objwithalbum, addContainerTree([chain.GroupLabel, chain.ArtistLabel,
						     chain.ArtistABC, chain.ArtistName, chain.AllTracksLabel]))  ;

	// GroupLabel/Artist/[abc]/ArtistName/Album/AlbumTitle
	addCdsObject(objwithtrackno, addContainerTree([chain.GroupLabel, chain.ArtistLabel,
						       chain.ArtistABC, chain.ArtistName, chain.AlbumLabel, chain.AlbumTitle]))  ;

	// GroupLabel/Genre/TrackGenre/Artist/AllArtists/ArtistName/AllTracks
	if (includegenre) {
	    addCdsObject(objwithalbum, addContainerTree([chain.GroupLabel, chain.GenreLabel, chain.TrackGenre,
							 chain.ArtistLabel, chain.AllArtistsLabel, chain.ArtistName,
							 chain.AllTracksLabel]))  ;
	}
	
	// GroupLabel/Genre/TrackGenre/Artist/All/ArtistName/Album/AlbumTitle
	if (includegenre) {
	    addCdsObject(objwithtrackno, addContainerTree([chain.GroupLabel, chain.GenreLabel, chain.TrackGenre,
							   chain.ArtistLabel, chain.All, chain.ArtistName,
							   chain.AlbumLabel, chain.AlbumTitle]))  ;
	}
	
	// GroupLabel/Genre/TrackGenre/Artist/[abc]/ArtistName
	if (includegenre) {
	    addCdsObject(objwithalbum, addContainerTree([chain.GroupLabel, chain.GenreLabel, chain.TrackGenre,
							 chain.ArtistLabel, chain.ArtistABC, chain.ArtistName]))  ;
	}
	
	// GroupLabel/Genre/TrackGenre/Artist/[abc]/ArtistName/Album/AlbumTitle
	if (includegenre) {
	    addCdsObject(objwithtrackno, addContainerTree([chain.GroupLabel, chain.GenreLabel, chain.TrackGenre,
							   chain.ArtistLabel, chain.ArtistABC, chain.ArtistName,
							   chain.AlbumLabel, chain.AlbumTitle]))  ;
	}
	
    }
        
}

