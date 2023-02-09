/*GRB*
  Gerbera - https://gerbera.io/

  import-image.js - this file is part of Gerbera.

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

print ("IMPORT: import-image.js loaded") ;

// doc-add-image-begin
function addImage(obj) {
    const dir = getRootPath(object_script_path, obj.location);

    const chain = {
        imageRoot: { title: 'Photos', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER, metaData: [] },
        allImages: { title: 'All Photos', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },

        allDirectories: { title: 'Directories', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allYears: { title: 'Year', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allDates: { title: 'Date', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },

        year: { title: 'Unbekannt', objectType: OBJECT_TYPE_CONTAINER, searchable: true, upnpclass: UPNP_CLASS_CONTAINER },
        month: { title: 'Unbekannt', objectType: OBJECT_TYPE_CONTAINER, searchable: true, upnpclass: UPNP_CLASS_CONTAINER, metaData: [], res: obj.res, aux: obj.aux, refID: obj.id },
        date: { title: 'Unbekannt', objectType: OBJECT_TYPE_CONTAINER, searchable: true, upnpclass: UPNP_CLASS_CONTAINER, metaData: [], res: obj.res, aux: obj.aux, refID: obj.id }
    };
    chain.imageRoot.metaData[M_CONTENT_CLASS] = [ UPNP_CLASS_IMAGE_ITEM ];
    addCdsObject(obj, addContainerTree([chain.imageRoot, chain.allImages]));
    if (obj.metaData[M_DATE] && obj.metaData[M_DATE][0]) {
        var date = obj.metaData[M_DATE][0];
        var dateParts = date.split('-');
        if (dateParts.length > 1) {
            chain.year.title = dateParts[0];
            chain.month.title = dateParts[1];
            addCdsObject(obj, addContainerTree([chain.imageRoot, chain.allYears, chain.year, chain.month]));
        }

        dateParts = date.split('T');
        if (dateParts.length > 1) {
            date = dateParts[0];
        }
        chain.date.title = date;
        addCdsObject(obj, addContainerTree([chain.imageRoot, chain.allDates, chain.date]));
    }
    if (dir.length > 0) {
        var tree = [chain.imageRoot, chain.allDirectories];
        for (var i = 0; i < dir.length; i++) {
            tree = tree.concat([{ title: dir[i], objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER }]);
        }
        tree[tree.length-1].upnpclass = grb_container_type_image;
        tree[tree.length-1].metaData = [];
        tree[tree.length-1].res = obj.res;
        tree[tree.length-1].aux = obj.aux;
        tree[tree.length-1].refID = obj.id;
        addCdsObject(obj, addContainerTree(tree));
    }
}
// doc-add-image-end
